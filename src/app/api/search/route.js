import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/search
 * 
 * ============================================================================
 * TRUE CONTEXT-WINDOW AI SEARCH ENGINE
 * ============================================================================
 * 
 * Traditional ATS search engines use flawed keyword math (TF-IDF) or basic SQL ILIKE.
 * This engine uses a Two-Stage AI architecture to achieve human-like candidate matching:
 * 
 * Stage 1 (Retrieval): 
 * Converts the recruiter's search query into a 768-Dimension vector using Google text-embedding-004.
 * It then queries the Supabase pgvector database via RPC (`match_applications`) to retrieve 
 * the top 200 most semantically relevant candidates.
 * 
 * Stage 2 (Reasoning):
 * It takes the retrieved candidates, strips them down to a lightweight JSON context array,
 * and drops them directly into Gemini 1.5 Flash's massive 1M token context window.
 * The AI actually reads the resumes live and returns a ranked JSON array with human-readable 
 * explanations for why they fit the search query.
 */

/**
 * Simple dynamic model fetcher to ensure we always use the latest, fastest Flash model available.
 * It queries the Gemini API for supported models and caches the result.
 * @param {string} apiKey - The Google Gemini API Key
 * @returns {string} The model string (e.g., 'gemini-1.5-flash-latest')
 */
let cachedSearchModel = null;
async function getSearchModel(apiKey) {
  if (cachedSearchModel) return cachedSearchModel;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return 'gemini-flash-latest'; // Fallback
    const data = await res.json();
    // Find the fastest model that supports text generation
    const flashModels = data.models.filter(m => m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent'));
    if (flashModels.length > 0) {
      cachedSearchModel = flashModels[0].name.replace('models/', '');
      return cachedSearchModel;
    }
  } catch (e) {
    console.error('[Search] Failed to fetch dynamic models, using fallback.');
  }
  return 'gemini-flash-latest'; // Ultimate Fallback
}

export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length < 3) {
      return NextResponse.json({ error: 'Please enter a search query (at least 3 characters).' }, { status: 400 });
    }

    // ------------------------------------------------------------------------
    // STEP 1: GENERATE VECTOR EMBEDDING FOR THE QUERY
    // ------------------------------------------------------------------------
    // To search the database semantically, we must translate the user's text query 
    // into the exact same 768-D mathematical space as the resumes.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
       return NextResponse.json({ error: 'Gemini API key not configured for AI search.' }, { status: 500 });
    }

    let queryEmbedding = null;
    try {
      console.log(`[Search] Generating Vector for query: "${query}"...`);
      const embRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2',
          content: { parts: [{ text: query }] },
          outputDimensionality: 768
        })
      });
      if (embRes.ok) {
        const embData = await embRes.json();
        queryEmbedding = embData.embedding?.values || null;
      }
    } catch(e) {
      console.warn('[Search] Failed to generate query embedding', e);
    }

    // ------------------------------------------------------------------------
    // STEP 2: FETCH CANDIDATES (Retrieval Augmented Generation - RAG)
    // ------------------------------------------------------------------------
    let applications = [];
    let isVectorSearch = false;
    let totalCandidatesInDb = 0;

    // Get total count for UI stats
    const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true });
    totalCandidatesInDb = count || 0;

    if (queryEmbedding) {
      // Stage 1: Vector Search in Supabase (Top 200)
      // Calls the pgvector RPC function. The threshold is extremely low (0.1) because 
      // we don't trust vector cosine similarity to make the final decision. We just want 
      // the top 200 vaguely relevant people, and we will let the LLM decide the actual winners.
      const { data: matchedApps, error: matchErr } = await supabase.rpc('match_applications', {
        query_embedding: queryEmbedding,
        match_threshold: 0.1, 
        match_count: 200
      });
      
      if (!matchErr && matchedApps && matchedApps.length > 0) {
        const matchedIds = matchedApps.map(m => m.id);
        const { data: appsWithRaw } = await supabase
          .from('applications')
          .select('id, candidate_name, candidate_email, candidate_phone, experience_level, experience_years, skills, parsed_data, status, resume_filename, drive_web_url, job_id, created_at, recruiter_id')
          .in('id', matchedIds);
          
        applications = appsWithRaw || [];
        isVectorSearch = true;
        console.log(`[Search] Vector search retrieved ${applications.length} closest candidates.`);
      } else {
        console.warn(`[Search] Vector search RPC failed or no matches. Fallback to full DB scan.`, matchErr);
      }
    }

    // Step 2B: Full DB Scan Fallback
    // If the pgvector extension fails or the query embedding failed to generate,
    // we pull EVERY candidate in the database and pass them all to Gemini.
    // NOTE: This will fail if the DB grows larger than the Gemini Context Window (approx ~3,000 resumes).
    if (!isVectorSearch || applications.length === 0) {
      console.log(`[Search] Falling back to standard Context-Window search without vectors...`);
      const { data: appsWithRaw, error: errWithRaw } = await supabase
        .from('applications')
        .select('id, candidate_name, candidate_email, candidate_phone, experience_level, experience_years, skills, parsed_data, status, resume_filename, drive_web_url, job_id, created_at, recruiter_id')
        .order('created_at', { ascending: false });
        
      if (errWithRaw) {
        return NextResponse.json({ error: 'Failed to fetch candidates.' }, { status: 500 });
      }
      applications = appsWithRaw || [];
    }

    // ------------------------------------------------------------------------
    // STEP 3: ENFORCE ROLE-BASED ACCESS CONTROL (RBAC)
    // ------------------------------------------------------------------------
    // Important Security Step: The `supabase` client above is a generic service role client, 
    // so it bypassed RLS. We must manually filter the candidates based on the logged-in user.
    // Option B Implementation: Recruiters can ONLY search candidates they personally sourced.
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    let role = 'recruiter';
    
    if (user) {
      const { data: profile } = await serverSupabase.from('profiles').select('role').eq('id', user.id).single();
      role = profile?.role || 'recruiter';
    }

    if (role !== 'admin') {
      console.log(`[Search] RBAC Triggered: Restricting context window to Recruiter ID: ${user?.id || 'unauth'}`);
      applications = applications.filter(app => {
        return app.recruiter_id === user?.id;
      });
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({ results: [], message: 'No candidates in the database yet.', total_candidates: totalCandidatesInDb, matches_found: 0, query });
    }

    // Step 3.5: Fetch jobs for UI mapping
    const { data: jobs } = await supabase.from('jobs').select('id, title, company');
    const jobMap = {};
    (jobs || []).forEach(j => { jobMap[j.id] = j; });

    // ------------------------------------------------------------------------
    // STEP 4: PREPARE THE CONTEXT PAYLOAD
    // ------------------------------------------------------------------------
    // Strip out all the heavy JSON, raw text, and system IDs. 
    // We only send the minimum data needed for the AI to judge the candidate to save tokens.
    const candidateContext = applications.map(app => {
      return {
        id: app.id,
        name: app.parsed_data?.candidate?.name || app.candidate_name || 'Unknown',
        current_role: app.parsed_data?.experience?.[0]?.role || app.parsed_data?.professional_narrative?.current_seniority_level || 'Unknown',
        total_experience_years: app.parsed_data?.professional_narrative?.years_of_experience_calculated ?? app.experience_years ?? 0,
        skills: app.skills || [],
        location: app.parsed_data?.candidate?.contact?.location?.raw || 'Unknown',
        summary: app.parsed_data?.professional_narrative?.summary || '',
        education: (app.parsed_data?.education || []).map(e => e.degree).join(', ')
      };
    });

    // ------------------------------------------------------------------------
    // STEP 5: EXECUTE LLM REASONING
    // ------------------------------------------------------------------------
    // We pass the context payload to Gemini and force it to output a ranked JSON array.
    // Temperature is kept at 0.1 to prevent hallucinations.
    const targetModel = await getSearchModel(apiKey);
    console.log(`[Search] Routing ${applications.length} candidates into ${targetModel} context window for query: "${query}"...`);

    const aiPrompt = `You are an expert technical recruiter and headhunter.
The hiring manager has entered this EXACT search query: "${query}"

Below is a JSON array containing all candidates in our database.
Read through their actual current roles, skills, and experience.

Your job is to identify the candidates who genuinely match the search query.
- DO NOT just do a naive keyword search (e.g. if the user wants a "React frontend engineer", DO NOT select a backend engineer who only knows Java/Spring).
- Look at their ACTUAL current_role and skills.
- Be extremely critical. If they do not fit the spirit of the query, give them a score of 0.
- If they are an exact fit (e.g. their role perfectly matches), give them a score > 80.

Return ONLY a valid JSON array of objects.
Each object must have exactly three keys:
- "id": (the exact candidate ID from the JSON below)
- "score": (number from 1 to 100 representing how well they match)
- "reason": (1-2 sentences explaining precisely why they match based on their role/skills, or why they lost points)

Exclude candidates with a score below 10.
Sort the array from highest score to lowest score.

Candidates JSON:
${JSON.stringify(candidateContext, null, 2)}
`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiPrompt }] }],
          // Force JSON output to prevent the AI from wrapping it in markdown or chatty text
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      }
    );

    if (!aiRes.ok) {
      console.error(`[Search] Gemini Context Search failed:`, await aiRes.text());
      return NextResponse.json({ error: 'AI Context Search failed due to Google API error.' }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    let aiRankings = [];
    try {
      aiRankings = JSON.parse(aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      console.error('[Search] Failed to parse AI JSON:', e, aiText);
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 500 });
    }

    // ------------------------------------------------------------------------
    // STEP 6: DATA RE-HYDRATION
    // ------------------------------------------------------------------------
    // Merge the AI rankings (which only have the ID and Score) back with the 
    // full candidate data (names, links, etc.) so the UI can display the rich profile cards.
    const finalResults = [];
    for (const ranked of aiRankings) {
      const app = applications.find(a => a.id === ranked.id);
      if (app) {
        const job = jobMap[app.job_id];
        finalResults.push({
          id: app.id,
          score: ranked.score,
          reason: ranked.reason,
          matchedKeywords: 0, // Legacy fallback mapping
          candidate_name: app.parsed_data?.candidate?.name || app.candidate_name || 'Unknown',
          candidate_email: app.parsed_data?.candidate?.contact?.email || app.candidate_email || '',
          candidate_phone: app.parsed_data?.candidate?.contact?.phone || app.candidate_phone || '',
          current_title: app.parsed_data?.experience?.[0]?.role || app.parsed_data?.professional_narrative?.current_seniority_level || '',
          current_company: app.parsed_data?.experience?.[0]?.company || '',
          experience_years: app.parsed_data?.professional_narrative?.years_of_experience_calculated ?? app.experience_years ?? null,
          skills: app.skills || [],
          location: app.parsed_data?.candidate?.contact?.location?.raw || '',
          education: app.parsed_data?.education || [],
          summary: app.parsed_data?.professional_narrative?.summary || '',
          job_title: job?.title || 'Unknown Job',
          job_company: job?.company || '',
          status: app.status,
          drive_web_url: app.drive_web_url || '',
          applied_at: app.created_at,
        });
      }
    }

    return NextResponse.json({
      results: finalResults,
      query,
      total_candidates: totalCandidatesInDb,
      matches_found: finalResults.length,
    });

  } catch (error) {
    console.error('[Search] Error:', error);
    return NextResponse.json({ error: 'Search failed: ' + error.message }, { status: 500 });
  }
}
