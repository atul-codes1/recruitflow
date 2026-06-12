/**
 * Resume Parser — Extracts text from PDF/DOCX and uses AI to parse details.
 * 
 * Strategy for completely FREE parsing:
 * 1. Extract text from the resume file (pdf-parse for PDFs, mammoth for DOCX)
 * 2. Use regex to extract email & phone (100% free, very accurate)
 * 3. Use Google Gemini Flash free API for intelligent extraction (name, skills, etc.)
 * 4. Falls back to regex-only if Gemini is not configured
 */

import fetch from 'cross-fetch';
import { z } from 'zod';

const ResumeSchema = z.object({
  candidate: z.object({
    name: z.string().nullable().default(null),
    contact: z.object({
      email: z.string().nullable().default(null),
      phone: z.string().nullable().default(null),
      location: z.object({
        raw: z.string().nullable().default(null),
        parsed_city: z.string().nullable().default(null),
        country: z.string().nullable().default(null)
      }).nullable().default(null),
      social_links: z.array(z.object({ platform: z.string(), url: z.string() })).default([])
    }).default({})
  }).default({}),
  professional_narrative: z.object({
    summary: z.string().nullable().default(null),
    years_of_experience_calculated: z.number().nullable().default(null),
    current_seniority_level: z.string().nullable().default(null)
  }).default({}),
  experience: z.array(z.object({
    company: z.string().default("Unknown"),
    role: z.string().default("Unknown"),
    dates: z.object({ start: z.string().default(""), end: z.string().default("") }).default({}),
    location: z.string().nullable().default(null),
    achievements: z.array(z.object({ text: z.string(), metric: z.string().nullable().default(null), context: z.string().default("") })).default([]),
    tech_stack_or_tools: z.array(z.string()).default([]),
    industry_sector: z.string().nullable().default(null)
  })).default([]),
  education: z.array(z.object({
    institution: z.string().default("Unknown"),
    degree: z.string().default("Unknown"),
    field: z.string().default("Unknown"),
    year_graduated: z.number().nullable().default(null)
  })).default([]),
  projects: z.array(z.object({
    project_name: z.string().default("Unknown"),
    description: z.string().nullable().default(null),
    link: z.string().nullable().default(null),
    technologies_used: z.array(z.string()).default([])
  })).default([]),
  competencies: z.object({
    hard_skills: z.array(z.string()).default([]),
    soft_skills: z.array(z.string()).default([]),
    domain_expertise: z.array(z.string()).default([]),
    languages_spoken: z.array(z.string()).default([])
  }).default({}),
  certifications: z.array(z.object({
    name: z.string().default(""),
    issuer: z.string().nullable().default(null),
    year: z.string().nullable().default(null),
    link: z.string().nullable().default(null)
  })).default([]),
  custom_sections: z.array(z.object({
    section_name: z.string().default(""),
    content: z.any()
  })).default([]),
  raw_overflow_bin: z.string().nullable().default(null)
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const waitTime = (i + 1) * 30000; // Wait 30s, 60s, 90s
      console.warn(`[Parser] Gemini Rate Limit (429) hit. Waiting in queue for ${waitTime / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
      await delay(waitTime);
      continue;
    }
    return response;
  }
  return fetch(url, options); // Final fallback attempt
}

/**
 * Extract structured data from resume text using regex (always free).
 */
export function extractWithRegex(text) {
  // Email extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex) || [];

  // Phone extraction (Indian and international formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const phones = text.match(phoneRegex) || [];

  // LinkedIn URL
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/gi;
  const linkedinUrls = text.match(linkedinRegex) || [];

  // Try to extract name (usually the first line or two of a resume)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let name = '';
  for (const line of lines.slice(0, 5)) {
    // Skip lines that look like headers, emails, phones, URLs
    if (
      line.length > 3 &&
      line.length < 60 &&
      !line.includes('@') &&
      !line.match(/^\+?\d/) &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('curriculum') &&
      !line.toLowerCase().includes('http') &&
      !line.toLowerCase().includes('address')
    ) {
      name = line.replace(/[|•·,]/g, '').trim();
      break;
    }
  }

  return {
    candidate: {
      name: name,
      contact: {
        email: emails[0] || null,
        phone: phones[0] ? phones[0].replace(/\s+/g, ' ').trim() : null,
        location: null,
        social_links: linkedinUrls[0] ? [{ platform: "LinkedIn", url: linkedinUrls[0] }] : []
      }
    },
    professional_narrative: {
      summary: null,
      years_of_experience_calculated: null,
      current_seniority_level: null
    },
    experience: [],
    education: [],
    projects: [],
    competencies: {
      hard_skills: [],
      soft_skills: [],
      domain_expertise: [],
      languages_spoken: []
    },
    certifications: [],
    custom_sections: [],
    raw_overflow_bin: null
  };
}

let cachedGeminiModels = null;
async function getAvailableGeminiModels(apiKey) {
  if (cachedGeminiModels) return cachedGeminiModels;
  
  try {
    console.log('[Parser] Dynamically fetching OCR models from Google API...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) return ['gemini-flash-latest']; // Ultimate fallback
    
    const data = await response.json();
    const models = data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
      
    // Sort so 'flash' comes first, then 'pro'
    const sorted = models.sort((a, b) => {
      const aScore = a.includes('flash') ? 2 : (a.includes('pro') ? 1 : 0);
      const bScore = b.includes('flash') ? 2 : (b.includes('pro') ? 1 : 0);
      return bScore - aScore;
    });
    
    cachedGeminiModels = sorted.length > 0 ? sorted : ['gemini-flash-latest'];
    console.log(`[Parser] Found ${cachedGeminiModels.length} active models. Top picks: ${cachedGeminiModels.slice(0, 3).join(', ')}`);
    return cachedGeminiModels;
  } catch (err) {
    console.error('[Parser] Failed to dynamically fetch Gemini models:', err);
    return ['gemini-flash-latest'];
  }
}

/**
 * Perform pure OCR on a scanned PDF or image using Gemini Multimodal.
 * We only use this as a fallback for the 5% of documents that pdf-parse cannot read.
 */
export async function performOcrWithGemini(buffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  const prompt = "You are an OCR engine. Extract ALL text from this document exactly as it appears. Do not format it or summarize it. Just return the raw text.";

  const modelsToTry = await getAvailableGeminiModels(apiKey);

  const requestBody = {
    contents: [{ 
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: buffer.toString('base64') } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  };

  for (const model of modelsToTry) {
    try {
      console.log(`[OCR] Attempting OCR with model: ${model}...`);
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        console.error(`[OCR] ${model} API error:`, response.status, await response.text());
        // If 503, loop continues to the next fallback model instantly!
        if (response.status === 503) {
          console.warn(`[OCR] ${model} is overloaded (503). Instantly falling back to next model...`);
          continue;
        }
        return ''; // Other fatal errors stop the process
      }

      const data = await response.json();
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`[OCR] Success using ${model}!`);
      return extractedText;
    } catch (error) {
      console.error(`[OCR] Request failed for ${model}:`, error);
      continue;
    }
  }

  // If both models fail
  return '';
}

/**
 * Parse resume pure text using Google Gemini Flash API (free tier).
 * We pass ONLY text (not the heavy PDF buffer) to save quota and increase speed.
 */
export async function parseTextWithAi(text) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    console.log('No AI API keys found, falling back to regex-only parsing');
    return null;
  }

  const prompt = `You are a resume parsing engine. Extract ALL of the following information from this resume text. Return ONLY valid JSON matching this exact structure, no markdown formatting, no code blocks.

{
  "candidate": {
    "name": "string",
    "contact": {
      "email": "string | null",
      "phone": "string | null",
      "location": { "raw": "string", "parsed_city": "string", "country": "string" },
      "social_links": [{"platform": "string", "url": "string"}] 
    }
  },
  "professional_narrative": {
    "summary": "string | null",
    "years_of_experience_calculated": "number | null",
    "current_seniority_level": "string | null"
  },
  "experience": [
    {
      "company": "string",
      "role": "string",
      "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD | 'Present'" },
      "location": "string | null",
      "achievements": [
        { "text": "string", "metric": "string | null", "context": "string" }
      ],
      "tech_stack_or_tools": ["string"],
      "industry_sector": "string | null"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "year_graduated": "number | null"
    }
  ],
  "projects": [
    {
      "project_name": "string",
      "description": "string | null",
      "link": "string URL | null",
      "technologies_used": ["string"]
    }
  ],
  "competencies": {
    "hard_skills": ["string"],
    "soft_skills": ["string"],
    "domain_expertise": ["string"],
    "languages_spoken": ["string"]
  },
  "certifications": [
    {
      "name": "string",
      "issuer": "string | null",
      "year": "string | null",
      "link": "string URL | null"
    }
  ],
  "custom_sections": [
    {
      "section_name": "string (e.g., Volunteer Work, Patents, Publications)",
      "content": "string or object"
    }
  ],
  "raw_overflow_bin": "string | null (any unparseable text)"
}

IMPORTANT RULES:
1. STRICT JSON: Ensure the output is STRICTLY valid JSON. Do NOT include raw newline characters or unescaped quotes inside string values.
2. MISSING DATA: If a piece of information is not found in the text, you MUST return 'null' for strings/numbers and '[]' for arrays. Do NOT hallucinate or guess.
3. EXPERIENCE CALCULATION: Carefully calculate 'years_of_experience_calculated' by summing the duration of all professional roles. You MUST explicitly exclude any gaps in employment (unemployed periods) from this calculation. Do not double-count overlapping dates. If there is no experience, return 0.
4. METRICS: When parsing 'achievements', if a bullet point contains a number, percentage, or currency (e.g., "Increased sales by 20%"), extract that specific number into the 'metric' field.
5. OVERFLOW: Any random text, reference details, weird disclaimers, or unstructured data that absolutely does not fit into the schema MUST be dumped into 'raw_overflow_bin'.
6. DATES: Standardize dates to YYYY-MM. If only a year is provided, use YYYY-01.

Resume Text:
${text.substring(0, 15000)} // Ensure we cap at a reasonable size
`;

  // 1. GROQ UNIFIED MULTIPLEXER
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    
    for (const model of groqModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });
        
        if (response.status === 429) {
          console.warn(`[Parser] Groq model ${model} rate limited. Instantly failing over to next model...`);
          continue; // Instantly jumps to the next model!
        }
        
        if (!response.ok) {
           console.error(`[Parser] Groq error with ${model}:`, await response.text());
           continue;
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Anti-Hallucination Regex Extractor
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON bracket found in response");
        }
        
        const cleaned = jsonMatch[0].replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const rawJson = JSON.parse(cleaned);
        
        // Zod validation strictly enforces the schema and defaults
        return ResumeSchema.parse(rawJson);
      } catch (err) {
        console.warn(`[Parser] Groq JSON parsing failed for ${model}, trying next...`, err.message);
      }
    }
    console.warn(`[Parser] All Groq models exhausted. Falling back to Gemini...`);
  }

  // 2. GEMINI FALLBACK
  if (geminiKey) {
    try {
      const geminiModels = await getAvailableGeminiModels(geminiKey);
      const topModel = geminiModels[0];
      
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${topModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Gemini Text Parsing API error:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Anti-Hallucination Regex Extractor
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
          throw new Error("No JSON bracket found in Gemini response");
      }

      const cleaned = jsonMatch[0].replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const rawJson = JSON.parse(cleaned);
      
      // Zod validation
      return ResumeSchema.parse(rawJson);
    } catch (error) {
      console.error('Gemini parsing error:', error);
      return null;
    }
  }
  
  return null;
}
