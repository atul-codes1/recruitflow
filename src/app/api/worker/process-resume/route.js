/**
 * ============================================================================
 * UPSTASH QSTASH WORKER ROUTE (ASYNC RESUME PROCESSING)
 * ============================================================================
 *
 * Flow:
 * 1. User uploads resume → api/apply (or agent/sync) saves to Drive + pushes to QStash.
 * 2. QStash calls this worker in the background (no Vercel timeout pressure).
 * 3. Worker: downloads file → extracts text → OCR if needed →
 *    AI parses flat JSON → server-side post-processing → saves to DB.
 *
 * Security: Only Upstash QStash can call this endpoint.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { downloadFromGoogleDrive } from '@/lib/gdrive';
import { parseTextWithAi, performOcrWithGemini, extractWithRegex } from '@/lib/parser';
import { normalizeCity, getMetroRegion } from '@/lib/locations';
import { normalizeDegreeArray } from '@/lib/degrees';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * The main handler function executed by Upstash QStash.
 * 
 * NOTE: We do not use the standard `export async function POST(request)` syntax here
// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Parses a "YYYY-MM" date string into a JS Date object.
 * Returns null if parsing fails.
 */
function parseJobDate(dateStr) {
  if (!dateStr || dateStr.toLowerCase() === 'present') return null;
  const match = dateStr.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return null;
  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2] || '1', 10) - 1;
  const d = new Date(year, month, 1);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Calculates total professional experience in years from job entries.
 * Uses JavaScript Date arithmetic — no AI math needed.
 * Handles overlapping roles by capping end dates at the current date.
 *
 * @param {Array} jobs - Array of { start, end } date strings
 * @returns {number|null} - e.g. 3.5 years, or null if no dates found
 */
function calculateExperienceYears(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) return null;

  let totalMonths = 0;
  const now = new Date();

  for (const job of jobs) {
    if (!job.start) continue;
    const start = parseJobDate(job.start);
    if (!start || start > now) continue;

    const endRaw = job.end?.toLowerCase();
    const end = (endRaw === 'present' || !endRaw) ? now : parseJobDate(job.end);
    if (!end || end < start) continue;

    const months = (end.getFullYear() - start.getFullYear()) * 12
                 + (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  }

  if (totalMonths === 0) return null;
  // Round to 1 decimal place: 38 months → 3.2 years
  return Math.round((totalMonths / 12) * 10) / 10;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
async function handler(request) {
  let reqBody = {};
  try {
    reqBody = await request.json();
    const { applicationId, drive_file_id, fileName, ext, storage_config } = reqBody;

    console.log(`[Worker] Started processing application ${applicationId}...`);

    const supabaseAdmin = createAdminClient();

    // ------------------------------------------------------------------------
    // 1. FILE RETRIEVAL
    // ------------------------------------------------------------------------
    let buffer;
    if (drive_file_id) {
      console.log(`[Worker] Downloading ${fileName} from Google Drive...`);
      buffer = await downloadFromGoogleDrive(drive_file_id, storage_config || {});
    } else {
      console.error('[Worker] No drive_file_id provided.');
      await supabaseAdmin.from('applications')
        .update({ ai_status: 'failed', notes: 'Missing Cloud Storage Integration.' })
        .eq('id', applicationId);
      return NextResponse.json({ error: 'Missing drive_file_id' }, { status: 400 });
    }

    // ------------------------------------------------------------------------
    // 2. TEXT EXTRACTION + OCR PIPELINE
    // ------------------------------------------------------------------------
    let text = '';
    const mimeType = ext === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (ext === 'pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text || '';
    } else if (ext === 'docx') {
      const docxData = await mammoth.extractRawText({ buffer });
      text = docxData.value || '';
    }

    if (text.trim().length < 50) {
      console.log('[Worker] Scanned document detected → Gemini OCR...');
      text = await performOcrWithGemini(buffer, mimeType);
    }

    if (text.trim().length < 5) {
      console.warn('[Worker] OCR failed entirely → forcing QStash retry');
      await supabaseAdmin.from('applications')
        .update({ candidate_name: 'Retrying... (OCR Overloaded)' })
        .eq('id', applicationId);
      return NextResponse.json({ error: 'OCR Failed' }, { status: 500 });
    }

    // ------------------------------------------------------------------------
    // 3. AI STRUCTURED PARSING
    // ------------------------------------------------------------------------
    console.log(`[Worker] Running AI parsing for ${fileName}...`);
    let parsedData = await parseTextWithAi(text);
    let parseMethod;

    if (parsedData) {
      parseMethod = 'ai_flat';
    } else {
      console.warn('[Worker] AI failed → using regex fallback');
      parsedData = extractWithRegex(text);
      parseMethod = 'regex';
    }

    // ------------------------------------------------------------------------
    // 3.5 BULLETPROOF REGEX FALLBACK (Fills in blanks the AI missed)
    // ------------------------------------------------------------------------
    if (!parsedData.emails || parsedData.emails.length === 0) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      parsedData.emails = [...new Set(text.match(emailRegex) || [])];
      if (parsedData.emails.length > 0) console.log('[Worker] AI missed email; regex caught it.');
    }
    if (!parsedData.phones || parsedData.phones.length === 0) {
      // Remove URLs first so we don't accidentally match 10-digit strings inside LinkedIn links
      const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|[\w-]+\.com)[^\s]*/gi;
      const textWithoutUrls = text.replace(urlRegex, ' ');
      const phoneRegex = /(?:\+?91[-.\s]?)?(?:\+?1[-.\s]?)?(?:\(?\d{3,5}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/g;
      parsedData.phones = [...new Set((textWithoutUrls.match(phoneRegex) || []).map(p => p.trim()))].slice(0, 3);
      if (parsedData.phones.length > 0) console.log('[Worker] AI missed phone; regex caught it.');
    }

    parsedData.parse_method = parseMethod;
    parsedData.parsed_at    = new Date().toISOString();

    // ------------------------------------------------------------------------
    // 4. SERVER-SIDE POST-PROCESSING
    // ------------------------------------------------------------------------

    // 4a. Experience calculation (JavaScript date math, not AI)
    const experienceYears = calculateExperienceYears(parsedData.jobs || []);
    console.log(`[Worker] Calculated experience: ${experienceYears} years`);

    // 4b. City normalization + metro region assignment
    const rawCity       = parsedData.city || '';
    const normalizedCity = normalizeCity(rawCity);
    const metroRegion    = getMetroRegion(normalizedCity) || '';
    console.log(`[Worker] Location: "${rawCity}" → "${normalizedCity}" (${metroRegion || 'no metro'})`);

    // 4c. Degree normalization
    const rawDegrees     = parsedData.degrees || [];
    const degreeObjects  = normalizeDegreeArray(rawDegrees);
    const normalizedDegrees = degreeObjects.map(d => d.canonical);
    // Use the highest level among all degrees for the degree_level column
    const levelPriority = ['Doctorate', 'Postgraduate', 'Undergraduate', 'Diploma', 'Vocational', 'Other'];
    const degreeLevel   = degreeObjects.reduce((best, d) => {
      const bi = levelPriority.indexOf(best);
      const di = levelPriority.indexOf(d.level);
      return di < bi ? d.level : best;
    }, 'Other');

    // 4d. Skill deduplication and cleanup
    const rawSkills    = parsedData.skills || [];
    const uniqueSkills = [...new Set(rawSkills.map(s => s.trim()).filter(s => s.length > 0))];

    // 4e. Current title & company (from first job if AI didn't extract directly)
    const currentTitle   = parsedData.current_title   || parsedData.jobs?.[0]?.title   || '';
    const currentCompany = parsedData.current_company || parsedData.jobs?.[0]?.company || '';

    // ------------------------------------------------------------------------
    // 5. VECTOR EMBEDDING (768-D Semantic Search)
    // ------------------------------------------------------------------------
    const embeddingText = [
      currentTitle && `Role: ${currentTitle}`,
      experienceYears !== null && `Experience: ${experienceYears} years`,
      normalizedCity && `Location: ${normalizedCity}`,
      metroRegion && `Metro: ${metroRegion}`,
      normalizedDegrees.length && `Education: ${normalizedDegrees.join(', ')}`,
      uniqueSkills.length && `Skills: ${uniqueSkills.join(', ')}`,
      parsedData.summary && `Summary: ${parsedData.summary}`,
    ].filter(Boolean).join('. ');

    let embedding = null;
    if (embeddingText.length > 20) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          console.log(`[Worker] Generating 768-D vector embedding...`);
          const embRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'models/gemini-embedding-2',
                content: { parts: [{ text: embeddingText }] },
                outputDimensionality: 768,
              }),
            }
          );
          if (embRes.ok) {
            const embData = await embRes.json();
            embedding = embData.embedding?.values || null;
            console.log('[Worker] Embedding generated successfully.');
          }
        }
      } catch (e) {
        console.error('[Worker] Embedding error:', e.message);
      }
    }

    // ------------------------------------------------------------------------
    // 6. FINAL DATABASE COMMIT
    // ------------------------------------------------------------------------
    console.log(`[Worker] Committing to database for application ${applicationId}...`);

    function normalizeIndianPhone(phoneStr) {
      if (!phoneStr) return '';
      const digitsOnly = phoneStr.replace(/\D/g, '');
      if (digitsOnly.length >= 10) return digitsOnly.slice(-10);
      return digitsOnly;
    }

    await supabaseAdmin.from('applications').update({
      // ── Flat identity columns (already existed, now properly populated) ──
      candidate_name:  parsedData.name || 'Unknown Candidate',
      candidate_email: parsedData.emails?.[0] || '',
      candidate_phone: normalizeIndianPhone(parsedData.phones?.[0]),
      experience_years: experienceYears,

      // ── NEW flat searchable columns ──
      current_title:   currentTitle,
      current_company: currentCompany,
      city:            normalizedCity,
      state:           parsedData.state || '',
      metro_region:    metroRegion,
      degrees:         normalizedDegrees,
      degree_level:    degreeLevel,
      seniority:       parsedData.seniority || '',
      summary:         parsedData.summary || '',
      skills:          uniqueSkills,

      // ── Full parsed JSON blob (for profile detail view) ──
      parsed_data: parsedData,
      raw_text:    text,
      ai_status:   'completed',

      // ── Vector embedding (for semantic search) ──
      ...(embedding ? { embedding } : {}),
    }).eq('id', applicationId);

    console.log(`[Worker] ✅ Successfully processed application ${applicationId}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[Worker] Fatal error:', err);
    try {
      if (reqBody.applicationId) {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.from('applications')
          .update({ ai_status: 'failed', notes: err.message })
          .eq('id', reqBody.applicationId);
      }
    } catch (dbErr) {
      console.error('[Worker] Failed to update DB status:', dbErr);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = handler;
