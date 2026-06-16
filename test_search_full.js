import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const apiKey = process.env.GEMINI_API_KEY;

async function getFlashModel(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const flashModels = (data.models || []).filter(
        m => m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent')
      );
      if (flashModels.length > 0) {
        return flashModels[0].name.replace('models/', '');
      }
    }
  } catch (e) {
    console.warn('[Search] Could not fetch Gemini model list, using fallback');
  }
  return 'gemini-2.5-flash';
}

async function run() {
  const query = 'IT Recruitment , Sourcing';
  console.log('Query:', query);

  // STEP 1: Interpreter
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

  let hardFilters = { experience_min: null, experience_max: null, locations: null, degrees: null, must_have_skills: null, seniority: null, job_title_hint: null };

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
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    hardFilters = { ...hardFilters, ...JSON.parse(cleaned) };
    console.log('Interpreted Filters:', hardFilters);
  } else {
    console.log('Interpreter Failed:', await interpRes.text());
    return;
  }

  // STEP 3: DB Query
  let dbQuery = supabaseAdmin.from('applications').select('*').eq('ai_status', 'completed');
  if (hardFilters.experience_min !== null) dbQuery = dbQuery.gte('experience_years', hardFilters.experience_min);
  if (hardFilters.experience_max !== null) dbQuery = dbQuery.lte('experience_years', hardFilters.experience_max);

  const { data: sqlFiltered, error: sqlErr } = await dbQuery.order('created_at', { ascending: false });
  if (sqlErr) {
    console.error('SQL Error:', sqlErr);
    return;
  }
  let applications = sqlFiltered || [];
  console.log(`SQL returned ${applications.length} candidates.`);

  // JS Filters
  if (hardFilters.must_have_skills?.length > 0 && applications.length > 0) {
    const required = hardFilters.must_have_skills.map(s => s.toLowerCase());
    applications = applications.filter(app => {
      const skills = (app.skills || []).map(s => s.toLowerCase());
      const legacySkills = [
        ...(app.parsed_data?.competencies?.programming_languages || []),
        ...(app.parsed_data?.competencies?.frameworks_and_libraries || []),
        ...(app.parsed_data?.competencies?.tools_and_platforms || []),
        ...(app.parsed_data?.competencies?.domain_expertise || []),
      ].map(s => s.toLowerCase());
      const allSkills = [...new Set([...skills, ...legacySkills])];
      return required.some(r => allSkills.some(s => s.includes(r)));
    });
    console.log(`After Skills Filter: ${applications.length} candidates.`);
  }

  if (applications.length === 0) {
    console.log('No candidates left after filters.');
    return;
  }

  // STEP 7: Reasoning
  const candidateContext = applications.slice(0, 50).map(app => {
    const pastJobs = (app.parsed_data?.jobs || app.parsed_data?.experience || [])
      .map(j => j.title || j.role?.title || '').filter(Boolean).slice(0, 5);
    return {
      id: app.id,
      name: app.candidate_name,
      current_role: app.current_title,
      past_job_titles: pastJobs,
      skills: app.skills,
      summary: app.summary
    };
  });

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

Return ONLY a valid JSON array. Each object must have exactly:
- "id": (exact candidate ID from the list below)
- "score": (number 1-100)
- "reason": (1 sentence: what specifically in their profile matches — mention their actual role/skill)

Exclude scores below 20. Sort from highest to lowest score.

Candidates:
${JSON.stringify(candidateContext, null, 2)}`;

  const aiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
    console.log('Reasoning Failed:', await aiRes.text());
    return;
  }
  const aiData = await aiRes.json();
  const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  console.log('AI Rankings Output:', aiText);
}
run();
