import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { expandLocationForSearch } from '@/lib/locations';
import { expandDegreeForSearch } from '@/lib/degrees';

/**
 * ============================================================================
 * POST /api/search — Resdex-Style AI Search Engine
 * ============================================================================
 *
 * Architecture (Filter-First, AI-Second):
 *
 * STEP 1 — AI Query Interpreter
 *   Gemini reads the free-text query and extracts hard filters:
 *   experience range, location (with metro awareness), degree, seniority, skills.
 *
 * STEP 2 — SQL Hard Filters (Fast, <50ms on indexed columns)
 *   Queries flat indexed columns (city, metro_region, experience_years, degrees, skills, seniority).
 *   Expands "Delhi NCR" → [Delhi, Noida, Gurugram, Ghaziabad, ...]
 *   Expands "engineering" → [Bachelor of Technology, Bachelor of Engineering, ...]
 *
 * STEP 3 — Vector Re-Ranking (Semantic similarity ordering)
 *   Generates query embedding, re-ranks filtered results by cosine similarity.
 *   Only runs if vector embeddings exist in DB.
 *
 * STEP 4 — Gemini Reasoning (Human-readable explanations)
 *   Passes top 50 filtered candidates to Gemini 1.5 Flash.
 *   Gemini scores each and explains WHY they match the query.
 *   Operates on pre-filtered high-quality candidates — much more accurate.
 */

// ============================================================================
// GEMINI MODEL CACHE
// ============================================================================
let cachedFlashModel = null;

async function getFlashModel(apiKey) {
  if (cachedFlashModel) return cachedFlashModel;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const flashModels = (data.models || []).filter(
        m => m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent')
      );
      if (flashModels.length > 0) {
        cachedFlashModel = flashModels[0].name.replace('models/', '');
        return cachedFlashModel;
      }
    }
  } catch (e) {
    console.warn('[Search] Could not fetch Gemini model list, using fallback');
  }
  return 'gemini-2.5-flash';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please enter a search query (at least 3 characters).' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured for AI search.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // --------------------------------------------------------------------------
    // STEP 1: AI QUERY INTERPRETER
    // Gemini extracts hard filters with metro region & seniority awareness.
    // --------------------------------------------------------------------------
    console.log('[Search] Step 1: Interpreting query...');
    const interpreterPrompt = `You are a search query interpreter for an Indian recruitment platform (like Naukri Resdex).
Extract HARD FILTERS from this query: "${query}"

Return ONLY valid JSON:
{
  "experience_min": number | null,
  "experience_max": number | null,
  "locations": ["string"] | null,
  "degrees": ["string"] | null,
  "must_have_skills": ["string"] | null,
  "seniority": "Fresher" | "Junior" | "Mid" | "Senior" | "Lead" | "Executive" | null,
  "job_title_hint": "string" | null
}

STRICT RULES:

1. LOCATIONS: Keep metro names as-is. "Delhi NCR" → ["Delhi NCR"]. "Bangalore" → ["Bangalore"]. "near Mumbai" → ["Mumbai"]. If no location, return null.

2. EXPERIENCE: "5+ years" → experience_min: 5. "3-5 years" → min:3, max:5. "fresher" → min:0, max:1, seniority:"Fresher". "senior" → seniority:"Senior".

3. DEGREES: Only when explicitly about education. "MBA" → ["MBA"]. "engineering degree" → ["engineering"]. "postgraduate" → ["postgraduate"]. If not mentioned, null.

4. must_have_skills — CRITICAL RULE: ONLY put EXPLICIT TECHNICAL SKILLS here.
   ✅ CORRECT → put in must_have_skills: Java, Python, React, AWS, SQL, Node.js, Kubernetes, Salesforce, SAP
   ❌ WRONG → do NOT put here: recruitment, marketing, sales, finance, HR, operations, healthcare, legal, teaching, consulting, accounting
   Domain words, industries, and job functions are NOT skills. They go in job_title_hint instead.
   If the query says "experience in recruitment" → job_title_hint: "recruiter", must_have_skills: null
   If the query says "marketing background" → job_title_hint: "marketing", must_have_skills: null
   If the query says "Java developer" → must_have_skills: ["Java"], job_title_hint: "developer"

5. job_title_hint: A short phrase describing the role/domain. Used by AI reasoning, not hard filter.

6. If something is ambiguous or not clearly specified, return null — do NOT guess.

EXAMPLES:
"candidate with experience in recruitment" → {job_title_hint: "recruiter", must_have_skills: null, seniority: null}
"Java developer with 5+ years in Delhi" → {must_have_skills: ["Java"], experience_min: 5, locations: ["Delhi"], job_title_hint: "developer"}
"MBA fresher from Mumbai" → {degrees: ["MBA"], seniority: "Fresher", locations: ["Mumbai"]}
"senior React frontend engineer" → {must_have_skills: ["React"], seniority: "Senior", job_title_hint: "frontend engineer"}
"someone who knows Python and machine learning" → {must_have_skills: ["Python", "machine learning"], job_title_hint: "data scientist"}
"HR manager with 8 years" → {job_title_hint: "HR manager", experience_min: 8, must_have_skills: null}`;


    let hardFilters = {
      experience_min: null,
      experience_max: null,
      locations: null,
      degrees: null,
      must_have_skills: null,
      seniority: null,
      job_title_hint: null,
    };

    try {
      const groqKey = process.env.GROQ_API_KEY;
      let interpOk = false;

      // Try Groq first for speed and to save Gemini rate limits
      if (groqKey) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: interpreterPrompt }],
              temperature: 0.1,
              response_format: { type: 'json_object' },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.choices[0].message.content;
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            hardFilters = { ...hardFilters, ...JSON.parse(cleaned) };
            interpOk = true;
          }
        } catch (e) {
          console.warn('[Search] Groq interpreter failed, falling back to Gemini');
        }
      }

      // Fallback to Gemini
      if (!interpOk) {
        const model = await getFlashModel(apiKey);
        const interpRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: interpreterPrompt }] }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
            }),
          }
        );
        if (interpRes.ok) {
          const data = await interpRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            hardFilters = { ...hardFilters, ...JSON.parse(cleaned) };
          }
        }
      }
    } catch (e) {
      console.warn('[Search] Interpreter failed, using no filters:', e.message);
    }

    console.log('[Search] Extracted filters:', JSON.stringify(hardFilters));

    // --------------------------------------------------------------------------
    // STEP 2: RBAC — Who is searching?
    // --------------------------------------------------------------------------
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    let role = 'recruiter';
    let userId = user?.id;

    if (user) {
      const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = profile?.role || 'recruiter';
    }

    // Total candidates count for UI stats
    const { count: totalCandidatesInDb } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true });

    // --------------------------------------------------------------------------
    // STEP 3: SQL HARD FILTERS (on indexed flat columns)
    // --------------------------------------------------------------------------
    console.log('[Search] Step 3: Applying SQL filters on indexed columns...');

    let dbQuery = supabaseAdmin
      .from('applications')
      .select('*')  // Use * so we never fail on missing columns — new columns default to null
      .eq('ai_status', 'completed');

    // RBAC: Recruiters only see their own candidates
    if (role !== 'admin' && userId) {
      dbQuery = dbQuery.eq('recruiter_id', userId);
    }

    // Experience range filter (experience_years has always existed — safe)
    if (hardFilters.experience_min !== null) {
      dbQuery = dbQuery.gte('experience_years', hardFilters.experience_min);
    }
    if (hardFilters.experience_max !== null) {
      dbQuery = dbQuery.lte('experience_years', hardFilters.experience_max);
    }

    const { data: sqlFiltered, error: sqlErr } = await dbQuery.order('created_at', { ascending: false });

    if (sqlErr) {
      console.error('[Search] SQL filter error:', sqlErr);
      // Last-resort fallback: fetch everything and filter in memory
      console.warn('[Search] Trying unfiltered fallback...');
      const { data: fallbackData, error: fbErr } = await supabaseAdmin
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (fbErr) {
        return NextResponse.json({ error: 'Database query failed.' }, { status: 500 });
      }
      // Apply RBAC manually
      const fallback = role !== 'admin' && userId
        ? (fallbackData || []).filter(a => a.recruiter_id === userId)
        : (fallbackData || []);
      return NextResponse.json({ error: 'Database query failed.' }, { status: 500 });
    }

    let applications = sqlFiltered || [];

    // --------------------------------------------------------------------------
    // JS POST-FILTERS (safe — work even before migration runs)
    // These use new flat columns when available, fall back to old parsed_data
    // --------------------------------------------------------------------------

    // Seniority filter
    if (hardFilters.seniority && applications.length > 0) {
      const senFiltered = applications.filter(app => {
        const sen = app.seniority || app.parsed_data?.professional_narrative?.inferred_seniority || '';
        return sen.toLowerCase() === hardFilters.seniority.toLowerCase();
      });
      if (senFiltered.length > 0) applications = senFiltered;
    }

    // Skills filter (overlap: candidate has at least ONE of the required skills)
    if (hardFilters.must_have_skills?.length > 0 && applications.length > 0) {
      const required = hardFilters.must_have_skills.map(s => s.toLowerCase());
      const skillsFiltered = applications.filter(app => {
        const skills = (app.skills || []).map(s => s.toLowerCase());
        // Also check old parsed_data competencies
        const legacySkills = [
          ...(app.parsed_data?.competencies?.programming_languages || []),
          ...(app.parsed_data?.competencies?.frameworks_and_libraries || []),
          ...(app.parsed_data?.competencies?.tools_and_platforms || []),
          ...(app.parsed_data?.competencies?.domain_expertise || []),
        ].map(s => s.toLowerCase());
        const allSkills = [...new Set([...skills, ...legacySkills])];
        return required.some(r => allSkills.some(s => s.includes(r)));
      });
      if (skillsFiltered.length > 0) applications = skillsFiltered;
    }

    // Degree filter
    if (hardFilters.degrees?.length > 0 && applications.length > 0) {
      const allDegrees = hardFilters.degrees.flatMap(d => expandDegreeForSearch(d)).map(d => d.toLowerCase());
      const degFiltered = applications.filter(app => {
        const appDegrees = (app.degrees || []).map(d => d.toLowerCase());
        // Fallback to old parsed_data education
        const legacyDegrees = (app.parsed_data?.education || []).map(e =>
          (e.degree_type || e.degree || '').toLowerCase()
        );
        const allAppDegrees = [...new Set([...appDegrees, ...legacyDegrees])];
        return allDegrees.some(d => allAppDegrees.some(a => a.includes(d) || d.includes(a)));
      });
      if (degFiltered.length > 0) applications = degFiltered;
    }

    // Location filter — JS-based matching against flat city/metro_region + old parsed_data
    if (hardFilters.locations?.length > 0) {
      const expandedCities = hardFilters.locations
        .flatMap(loc => expandLocationForSearch(loc))
        .map(c => c.toLowerCase());

      const metroNames = hardFilters.locations.map(l => l.toLowerCase());

      const locationFiltered = applications.filter(app => {
        const city     = (app.city || '').toLowerCase();
        const metro    = (app.metro_region || '').toLowerCase();
        const stateVal = (app.state || '').toLowerCase();
        // Also check old parsed_data for candidates not yet re-processed
        const legacyCity = (app.parsed_data?.candidate?.contact?.location?.city || '').toLowerCase();
        const legacyRaw  = (app.parsed_data?.candidate?.contact?.location?.raw || '').toLowerCase();

        return (
          expandedCities.some(c => city.includes(c) || legacyCity.includes(c) || legacyRaw.includes(c) || stateVal.includes(c)) ||
          metroNames.some(m => metro.includes(m) || legacyRaw.includes(m))
        );
      });

      // Apply strictly — if location was explicitly requested, honour it
      // (Don't silently fall back to all candidates — that's what caused other-city candidates to appear)
      applications = locationFiltered;
      console.log(`[Search] Location filter → ${applications.length} candidates matching ${hardFilters.locations.join(', ')}`);
    }


    if (applications.length === 0) {
      return NextResponse.json({
        results: [],
        query,
        extracted_filters: hardFilters,
        total_candidates: totalCandidatesInDb || 0,
        matches_found: 0,
      });
    }

    // --------------------------------------------------------------------------
    // STEP 4: VECTOR RE-RANKING (optional semantic ordering)
    // --------------------------------------------------------------------------
    try {
      console.log(`[Search] Step 4: Generating query vector for re-ranking...`);
      const embRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-2',
            content: { parts: [{ text: query }] },
            outputDimensionality: 768,
          }),
        }
      );

      if (embRes.ok) {
        const embData = await embRes.json();
        const queryEmbedding = embData.embedding?.values;

        if (queryEmbedding) {
          // Re-rank filtered IDs using pgvector similarity
          const filteredIds = applications.map(a => a.id);
          const { data: ranked } = await supabaseAdmin.rpc('match_applications', {
            query_embedding: queryEmbedding,
            match_threshold: 0.01,
            match_count: 200,
          });

          if (ranked?.length > 0) {
            // Build similarity score map
            const scoreMap = {};
            ranked.forEach(r => { scoreMap[r.id] = r.similarity; });

            // Re-sort applications by vector similarity (only if candidate is in SQL filter results)
            const vectorSorted = [...applications].sort((a, b) => {
              const sa = scoreMap[a.id] ?? -1;
              const sb = scoreMap[b.id] ?? -1;
              return sb - sa;
            });
            applications = vectorSorted;
            console.log('[Search] Vector re-ranking applied.');
          }
        }
      }
    } catch (e) {
      console.warn('[Search] Vector re-ranking failed (non-fatal):', e.message);
    }

    // --------------------------------------------------------------------------
    // STEP 5: FETCH JOB NAMES
    // --------------------------------------------------------------------------
    const { data: jobs } = await supabaseAdmin.from('jobs').select('id, title, company');
    const jobMap = {};
    (jobs || []).forEach(j => { jobMap[j.id] = j; });

    // --------------------------------------------------------------------------
    // STEP 6: BUILD CONTEXT PAYLOAD FOR GEMINI REASONING
    // Send at most 50 candidates to Gemini to keep token usage sensible.
    // --------------------------------------------------------------------------
    const TOP_N = 50;
    const candidatesForAI = applications.slice(0, TOP_N);

    const candidateContext = candidatesForAI.map(app => {
      // Build past job titles list from new flat jobs array OR old parsed_data experience
      const pastJobs = (
        app.parsed_data?.jobs ||                    // new flat schema
        app.parsed_data?.experience ||              // old schema
        []
      ).map(j => j.title || j.role?.title || '').filter(Boolean).slice(0, 5);

      return {
        id:              app.id,
        name:            app.candidate_name || 'Unknown',
        current_role:    app.current_title  || app.parsed_data?.experience?.[0]?.role?.title || 'Unknown',
        current_company: app.current_company|| app.parsed_data?.experience?.[0]?.company?.name || '',
        past_job_titles: pastJobs,
        experience_years: app.experience_years ?? null,
        seniority:       app.seniority || '',
        skills:          app.skills || [],
        location:        [app.city, app.metro_region].filter(Boolean).join(', ') ||
                         app.parsed_data?.candidate?.contact?.location?.raw || 'Unknown',
        degrees:         app.degrees || [],
        summary:         app.summary || app.parsed_data?.professional_narrative?.executive_summary || '',
      };
    });

    // --------------------------------------------------------------------------
    // STEP 7: GEMINI REASONING — Score & explain each candidate
    // --------------------------------------------------------------------------
    const targetModel = await getFlashModel(apiKey);
    console.log(`[Search] Step 7: Reasoning over ${candidatesForAI.length} pre-filtered candidates with ${targetModel}...`);

    const aiPrompt = `You are an expert technical recruiter and headhunter working for an Indian company.
The hiring manager has entered this search query: "${query}"
${hardFilters.job_title_hint ? `\nThe system interpreted this as looking for: "${hardFilters.job_title_hint}"\n` : ''}
Below is a JSON array of candidates from our database. Your job is to SCORE and RANK them based on how well they match the search query.

HOW TO SCORE:
- Read the query carefully. If it says "experience in recruitment", look at their current_role, summary, and skills for words like recruiter, talent acquisition, HR, staffing, headhunting, sourcing.
- If the query mentions a domain/industry (recruitment, marketing, finance, sales, healthcare), match on their job title and summary — NOT just skill tags.
- If the query mentions specific technologies (Java, React, Python), match strictly on skills.
- Give credit for related/synonymous terms: "recruitment" = "talent acquisition" = "HR recruiter" = "staffing".

SCORING GUIDE:
- 90-100: Their current role AND summary clearly match the query
- 70-89: Their past experience or skills match the query domain
- 50-69: Partial match — adjacent field or similar domain
- Below 30: Not relevant

Return ONLY a valid JSON object with a "rankings" array. Each object in the array must have exactly:
- "id": (exact candidate ID from the list below)
- "score": (number 1-100)
- "reason": (1 sentence: what specifically in their profile matches — mention their actual role/skill)

Exclude scores below 20. Sort from highest to lowest score.

Candidates:
${JSON.stringify(candidateContext, null, 2)}`;

    const groqKey = process.env.GROQ_API_KEY;
    let aiRankings = null;

    // Try Groq First
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: aiPrompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices[0].message.content;
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          // Groq json_object might return { rankings: [...] } if forced to return object
          aiRankings = Array.isArray(parsed) ? parsed : (parsed.candidates || parsed.rankings || Object.values(parsed)[0] || []);
        }
      } catch (e) {
        console.warn('[Search] Groq reasoning failed, falling back to Gemini:', e.message);
      }
    }

    // Fallback to Gemini
    if (!aiRankings) {
      const targetModel = await getFlashModel(apiKey);
      console.log(`[Search] Step 7: Reasoning over ${candidatesForAI.length} pre-filtered candidates with ${targetModel}...`);

      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: aiPrompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        }
      );

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error('[Search] Gemini reasoning failed:', errText);
        if (aiRes.status === 429 || errText.includes('Quota exceeded') || errText.includes('RESOURCE_EXHAUSTED')) {
          return NextResponse.json(
            { error: 'AI Rate Limit Exceeded (Google Free Tier 15 requests/min). Please wait 60 seconds and try again.' },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: 'AI reasoning step failed. Please try again.' },
          { status: 500 }
        );
      }

      const aiData   = await aiRes.json();
      const aiText   = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      try {
        const parsed = JSON.parse(aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        aiRankings = Array.isArray(parsed) ? parsed : (parsed.candidates || parsed.rankings || Object.values(parsed)[0] || []);
      } catch (e) {
        console.error('[Search] Failed to parse Gemini AI rankings JSON:', e);
        return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 500 });
      }
    }

    // --------------------------------------------------------------------------
    // STEP 8: RESULT HYDRATION — Merge AI scores back with full candidate data
    // --------------------------------------------------------------------------
    const finalResults = [];
    for (const ranked of aiRankings) {
      const app = applications.find(a => a.id === ranked.id);
      if (!app) continue;

      const job = jobMap[app.job_id];
      const locationDisplay = [app.city, app.metro_region]
        .filter(Boolean)
        .join(', ') ||
        app.parsed_data?.candidate?.contact?.location?.raw ||
        app.parsed_data?.candidate?.contact?.location?.city || '';
      
      const prevExp = app.parsed_data?.experience?.[1] || app.parsed_data?.jobs?.[1] || null;

      finalResults.push({
        id:              app.id,
        score:           ranked.score,
        reason:          ranked.reason,

        // Identity
        candidate_name:  app.candidate_name || app.parsed_data?.candidate?.name || 'Unknown',
        candidate_email: app.candidate_email || app.parsed_data?.candidate?.contact?.emails?.[0] || '',
        candidate_phone: app.candidate_phone || app.parsed_data?.candidate?.contact?.phones?.[0] || '',

        // Professional profile
        current_title:    app.current_title   || app.parsed_data?.experience?.[0]?.role?.title || '',
        current_company:  app.current_company || app.parsed_data?.experience?.[0]?.company?.name || '',
        previous_title:   prevExp?.role?.title   || prevExp?.title   || '',
        previous_company: prevExp?.company?.name || prevExp?.company || '',
        experience_years: app.experience_years ?? app.parsed_data?.professional_narrative?.total_years_experience ?? null,
        seniority:        app.seniority        || '',
        skills:           app.skills           || [],
        degrees:          app.degrees          || [],
        degree_level:     app.degree_level     || '',
        summary:          app.summary          || app.parsed_data?.professional_narrative?.executive_summary || '',

        // Location (enriched)
        location:        locationDisplay,
        city:            app.city            || '',
        metro_region:    app.metro_region    || '',

        // Job context
        job_title:       job?.title          || 'Unknown Job',
        job_company:     job?.company        || '',
        status:          app.status,
        drive_web_url:   app.drive_web_url   || '',
        applied_at:      app.created_at,
      });
    }

    console.log(`[Search] ✅ Returning ${finalResults.length} results.`);

    return NextResponse.json({
      results: finalResults,
      query,
      extracted_filters: hardFilters,
      total_candidates:  totalCandidatesInDb || 0,
      matches_found:     finalResults.length,
    });

  } catch (error) {
    console.error('[Search] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Search failed: ' + error.message },
      { status: 500 }
    );
  }
}
