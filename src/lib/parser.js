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
    full_name: name,
    email: emails[0] || '',
    phone: phones[0] ? phones[0].replace(/\s+/g, ' ').trim() : '',
    linkedin_url: linkedinUrls[0] || '',
    current_title: '',
    current_company: '',
    experience_years: null,
    skills: [],
    education: [],
    location: '',
    summary: '',
  };
}

/**
 * Parse resume using Google Gemini Flash API (free tier).
 */
export async function parseWithGemini(text, buffer = null, mimeType = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found, falling back to regex-only parsing');
    return null;
  }

  const prompt = `Extract the following information from this resume document. Return ONLY valid JSON, no markdown formatting, no code blocks.

{
  "full_name": "candidate's full name",
  "email": "email address",
  "phone": "phone number",
  "current_title": "current or most recent job title",
  "current_company": "current or most recent company",
  "experience_years": number or null,
  "skills": ["skill1", "skill2"],
  "education": [{"degree": "degree name", "institution": "school name", "year": "graduation year"}],
  "location": "city, state/country",
  "linkedin_url": "linkedin profile URL if present",
  "summary": "2-3 sentence professional summary"
}

IMPORTANT: Ensure the output is STRICTLY valid JSON. Do NOT include raw newline characters or unescaped quotes inside string values. Use \\n instead.

${text && text.length > 20 ? `\nExtracted Text (use this if document image is hard to read):\n${text.substring(0, 4000)}` : ''}`;

  try {
    const parts = [{ text: prompt }];

    // Attach native Multimodal payload
    if (buffer && mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: buffer.toString('base64')
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean markdown code blocks if present
    const cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini parsing error:', error);
    return null;
  }
}

/**
 * Main parse function — tries Gemini first, falls back to regex.
 */
export async function parseResume(text, buffer = null, mimeType = null) {
  // Try AI parsing first (Multimodal)
  const aiResult = await parseWithGemini(text, buffer, mimeType);

  if (aiResult) {
    return {
      ...aiResult,
      parse_method: 'gemini',
      parsed_at: new Date().toISOString(),
    };
  }

  // Fallback to regex
  const regexResult = extractWithRegex(text);
  return {
    ...regexResult,
    parse_method: 'regex',
    parsed_at: new Date().toISOString(),
  };
}
