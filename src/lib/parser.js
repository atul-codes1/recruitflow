/**
 * ============================================================================
 * THE RESUME PARSING ENGINE (lib/parser.js)
 * ============================================================================
 * 
 * This library is responsible for extracting structured JSON data from raw resume files.
 * It uses a highly resilient, multi-tiered fallback architecture to ensure we NEVER fail
 * to parse a resume, while prioritizing free/cheap LLM APIs.
 * 
 * Architecture Strategy:
 * 1. Extract text locally using `pdf-parse` or `mammoth` (DOCX).
 * 2. If text is empty (scanned image), fallback to Google Gemini Flash Vision for OCR.
 * 3. Pass text to Groq API (Llama 3) for ultra-fast, structured JSON extraction.
 * 4. If Groq hits a rate limit, instantly multiplex to the next Llama model.
 * 5. If all Groq models fail, fallback to Gemini 1.5 Flash.
 * 6. If Gemini fails, fallback to a local Regex engine (extracting at least Email & Phone).
 * 7. Force the resulting JSON through Zod validation to guarantee schema safety before inserting into DB.
 */

import fetch from 'cross-fetch';
import { z } from 'zod';

/**
 * Zod Schema Definition
 * 
 * This acts as the absolute source of truth for the parsed JSON structure.
 * Every LLM response is passed through this schema. If the LLM hallucinates a field,
 * Zod strips it out. If the LLM forgets a field, Zod injects the default value (e.g. `null` or `[]`).
 * This guarantees our database never receives corrupted shapes.
 */
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
      social_links: z.array(z.object({ platform: z.string().nullable().default(null), url: z.string().nullable().default(null) })).default([])
    }).default({})
  }).default({}),
  professional_narrative: z.object({
    summary: z.string().nullable().default(null),
    years_of_experience_calculated: z.number().nullable().default(null),
    current_seniority_level: z.string().nullable().default(null)
  }).default({}),
  experience: z.array(z.object({
    company: z.string().nullable().default(null),
    role: z.string().nullable().default(null),
    dates: z.object({ start: z.string().nullable().default(null), end: z.string().nullable().default(null) }).default({}),
    location: z.string().nullable().default(null),
    achievements: z.array(z.object({ text: z.string().nullable().default(null), metric: z.string().nullable().default(null), context: z.string().nullable().default(null) })).default([]),
    tech_stack_or_tools: z.array(z.string()).default([]),
    industry_sector: z.string().nullable().default(null)
  })).default([]),
  education: z.array(z.object({
    institution: z.string().nullable().default(null),
    degree: z.string().nullable().default(null),
    field: z.string().nullable().default(null),
    year_graduated: z.number().nullable().default(null)
  })).default([]),
  projects: z.array(z.object({
    project_name: z.string().nullable().default(null),
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
    name: z.string().nullable().default(null),
    issuer: z.string().nullable().default(null),
    year: z.string().nullable().default(null),
    link: z.string().nullable().default(null)
  })).default([]),
  custom_sections: z.array(z.object({
    section_name: z.string().nullable().default(null),
    content: z.any()
  })).default([]),
  raw_overflow_bin: z.string().nullable().default(null)
});

// Utility for exponential backoff delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Custom fetch wrapper that implements exponential backoff for Google API 429 Rate Limits.
 * Used exclusively for Gemini OCR and Gemini Text Fallbacks.
 * 
 * @param {string} url - API Endpoint
 * @param {object} options - Fetch options (headers, body)
 * @param {number} maxRetries - Maximum retry attempts before giving up
 * @returns {Promise<Response>} 
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const waitTime = (i + 1) * 30000; // Wait 30s, 60s, 90s
      console.warn(`[Parser] Gemini Rate Limit (429) hit. Waiting in queue for ${waitTime / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
      await delay(waitTime);
      continue; // Loop continues to the next retry attempt
    }
    return response;
  }
  return fetch(url, options); // Final fallback attempt
}

/**
 * BASE LAYER FALLBACK: Regex Extraction
 * 
 * If all AI APIs are down or unconfigured, this ensures we at least extract the
 * candidate's Name, Email, and Phone number using standard local regex.
 * It returns the exact same JSON schema structure as the AI.
 * 
 * @param {string} text - The raw extracted text from the document.
 * @returns {object} A ResumeSchema-compliant JSON object.
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
/**
 * Dynamically queries the Google API to find the best available active models.
 * This prevents the app from breaking if Google deprecates an older Flash model.
 */
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
      
    // Sort so 'flash' comes first (cheaper/faster), then 'pro'
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
 * OPTICAL CHARACTER RECOGNITION (OCR) ENGINE
 * 
 * Perform pure OCR on a scanned PDF or image using Gemini Multimodal.
 * We only use this as a fallback for the 5% of documents that pdf-parse cannot read.
 * We send the raw base64 buffer directly into the vision model.
 * 
 * @param {Buffer} buffer - The raw binary file data.
 * @param {string} mimeType - e.g., 'application/pdf'
 * @returns {Promise<string>} The extracted raw text.
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
 * AI STRUCTURED DATA EXTRACTOR
 * 
 * This function takes unstructured text and uses prompt engineering to force an LLM 
 * to output a perfectly structured JSON object matching our Zod schema.
 * 
 * It employs a Model Multiplexing Strategy:
 * 1. Tries Groq (Llama 70B) first because it is incredibly fast (800 tokens/sec) and free.
 * 2. If Groq hits a rate limit, it instantly swaps to Groq Llama 8B.
 * 3. If all Groq models fail, it falls back to Gemini 1.5 Flash.
 * 
 * @param {string} text - The raw unstructured text from the resume.
 * @returns {Promise<object|null>} The parsed JSON data, verified by Zod.
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
4. ACHIEVEMENTS & RESPONSIBILITIES: You MUST extract ALL descriptions, bullet points, responsibilities, and daily tasks under a job into the 'achievements' array. Do not leave 'achievements' empty if the job has a description! If a bullet point contains a number or percentage, put it in 'metric'.
5. GLOBAL SKILL INFERENCE: Do NOT just look for a "Skills" section. You MUST deeply analyze the entire resume (the summary, job responsibilities, bullet points, education) and extract/infer every single hard skill, soft skill, tool, technology, and domain expertise mentioned.
6. OVERFLOW: Any random text, reference details, weird disclaimers, or unstructured data that absolutely does not fit into the schema MUST be dumped into 'raw_overflow_bin'.
7. DATES: Standardize dates to YYYY-MM. If only a year is provided, use YYYY-01.

Resume Text:
${text.substring(0, 15000)} // Ensure we cap at a reasonable size
`;

  // ------------------------------------------------------------------------
  // TIER 1: GROQ UNIFIED MULTIPLEXER (Lightning Fast)
  // ------------------------------------------------------------------------
  if (groqKey) {
    // We array these models in order of capability. 
    // If the 70B model hits a rate limit, the loop instantly tries the 8B model.
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

  // ------------------------------------------------------------------------
  // TIER 2: GEMINI FALLBACK
  // ------------------------------------------------------------------------
  // If Groq completely fails (e.g. servers down), we fall back to Google Gemini.
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
