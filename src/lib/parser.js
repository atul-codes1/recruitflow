/**
 * ============================================================================
 * THE RESUME PARSING ENGINE (src/lib/parser.js)
 * ============================================================================
 *
 * Extracts structured JSON from raw resume text using a simplified flat schema.
 * The schema is intentionally small (~20 fields) so LLMs fill it accurately.
 *
 * Architecture:
 * 1. Extract text locally (pdf-parse / mammoth).
 * 2. If text empty (scanned PDF) → Gemini Vision OCR.
 * 3. Pass text to Groq Llama 70B → flat JSON extraction.
 * 4. If Groq rate-limits → try Groq 8B → try Gemini Flash → Gemini Pro.
 * 5. If all AI fails → regex fallback (name, email, phone at minimum).
 * 6. Zod validates the output — guarantees schema safety before DB insert.
 *
 * NOTE: Experience years are NOT calculated here.
 * The worker (process-resume/route.js) calculates them server-side from job dates.
 */

import fetch from 'cross-fetch';
import { z } from 'zod';

// ============================================================================
// ZOD SCHEMA — Flat, simple, reliable
// ============================================================================
const ResumeSchema = z.object({
  name:             z.string().nullable().default(null),
  emails:           z.array(z.string()).default([]),
  phones:           z.array(z.string()).default([]),
  city:             z.string().nullable().default(null),
  state:            z.string().nullable().default(null),
  country:          z.string().nullable().default(null),
  summary:          z.string().nullable().default(null),
  current_title:    z.string().nullable().default(null),
  current_company:  z.string().nullable().default(null),
  seniority:        z.enum(['Fresher', 'Junior', 'Mid', 'Senior', 'Lead', 'Executive']).nullable().default(null),
  skills:           z.array(z.string()).default([]),
  degrees:          z.array(z.string()).default([]),
  institutions:     z.array(z.string()).default([]),
  jobs: z.array(z.object({
    title:       z.string().nullable().default(null),
    company:     z.string().nullable().default(null),
    start:       z.string().nullable().default(null),  // "YYYY-MM" or null
    end:         z.string().nullable().default(null),  // "YYYY-MM" or "present" or null
    description: z.string().nullable().default(null),
  })).default([]),
  certifications:    z.array(z.string()).default([]),
  languages_spoken:  z.array(z.string()).default([]),
  links: z.array(z.object({
    type: z.string().nullable().default(null),
    url:  z.string().nullable().default(null),
  })).default([]),
});

// ============================================================================
// UTILITIES
// ============================================================================
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const waitTime = (i + 1) * 15000; // 15s, 30s, 45s
      console.warn(`[Parser] Rate limit (429). Waiting ${waitTime / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
      await delay(waitTime);
      continue;
    }
    return response;
  }
  return fetch(url, options);
}

// ============================================================================
// REGEX FALLBACK — Runs when ALL AI APIs are unavailable
// Returns minimum viable data in the same schema shape.
// ============================================================================
export function extractWithRegex(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set(text.match(emailRegex) || [])];

  const phoneRegex = /(?:\+?91[-.\s]?)?(?:\+?1[-.\s]?)?(?:\(?\d{3,5}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/g;
  const phones = [...new Set((text.match(phoneRegex) || []).map(p => p.trim()))].slice(0, 3);

  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/gi;
  const githubRegex   = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+\/?/gi;
  const links = [
    ...(text.match(linkedinRegex) || []).map(url => ({ type: 'LinkedIn', url })),
    ...(text.match(githubRegex) || []).map(url => ({ type: 'GitHub', url })),
  ];

  // Name: usually first non-trivial line in the resume
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let name = null;
  for (const line of lines.slice(0, 8)) {
    if (
      line.length > 2 && line.length < 60 &&
      !line.includes('@') && !line.match(/^\+?\d/) &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('curriculum') &&
      !line.toLowerCase().includes('http') &&
      !line.toLowerCase().includes('address')
    ) {
      name = line.replace(/[|•·,\[\]]/g, '').trim();
      break;
    }
  }

  // Skills: scan for a Skills section and extract bullet items
  const skillsSection = text.match(/(?:skills?|technical skills?|core competencies?)[:\n]([\s\S]{0,800})/i);
  let skills = [];
  if (skillsSection) {
    const raw = skillsSection[1];
    skills = raw
      .split(/[,|•\n\t]+/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 40 && !/^\d+$/.test(s))
      .slice(0, 30);
  }

  return {
    name,
    emails,
    phones,
    city: null, state: null, country: null,
    summary: null,
    current_title: null, current_company: null,
    seniority: null,
    skills,
    degrees: [], institutions: [],
    jobs: [],
    certifications: [], languages_spoken: [],
    links,
  };
}

// ============================================================================
// GEMINI MODEL CACHE
// ============================================================================
let cachedGeminiModels = null;

async function getAvailableGeminiModels(apiKey) {
  if (cachedGeminiModels) return cachedGeminiModels;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) return ['gemini-2.5-flash'];
    const data = await response.json();
    const models = data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
    // Prefer flash models (cheaper/faster) over pro
    const sorted = models.sort((a, b) => {
      const score = m => m.includes('flash') ? 2 : m.includes('pro') ? 1 : 0;
      return score(b) - score(a);
    });
    cachedGeminiModels = sorted.length > 0 ? sorted : ['gemini-2.5-flash'];
    return cachedGeminiModels;
  } catch {
    return ['gemini-2.5-flash'];
  }
}

// ============================================================================
// OCR — For scanned PDFs / image resumes
// ============================================================================
export async function performOcrWithGemini(buffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  const modelsToTry = await getAvailableGeminiModels(apiKey);
  const prompt = 'You are an OCR engine. Extract ALL text from this document exactly as it appears. Return ONLY the raw text, no formatting.';

  for (const model of modelsToTry) {
    try {
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: buffer.toString('base64') } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
        }
      );
      if (!response.ok) {
        if (response.status === 503) { console.warn(`[OCR] ${model} overloaded, trying next...`); continue; }
        return '';
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      console.error(`[OCR] ${model} failed:`, err.message);
    }
  }
  return '';
}

// ============================================================================
// THE AI PROMPT — Short, clear, flat schema
// ============================================================================
function buildPrompt(text) {
  return `You are a professional resume parser. Extract information from the resume below.
Return ONLY valid JSON matching this exact structure. No markdown, no code blocks, no extra text.

{
  "name": "Full name or null",
  "emails": ["email@example.com"],
  "phones": ["+91-9876543210"],
  "city": "City name or null",
  "state": "State or null",
  "country": "Country or null",
  "summary": "1-2 sentence professional summary or null",
  "current_title": "Most recent job title or null",
  "current_company": "Most recent employer name or null",
  "seniority": "Fresher | Junior | Mid | Senior | Lead | Executive or null",
  "skills": ["every skill, tool, technology, framework, language mentioned or implied"],
  "degrees": ["Bachelor of Technology", "Master of Computer Applications"],
  "institutions": ["University Name"],
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "start": "YYYY-MM or null",
      "end": "YYYY-MM or present or null",
      "description": "Brief role summary"
    }
  ],
  "certifications": ["AWS Certified Developer"],
  "languages_spoken": ["English", "Hindi"],
  "links": [
    { "type": "LinkedIn | GitHub | Portfolio | Other", "url": "https://..." }
  ]
}

STRICT RULES — follow every rule without exception:
1. SKILLS — Put ALL skills in ONE flat array. Include: programming languages, frameworks, libraries, tools, platforms, databases, cloud services, methodologies (Agile, Scrum), soft skills, and domain expertise. If a framework implies a language (React → JavaScript), include BOTH. Do NOT categorize. Do NOT leave skills empty if the resume has ANY technical content.
2. SENIORITY — Infer from job titles and experience. "Software Engineer" with 1 year = Junior. 5 years = Mid. 8+ years = Senior. "Lead" or "Manager" = Lead. "VP", "Director", "CTO" = Executive.
3. DEGREES — CRITICAL RULES:
   a) ONLY extract degrees from the EDUCATION section of the resume. Do NOT extract from the person's name, their employer name, their skills, or any other section.
   b) "B.A." in a person's name like "Rahul B.A. Sharma" is NOT a degree. Initials are NOT degrees.
   c) Write the full formal name of the degree:
      - "B.Tech" / "BE" / "B.E." / "Bachelor of Engineering" → "Bachelor of Technology"
      - "M.Tech" / "ME" / "M.E." / "Master of Engineering" → "Master of Technology"
      - "MCA" / "M.C.A" → "Master of Computer Applications"
      - "BCA" / "B.C.A" → "Bachelor of Computer Applications"
      - "MBA" / "M.B.A" → "Master of Business Administration"
      - "BBA" → "Bachelor of Business Administration"
      - "B.Sc" / "BSc" → "Bachelor of Science"
      - "M.Sc" / "MSc" → "Master of Science"
      - "B.Com" / "BCom" → "Bachelor of Commerce"
      - "M.Com" / "MCom" → "Master of Commerce"
      - "BA" / "B.A." (explicitly in Education section as a degree, not as initials) → "Bachelor of Arts"
      - "MA" / "M.A." → "Master of Arts"
      - "PhD" / "Ph.D" → "Doctor of Philosophy"
      - "Diploma" → "Diploma"
   d) If you are NOT sure something is a degree (because it might be a person's initials or abbreviation), do NOT include it. Empty array [] is better than a wrong degree.
4. JOB DATES — Format as YYYY-MM. If only year given, use YYYY-01. Current job: end = "present". Order jobs from most recent to oldest.
5. MISSING DATA — null for strings, [] for arrays. NEVER hallucinate.
6. PHONES — Do NOT extract phone numbers from inside URLs (e.g., linkedin.com/in/john-1234567890).
7. JSON SAFETY — No raw newlines or unescaped quotes inside string values. Output must be parseable by JSON.parse().

Resume Text:
${text.substring(0, 14000)}`;
}

// ============================================================================
// MAIN AI PARSER — Groq → Gemini cascade
// ============================================================================
export async function parseTextWithAi(text) {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    console.log('[Parser] No AI keys configured. Using regex fallback.');
    return null;
  }

  const prompt = buildPrompt(text);

  // ── TIER 1: GROQ (ultra-fast, free) ──────────────────────────────────────
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of groqModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          }),
        });

        if (response.status === 429) {
          console.warn(`[Parser] Groq ${model} rate limited → next model`);
          continue;
        }
        if (!response.ok) {
          console.error(`[Parser] Groq ${model} error:`, response.status);
          continue;
        }

        const data    = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const rawJson = JSON.parse(content);
        console.log(`[Parser] Groq ${model} succeeded.`);
        return ResumeSchema.parse(rawJson);

      } catch (err) {
        console.warn(`[Parser] Groq ${model} failed:`, err.message);
      }
    }
    console.warn('[Parser] All Groq models exhausted → regex fallback');
  }

  return null; // Caller will use extractWithRegex
}
