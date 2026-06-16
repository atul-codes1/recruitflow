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
  return 'gemini-1.5-flash-latest';
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
    const interpreterPrompt = `You are a search query interpreter for an Indian recruitment system (like Naukri Resdex).
Extract filters from this query: "${query}"

Return ONLY valid JSON with these keys:
{
  "experience_min": number | null,
  "experience_max": number | null,
  "locations": ["string"] | null,
  "degrees": ["string"] | null,
  "must_have_skills": ["string"] | null,
  "seniority": "Fresher" | "Junior" | "Mid" | "Senior" | "Lead" | "Executive" | null,
  "job_title_hint": "string" | null
}

RULES:
- "Delhi NCR" → locations: ["Delhi NCR"] (keep metro name as-is, system will expand it)
- "Bangalore" → locations: ["Bangalore"]
- "fresher" → seniority: "Fresher", experience_min: 0, experience_max: 1
- "5+ years" → experience_min: 5
- "3-5 years" → experience_min: 3, experience_max: 5
- For degree keywords like "engineering", "postgraduate", "MBA", "MCA" → put them in degrees[]
- skills: only EXPLICIT skills, not inferred
- If not specified, return null (not empty array)`;

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
      .select('id, candidate_name, candidate_email, candidate_phone, current_title, current_company, city, metro_region, state, experience_years, skills, degrees, degree_level, seniority, summary, parsed_data, status, drive_web_url, job_id, created_at, recruiter_id, ai_status')
      .eq('ai_status', 'completed');

    // RBAC: Recruiters only see their own candidates
    if (role !== 'admin' && userId) {
      dbQuery = dbQuery.eq('recruiter_id', userId);
    }

    // Experience range filter
    if (hardFilters.experience_min !== null) {
      dbQuery = dbQuery.gte('experience_years', hardFilters.experience_min);
    }
    if (hardFilters.experience_max !== null) {
      dbQuery = dbQuery.lte('experience_years', hardFilters.experience_max);
    }

    // Seniority filter
    if (hardFilters.seniority) {
      dbQuery = dbQuery.eq('seniority', hardFilters.seniority);
    }

    // Skills filter — GIN index, all skills must be present
    if (hardFilters.must_have_skills?.length > 0) {
      // Use overlap (has any of) not containment (has all of) to avoid over-filtering
      dbQuery = dbQuery.overlaps('skills', hardFilters.must_have_skills);
    }

    // Degree filter — expands shorthand to full degree names
    if (hardFilters.degrees?.length > 0) {
      const allDegrees = hardFilters.degrees.flatMap(d => expandDegreeForSearch(d));
      const uniqueDegrees = [...new Set(allDegrees)];
      if (uniqueDegrees.length > 0) {
        dbQuery = dbQuery.overlaps('degrees', uniqueDegrees);
      }
    }

    const { data: sqlFiltered, error: sqlErr } = await dbQuery.order('created_at', { ascending: false });

    if (sqlErr) {
      console.error('[Search] SQL filter error:', sqlErr);
      return NextResponse.json({ error: 'Database query failed.' }, { status: 500 });
    }

    let applications = sqlFiltered || [];

    // Location filter — done in JS after SQL because Supabase OR across two columns is complex
    // We expand metro names to city lists and match against city OR metro_region columns
    if (hardFilters.locations?.length > 0) {
      const expandedCities = hardFilters.locations
        .flatMap(loc => expandLocationForSearch(loc))
        .map(c => c.toLowerCase());

      const metroNames = hardFilters.locations.map(l => l.toLowerCase());

      const locationFiltered = applications.filter(app => {
        const city        = (app.city || '').toLowerCase();
        const metro       = (app.metro_region || '').toLowerCase();
        const stateVal    = (app.state || '').toLowerCase();
        // Also check old parsed_data for candidates not yet re-processed
        const legacyCity  = (app.parsed_data?.candidate?.contact?.location?.city || '').toLowerCase();
        const legacyRaw   = (app.parsed_data?.candidate?.contact?.location?.raw || '').toLowerCase();

        return (
          expandedCities.some(c => city.includes(c) || legacyCity.includes(c) || legacyRaw.includes(c) || stateVal.includes(c)) ||
          metroNames.some(m => metro.includes(m))
        );
      });

      // Only apply if it doesn't wipe everyone out (safety net)
      if (locationFiltered.length > 0) {
        applications = locationFiltered;
      } else {
        console.log('[Search] Location filter returned 0 — skipping to avoid empty results');
      }
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

    const candidateContext = candidatesForAI.map(app => ({
      id:             app.id,
      name:           app.candidate_name || 'Unknown',
      current_role:   app.current_title  || app.parsed_data?.experience?.[0]?.role?.title || 'Unknown',
      current_company:app.current_company|| app.parsed_data?.experience?.[0]?.company?.name || '',
      experience_years: app.experience_years ?? null,
      seniority:      app.seniority || '',
      skills:         app.skills || [],
      location:       [app.city, app.metro_region].filter(Boolean).join(', ') ||
                      app.parsed_data?.candidate?.contact?.location?.raw || 'Unknown',
      degrees:        app.degrees || [],
      summary:        app.summary || app.parsed_data?.professional_narrative?.executive_summary || '',
    }));

    // --------------------------------------------------------------------------
    // STEP 7: GEMINI REASONING — Score & explain each candidate
    // --------------------------------------------------------------------------
    const targetModel = await getFlashModel(apiKey);
    console.log(`[Search] Step 7: Reasoning over ${candidatesForAI.length} pre-filtered candidates with ${targetModel}...`);

    const aiPrompt = `You are an expert technical recruiter and headhunter working for an Indian company.
The hiring manager has entered this search query: "${query}"

Below is a JSON array of pre-filtered candidates from our database.
These candidates already passed hard filters (experience, location, skills). Your job is to SCORE and RANK them.

Read each candidate's actual role, skills, location, and experience.
Give a score from 1 to 100. Be precise and discriminating:
- 90-100: Perfect match — role AND skills AND experience all align
- 70-89: Strong match — 2 of 3 major criteria align
- 50-69: Partial match — only 1 criteria aligns strongly
- Below 30: Weak/tangential match

Return ONLY a valid JSON array. Each object must have exactly:
- "id": (exact candidate ID from the list below)
- "score": (number 1-100)
- "reason": (1 sentence: specific skills/role that make them fit OR not fit)

Exclude scores below 20. Sort from highest to lowest score.

Candidates:
${JSON.stringify(candidateContext, null, 2)}`;

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
      console.error('[Search] Gemini reasoning failed:', await aiRes.text());
      return NextResponse.json(
        { error: 'AI reasoning step failed. Please try again.' },
        { status: 500 }
      );
    }

    const aiData   = await aiRes.json();
    const aiText   = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    let aiRankings = [];

    try {
      aiRankings = JSON.parse(aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      console.error('[Search] Failed to parse AI rankings JSON:', e);
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 500 });
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

      finalResults.push({
        id:              app.id,
        score:           ranked.score,
        reason:          ranked.reason,

        // Identity
        candidate_name:  app.candidate_name || app.parsed_data?.candidate?.name || 'Unknown',
        candidate_email: app.candidate_email || app.parsed_data?.candidate?.contact?.emails?.[0] || '',
        candidate_phone: app.candidate_phone || app.parsed_data?.candidate?.contact?.phones?.[0] || '',

        // Professional profile
        current_title:   app.current_title   || app.parsed_data?.experience?.[0]?.role?.title || '',
        current_company: app.current_company || app.parsed_data?.experience?.[0]?.company?.name || '',
        experience_years:app.experience_years ?? app.parsed_data?.professional_narrative?.total_years_experience ?? null,
        seniority:       app.seniority        || '',
        skills:          app.skills           || [],
        degrees:         app.degrees          || [],
        summary:         app.summary          || app.parsed_data?.professional_narrative?.executive_summary || '',

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
