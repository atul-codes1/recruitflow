import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;

const candidateContext = [
  {
    id: 'c2e0b8fb-8153-4fbc-a1af-eaefb4c56908',
    name: 'Unknown',
    current_role: 'Unknown',
    current_company: '',
    past_job_titles: [],
    experience_years: null,
    seniority: '',
    skills: [],
    location: 'Unknown',
    degrees: [],
    summary: ''
  }
];

const query = 'IT Recruitment , Sourcing';
const hardFilters = { job_title_hint: 'recruiter' };

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

async function test() {
  const aiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: aiPrompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    }
  );

  console.log(aiRes.status);
  console.log(await aiRes.text());
}
test();
