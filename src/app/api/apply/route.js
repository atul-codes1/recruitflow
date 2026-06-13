/**
 * ============================================================================
 * INGESTION LAYER (FILE UPLOAD & QUEUE PUBLISHING)
 * ============================================================================
 * 
 * This endpoint uses the "Infinite Scale" pattern via Upstash QStash.
 * 
 * 1. Receive the file from the browser.
 * 2. Upload the raw file to Google Drive.
 * 3. Create a placeholder record in the Supabase Database (`ai_status: 'queued'`).
 * 4. Publish a message to Upstash QStash.
 * 5. Instantly return a success response to the user.
 * 
 * The heavy AI lifting is offloaded to `api/worker/process-resume`.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToGoogleDrive } from '@/lib/gdrive';
import { Client } from "@upstash/qstash";
import crypto from 'crypto';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const resume = formData.get('resume');
    const jobSlug = formData.get('job_slug');
    const experienceLevel = formData.get('experience_level') || '';
    const ref = formData.get('ref');

    if (!resume || !jobSlug) {
      return NextResponse.json({ error: 'Missing resume or job slug' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Validate Job & Fetch Recruiter ID
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, company_id, created_by')
      .eq('slug', jobSlug)
      .eq('is_active', true)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or inactive' }, { status: 404 });
    }

    // Convert File to Buffer
    const arrayBuffer = await resume.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file type
    const ext = (resume.name.split('.').pop() || 'pdf').toLowerCase();
    const allowedExts = ['pdf', 'docx'];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and DOCX files are allowed.' }, { status: 400 });
    }

    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `resume-${randomId}-${Date.now()}.${ext}`;

    // ==========================================
    // PHASE 2: GLOBAL DEDUPLICATION ENGINE
    // ==========================================
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Check if this exact file has already been uploaded to this company workspace
    const { data: duplicateApps } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('file_hash', fileHash)
      .eq('company_id', job.company_id)
      .order('created_at', { ascending: false });
      
    if (duplicateApps && duplicateApps.length > 0) {
      console.log(`[Apply] Deduplication Engine Triggered! Hash matched for ${fileName}`);
      
      const existingApp = duplicateApps[0]; // Most recent duplicate
      
      // Edge Case 1: The Spammer (Same Job, Same Recruiter)
      const isSpam = duplicateApps.some(app => app.job_id === job.id && app.recruiter_id === (ref || null));
      if (isSpam) {
        console.warn(`[Apply] Spam blocked: Candidate already applied to this job via this recruiter.`);
        return NextResponse.json({ error: 'You have already applied for this position.' }, { status: 400 });
      }

      // Edge Case 3: The Poisoned Cache (Existing app failed to parse)
      // Only clone if the AI actually finished parsing it. Otherwise, force a fresh upload!
      if (existingApp.ai_status === 'completed') {
        console.log(`[Apply] Cloning existing AI parsed data for recruiter ${ref || 'pool'}...`);
        
        // Clone the application without hitting Google Drive or Groq/Gemini!
        const { data: clonedApp, error: cloneError } = await supabaseAdmin
          .from('applications')
          .insert({
            job_id: job.id,
            company_id: job.company_id,
            recruiter_id: ref || null,
            candidate_name: existingApp.candidate_name,
            candidate_email: existingApp.candidate_email,
            candidate_phone: existingApp.candidate_phone,
            resume_filename: existingApp.resume_filename,
            drive_file_id: existingApp.drive_file_id,
            drive_web_url: existingApp.drive_web_url,
            local_path: existingApp.local_path,
            experience_level: experienceLevel,
            experience_years: existingApp.experience_years,
            skills: existingApp.skills,
            parsed_data: existingApp.parsed_data,
            raw_text: existingApp.raw_text,
            embedding: existingApp.embedding,
            status: 'unreviewed', 
            ai_status: 'completed', // Instantly completed!
            file_hash: fileHash
          })
          .select()
          .single();
          
        if (cloneError) {
          console.error('[Apply] Clone Insert Error:', cloneError);
          return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
        }
        
        // Fast-track return! Saves 15 seconds and API costs!
        return NextResponse.json({ success: true, applicationId: clonedApp.id, is_duplicate: true });
      } else {
        console.log(`[Apply] Existing duplicate is not 'completed' (${existingApp.ai_status}). Forcing fresh processing.`);
      }
    }

    // STEP 1: Upload directly to Google Drive (Synchronous)
    console.log(`[Apply] Uploading ${fileName} to Google Drive (or local fallback)...`);
    const uploadResult = await uploadToGoogleDrive(buffer, fileName, jobSlug);
    
    if (!uploadResult || !uploadResult.success) {
       return NextResponse.json({ error: 'Failed to safely upload resume. Please try again.' }, { status: 500 });
    }

    // STEP 2: Fast Database Insert (Mark as Queued)
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: job.id,
        company_id: job.company_id, // Link directly to the company workspace
        recruiter_id: ref || null, // Phase 1.10 (Option A): Assign to the referring Recruiter, else Company Pool
        candidate_name: 'Processing Resume...',
        candidate_email: '',
        candidate_phone: '',
        resume_filename: fileName,
        drive_file_id: uploadResult.drive_file_id || '',
        drive_web_url: uploadResult.drive_web_url || '',
        local_path: uploadResult.local_path || '',
        experience_level: experienceLevel,
        experience_years: null,
        skills: [],
        parsed_data: null,
        status: 'unreviewed', 
        ai_status: 'queued',
        file_hash: fileHash // Save hash for future deduplication!
      })
      .select()
      .single();

    if (appError) {
      console.error('[Apply] DB Insert Error:', appError);
      return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
    }

    // STEP 3: Enterprise Background Processing (Hybrid)
    if (process.env.NODE_ENV !== 'production' || !process.env.QSTASH_TOKEN) {
      // LOCAL DEVELOPMENT (or no QStash Token): Process synchronously in background
      // Upstash cloud cannot reach your local localhost:3000, so we use after() locally.
      console.log('[Apply] Running in Local Dev (or missing QStash). Using synchronous Next.js after() to process.');
      const { after } = require('next/server');
      after(async () => {
        try {
          const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/worker/process-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicationId: application.id,
              drive_file_id: uploadResult.drive_file_id || '',
              local_path: uploadResult.local_path || '',
              fileName,
              jobSlug,
              ext,
            })
          });
          if (!res.ok) throw new Error('Worker returned ' + res.status);
        } catch (e) {
          console.error('[Apply] Local after() processing failed:', e);
          await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: e.message }).eq('id', application.id);
        }
      });
    } else {
      // PRODUCTION ENTERPRISE: Push to Upstash Queue
      try {
        const qstash = new Client({ token: process.env.QSTASH_TOKEN });
        
        const protocol = 'https';
        const host = request.headers.get('host');
        let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!baseUrl || baseUrl.includes('localhost')) {
            baseUrl = host ? `${protocol}://${host}` : 'https://recruitflow-nexion.vercel.app';
        }
        
        let cleanBaseUrl = baseUrl;
        if (cleanBaseUrl.endsWith('/')) {
            cleanBaseUrl = cleanBaseUrl.slice(0, -1);
        }
        
        await qstash.publishJSON({
          url: `${cleanBaseUrl}/api/worker/process-resume`,
          body: {
            applicationId: application.id,
            drive_file_id: uploadResult.drive_file_id || '',
            local_path: uploadResult.local_path || '',
            fileName,
            jobSlug,
            ext,
          },
        });
        console.log(`[Apply] Successfully pushed Application ${application.id} to QStash at ${baseUrl}.`);
      } catch (qErr) {
        console.error('[Apply] Failed to push to QStash:', qErr);
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: 'Failed to connect to QStash API.' }).eq('id', application.id);
      }
    }

    // STEP 4: RESPOND TO THE USER IMMEDIATELY
    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
