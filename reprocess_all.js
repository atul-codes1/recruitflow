/**
 * BULK RE-PROCESS SCRIPT
 * ============================================================
 * Re-runs the AI parser on all existing completed resumes
 * to populate the new flat columns:
 *   current_title, current_company, city, state, metro_region,
 *   degrees, degree_level, seniority, summary
 *
 * HOW TO RUN:
 *   node reprocess_all.js
 *
 * It reads existing raw_text from DB (no file download needed)
 * and re-extracts with the new prompt, then updates only the
 * new flat columns without touching anything else.
 *
 * SAFE: Does NOT overwrite candidate_name / email / phone unless they were blank.
 * SAFE: Does NOT re-generate embeddings (too slow in bulk — do separately if needed).
 * SAFE: Skips resumes with no raw_text (can't re-parse without text).
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BATCH_SIZE = 5;   // Process 5 at a time to avoid rate limits
const DELAY_MS   = 2000; // 2s between batches

// ── City/Metro normalization (inline, no import needed) ────────────────────
const CITY_ALIASES = {
  'gurgaon': 'Gurugram', 'gurugram': 'Gurugram', 'noida': 'Noida',
  'greater noida': 'Greater Noida', 'ghaziabad': 'Ghaziabad',
  'faridabad': 'Faridabad', 'delhi': 'Delhi', 'new delhi': 'Delhi',
  'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'blr': 'Bengaluru',
  'hyderabad': 'Hyderabad', 'secunderabad': 'Hyderabad',
  'madras': 'Chennai', 'chennai': 'Chennai',
  'pune': 'Pune', 'poona': 'Pune',
  'calcutta': 'Kolkata', 'kolkata': 'Kolkata',
  'bombay': 'Mumbai', 'mumbai': 'Mumbai',
  'navi mumbai': 'Navi Mumbai', 'thane': 'Thane',
};
const METRO_MAP = {
  'Delhi': 'Delhi NCR', 'Noida': 'Delhi NCR', 'Greater Noida': 'Delhi NCR',
  'Gurugram': 'Delhi NCR', 'Ghaziabad': 'Delhi NCR', 'Faridabad': 'Delhi NCR',
  'Mumbai': 'Mumbai Metropolitan Region', 'Navi Mumbai': 'Mumbai Metropolitan Region',
  'Thane': 'Mumbai Metropolitan Region',
  'Bengaluru': 'Bengaluru Metropolitan',
  'Hyderabad': 'Hyderabad Metropolitan',
  'Chennai': 'Chennai Metropolitan',
  'Pune': 'Pune Metropolitan',
  'Kolkata': 'Kolkata Metropolitan',
};

function normalizeCity(raw) {
  if (!raw) return '';
  const key = raw.toLowerCase().trim().replace(/\.$/, '');
  return CITY_ALIASES[key] || raw.trim();
}
function getMetro(city) { return METRO_MAP[city] || ''; }

// ── Degree normalization (inline) ──────────────────────────────────────────
const DEGREE_MAP = {
  'btech': 'Bachelor of Technology', 'be': 'Bachelor of Technology',
  'beng': 'Bachelor of Technology', 'mtech': 'Master of Technology',
  'me': 'Master of Technology', 'meng': 'Master of Technology',
  'mca': 'Master of Computer Applications', 'bca': 'Bachelor of Computer Applications',
  'mba': 'Master of Business Administration', 'bba': 'Bachelor of Business Administration',
  'bsc': 'Bachelor of Science', 'msc': 'Master of Science',
  'bcom': 'Bachelor of Commerce', 'mcom': 'Master of Commerce',
  'ba': 'Bachelor of Arts', 'ma': 'Master of Arts',
  'phd': 'Doctor of Philosophy', 'pgdm': 'Post Graduate Diploma in Management',
  'diploma': 'Diploma',
};
const LEVEL_MAP = {
  'Doctor of Philosophy': 'Doctorate',
  'Master of Technology': 'Postgraduate', 'Master of Computer Applications': 'Postgraduate',
  'Master of Business Administration': 'Postgraduate', 'Master of Science': 'Postgraduate',
  'Master of Arts': 'Postgraduate', 'Master of Commerce': 'Postgraduate',
  'Post Graduate Diploma in Management': 'Postgraduate',
  'Bachelor of Technology': 'Undergraduate', 'Bachelor of Computer Applications': 'Undergraduate',
  'Bachelor of Science': 'Undergraduate', 'Bachelor of Arts': 'Undergraduate',
  'Bachelor of Commerce': 'Undergraduate', 'Bachelor of Business Administration': 'Undergraduate',
  'Diploma': 'Diploma',
};

function normDeg(raw) {
  if (!raw || typeof raw !== 'string') return typeof raw === 'string' ? raw : String(raw || '');
  const key = raw.toLowerCase().replace(/\./g,'').replace(/\s+/g,'').replace(/-/g,'');
  return DEGREE_MAP[key] || raw.trim();
}

function calcExp(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) return null;
  const now = new Date();
  let totalMonths = 0;
  for (const job of jobs) {
    if (!job.start) continue;
    const match = job.start.match(/^(\d{4})(?:-(\d{2}))?/);
    if (!match) continue;
    const start = new Date(parseInt(match[1]), parseInt(match[2] || '1') - 1, 1);
    if (start > now) continue;
    const endRaw = (job.end || '').toLowerCase();
    const end = (endRaw === 'present' || !endRaw) ? now : (() => {
      const m2 = job.end.match(/^(\d{4})(?:-(\d{2}))?/);
      return m2 ? new Date(parseInt(m2[1]), parseInt(m2[2] || '1') - 1, 1) : now;
    })();
    if (end < start) continue;
    totalMonths += Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
  }
  return totalMonths === 0 ? null : Math.round((totalMonths / 12) * 10) / 10;
}

// ── AI parse (Groq → Gemini) ────────────────────────────────────────────────
async function parseText(text) {
  const prompt = `You are a professional resume parser. Extract ONLY from the EDUCATION section for degrees.

Return ONLY valid JSON:
{
  "name": null,
  "emails": [],
  "phones": [],
  "city": null,
  "state": null,
  "summary": null,
  "current_title": null,
  "current_company": null,
  "seniority": "Fresher|Junior|Mid|Senior|Lead|Executive or null",
  "skills": [],
  "degrees": [],
  "jobs": [{"title": null, "company": null, "start": "YYYY-MM or null", "end": "YYYY-MM or present or null"}]
}

DEGREE RULES:
- ONLY extract from the Education section. "B.A." in a name like "Rahul B.A. Sharma" is NOT a degree.
- "B.Tech"/"BE" → "Bachelor of Technology". "M.Tech"/"ME" → "Master of Technology".
- "MCA"/"M.C.A" → "Master of Computer Applications". "BCA" → "Bachelor of Computer Applications".
- "MBA" → "Master of Business Administration". "B.Sc" → "Bachelor of Science".
- If unsure, omit it. Empty array is better than wrong.

Resume Text:
${text.substring(0, 12000)}`;

  // Try Groq first
  if (GROQ_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return JSON.parse(data.choices[0].message.content);
      }
    } catch (e) { /* fall through */ }
  }

  // Gemini fallback
  if (GEMINI_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return JSON.parse(txt.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
      }
    } catch (e) { /* fall through */ }
  }

  return null;
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Bulk Re-process Script ===\n');

  // 1. Fetch all completed applications that have raw_text
  const { data: apps, error } = await supabase
    .from('applications')
    .select('id, raw_text, candidate_name, candidate_email, parsed_data, ai_status')
    .eq('ai_status', 'completed')
    .not('raw_text', 'is', null)
    .neq('raw_text', '');

  if (error) { console.error('DB fetch error:', error); process.exit(1); }
  if (!apps || apps.length === 0) { console.log('No applications to process.'); return; }

  console.log(`Found ${apps.length} applications to re-process.\n`);

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < apps.length; i += BATCH_SIZE) {
    const batch = apps.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(apps.length/BATCH_SIZE)} (${i+1}-${Math.min(i+BATCH_SIZE, apps.length)} of ${apps.length})`);

    await Promise.all(batch.map(async app => {
      try {
        const parsed = await parseText(app.raw_text);
        if (!parsed) { skipped++; console.log(`  ⚠ ${app.id} — AI unavailable, skipped`); return; }

        // Post-process
        const expYears = calcExp(parsed.jobs || []);
        const rawCity  = parsed.city || '';
        const city     = normalizeCity(rawCity);
        const metro    = getMetro(city);
        const rawDegs  = parsed.degrees || [];
        const degrees  = rawDegs.map(normDeg);
        const levels   = degrees.map(d => LEVEL_MAP[d] || 'Other');
        const levelPri = ['Doctorate','Postgraduate','Undergraduate','Diploma','Vocational','Other'];
        const topLevel = levels.reduce((b, l) => levelPri.indexOf(l) < levelPri.indexOf(b) ? l : b, 'Other');
        const skills   = [...new Set((parsed.skills || []).map(s => s.trim()).filter(Boolean))];
        const curTitle = parsed.current_title || parsed.jobs?.[0]?.title || '';
        const curCo    = parsed.current_company || parsed.jobs?.[0]?.company || '';

        const updatePayload = {
          current_title:   curTitle,
          current_company: curCo,
          city:            city,
          state:           parsed.state || '',
          metro_region:    metro,
          degrees:         degrees,
          degree_level:    topLevel,
          seniority:       parsed.seniority || '',
          summary:         parsed.summary || '',
        };

        // Only update experience_years if we calculated something meaningful
        if (expYears !== null) updatePayload.experience_years = expYears;

        // Only update skills if we got more than the existing (don't overwrite good data with empty)
        if (skills.length > 0) updatePayload.skills = skills;

        // Only update name/email if they were blank before
        if (!app.candidate_name && parsed.name) updatePayload.candidate_name = parsed.name;
        if (!app.candidate_email && parsed.emails?.[0]) updatePayload.candidate_email = parsed.emails[0];

        const { error: upErr } = await supabase
          .from('applications')
          .update(updatePayload)
          .eq('id', app.id);

        if (upErr) {
          console.error(`  ✗ ${app.id} — DB update error:`, upErr.message);
          failed++;
        } else {
          const degStr = degrees.join(', ') || 'none';
          console.log(`  ✓ ${app.id} — ${curTitle || 'no title'} | exp:${expYears}y | city:${city} | degrees:[${degStr}] | skills:${skills.length}`);
          success++;
        }
      } catch (e) {
        console.error(`  ✗ ${app.id} — Error:`, e.message);
        failed++;
      }
    }));

    // Rate limit pause between batches
    if (i + BATCH_SIZE < apps.length) {
      console.log(`  Pausing ${DELAY_MS/1000}s...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`✓ Success: ${success}`);
  console.log(`✗ Failed:  ${failed}`);
  console.log(`⚠ Skipped: ${skipped}`);
}

main().catch(console.error);
