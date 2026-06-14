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
import { StorageFactory } from '@/lib/storage/index';
import { Client } from "@upstash/qstash";
import crypto from 'crypto';

/**
 * POST /api/apply
 * 
 * Handles organic job applications from the public job board.
 * 
 * Flow:
 * 1. Validate the job slug and file format.
 * 2. Generate a SHA-256 hash of the file to check for duplicates across the company workspace.
 * 3. [Deduplication] If a duplicate is found:
 *    - Reject if the candidate applied to the EXACT same job via the EXACT same referral link (Spam prevention).
 *    - Otherwise, clone the AI-parsed data from the existing application to save Gemini tokens and processing time.
 * 4. Upload the raw file to the company's connected cloud storage (Google Drive, OneDrive, etc.).
 * 5. Insert a placeholder row into the Supabase `applications` table (`ai_status: 'queued'`).
 * 6. Offload the heavy AI processing (parsing, embedding, etc.) to a background worker via Upstash QStash.
 * 
 * @param {Request} request - The incoming HTTP request containing the multipart/form-data.
 * @returns {NextResponse} JSON response containing the success status and application ID.
 */
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

    // ------------------------------------------------------------------------
    // 1. VALIDATION & CONFIGURATION FETCH
    // ------------------------------------------------------------------------
    // Fetch the job details and the company's storage configuration.
    // The storage_config dictates where the file actually gets uploaded (e.g., GDrive vs OneDrive).
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select(`
        id, 
        company_id, 
        created_by,
        companies:company_id (storage_provider, storage_config)
      `)
      .eq('slug', jobSlug)
      .eq('is_active', true) // Only allow applications for active jobs
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or inactive' }, { status: 404 });
    }

    // ------------------------------------------------------------------------
    // 2. FILE PREPARATION
    // ------------------------------------------------------------------------
    // Convert File to Buffer for hashing and uploading
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
    // Generate a unique fingerprint for the file using SHA-256. 
    // This allows us to recognize if a candidate applies to multiple jobs at the same company using the same resume.
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Query the database to see if this exact file hash already exists within this company's workspace.
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
      // If the candidate applied to this exact job via this exact referral link already, block them.
      const isSpam = duplicateApps.some(app => app.job_id === job.id && app.recruiter_id === (ref || null));
      if (isSpam) {
        console.warn(`[Apply] Spam blocked: Candidate already applied to this job via this recruiter.`);
        return NextResponse.json({ error: 'You have already applied for this position.' }, { status: 400 });
      }

      // Edge Case 2: The Poisoned Cache (Existing app failed to parse)
      // We only want to clone the data if the existing application successfully finished AI parsing.
      // If it failed or is still uploading, we force a fresh upload and process it again.
      if (existingApp.ai_status === 'completed') {
        console.log(`[Apply] Cloning existing AI parsed data for recruiter ${ref || 'pool'}...`);
        
        // Clone the application. This completely bypasses the Cloud Storage upload and the Gemini API call!
        // This saves API costs and returns instantly to the user.
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

    // ------------------------------------------------------------------------
    // 3. CLOUD STORAGE UPLOAD
    // ------------------------------------------------------------------------
    // Upload dynamically via the Storage Factory (BYOS - Bring Your Own Storage architecture).
    // This routes the file to the correct OAuth integration based on `companies.storage_provider`.
    console.log(`[Apply] Routing ${fileName} to ${job.companies?.storage_provider || 'unconfigured'}...`);
    const uploadResult = await StorageFactory.upload(
      job.companies?.storage_provider,
      job.companies?.storage_config || {},
      buffer,
      fileName,
      jobSlug
    );
    
    if (!uploadResult || !uploadResult.success) {
       return NextResponse.json({ error: 'Failed to safely upload resume. Please try again.' }, { status: 500 });
    }

    // [ZERO-TOUCH AUTOMATION] If the storage adapter automatically created a new folder, save the ID!
    if (uploadResult.new_folder_id && job.companies?.storage_provider) {
      const updatedConfig = { 
        ...(job.companies.storage_config || {}), 
        folderId: uploadResult.new_folder_id 
      };
      console.log(`[Apply] Saving auto-created folder ID (${uploadResult.new_folder_id}) to company config...`);
      await supabaseAdmin.from('companies')
        .update({ storage_config: updatedConfig })
        .eq('id', job.company_id);
    }

    // ------------------------------------------------------------------------
    // 4. DATABASE INSERTION
    // ------------------------------------------------------------------------
    // Create a fast, initial record in the database so the recruiter sees it immediately in the UI.
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: job.id,
        company_id: job.company_id, // Link directly to the company workspace (Multi-tenant requirement)
        recruiter_id: ref || null, // Assign to the referring Recruiter (if URL had ?ref=ID), else Company Pool
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
        ai_status: 'queued', // UI will display a loading spinner for this status
        file_hash: fileHash // Save the hash so future uploads can be cloned instead of processed!
      })
      .select()
      .single();

    if (appError) {
      console.error('[Apply] DB Insert Error:', appError);
      return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
    }

    // ------------------------------------------------------------------------
    // 5. ASYNCHRONOUS AI PROCESSING DISPATCH
    // ------------------------------------------------------------------------
    // This is the hybrid architecture. Processing a PDF with Gemini takes ~5-15 seconds.
    // If we wait, Vercel will time out the request (10s max on free tier).
    
    if (process.env.NODE_ENV !== 'production' || !process.env.QSTASH_TOKEN) {
      // DEVELOPMENT FALLBACK:
      // Since Vercel kills background tasks immediately upon returning the response, 
      // we must AWAIT this fetch if we don't have QStash configured. 
      // This means the user will wait ~5-10s while it parses instead of an instant response.
      console.log('[Apply] Running in Local Dev (or missing QStash). Awaiting fetch to process.');
      
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const localUrl = `${protocol}://${host}/api/worker/process-resume`;
      
      try {
        const res = await fetch(localUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: application.id,
            drive_file_id: uploadResult.drive_file_id || '',
            local_path: uploadResult.local_path || '',
            fileName,
            jobSlug,
            ext,
            storage_config: job.companies?.storage_config || {},
          })
        });
        if (!res.ok) console.error('[Apply] Local worker returned', res.status);
      } catch (e) {
        console.error('[Apply] Local processing failed:', e);
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: e.message }).eq('id', application.id);
      }
      
    } else {
      // PRODUCTION ENTERPRISE:
      // Push the job to Upstash QStash. QStash will reliably POST the payload to our worker API.
      // If the worker fails, QStash will automatically retry it with exponential backoff.
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
            storage_config: job.companies?.storage_config || {},
          },
        });
        console.log(`[Apply] Successfully pushed Application ${application.id} to QStash at ${baseUrl}.`);
      } catch (qErr) {
        console.error('[Apply] Failed to push to QStash:', qErr);
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: 'Failed to connect to QStash API.' }).eq('id', application.id);
      }
    }

    // ------------------------------------------------------------------------
    // 6. INSTANT RESPONSE
    // ------------------------------------------------------------------------
    // Because parsing is offloaded, we return 200 OK to the candidate instantly (<1 second).
    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Application submission error:', error);
    
    // Check if it's the specific error thrown when a company hasn't set up BYOS
    if (error.message === 'BYOS_MISSING') {
      return NextResponse.json({ 
        error: 'This company has not configured a cloud storage provider (Google Drive/OneDrive) to receive resumes yet.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
