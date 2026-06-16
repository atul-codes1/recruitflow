/**
 * POST /api/agent/sync
 * 
 * ============================================================================
 * DESKTOP AGENT INGESTION LAYER
 * ============================================================================
 * 
 * This endpoint is consumed exclusively by the Electron Desktop Sync Agent.
 * It allows recruiters to mass-upload legacy resumes from their local hard drives.
 * 
 * Differences from standard `/api/apply`:
 * - Uses token-based authentication (Bearer token mapped to the recruiter's ID).
 * - Resumes are uploaded to the "General Pool" (`job_id = null`) instead of a specific job.
 * - Deduplication is scoped to the recruiter's pool to prevent accidental double-uploads.
 * 
 * @param {Request} request - The incoming HTTP request containing the multipart/form-data.
 * @returns {NextResponse} JSON response containing the success status.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StorageFactory } from '@/lib/storage/index';
import { Client } from "@upstash/qstash";
import crypto from 'crypto';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const resume = formData.get('resume');
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || formData.get('token');

    if (!resume || !token) {
      return NextResponse.json({ error: 'Missing resume or auth token' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // ------------------------------------------------------------------------
    // 1. AUTHENTICATION & CONFIGURATION FETCH
    // ------------------------------------------------------------------------
    // Authenticate the Desktop Agent using the Bearer token (which is the recruiter's UUID).
    // We also fetch the company's storage configuration to route the file to their specific cloud.
    const { data: profile, error: authError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, 
        company_id, 
        role,
        companies:company_id (storage_provider, storage_config)
      `)
      .eq('id', token)
      .single();

    if (authError || !profile) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
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
    const fileName = `resume-agent-${randomId}-${Date.now()}.${ext}`;

    // ------------------------------------------------------------------------
    // 2. GLOBAL DEDUPLICATION ENGINE
    // ------------------------------------------------------------------------
    // Generate a unique fingerprint for the file using SHA-256. 
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    const { data: duplicateApps } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('file_hash', fileHash)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });
      
    if (duplicateApps && duplicateApps.length > 0) {
      console.log(`[Agent Sync] Deduplication Triggered! Hash matched for ${fileName}`);
      
      const existingApp = duplicateApps[0];
      
      // Edge Case 1: The Accidental Double Drop
      // If the recruiter accidentally selects the same folder twice, we block the duplicate upload 
      // entirely to prevent cluttering their General Pool.
      const isSpam = duplicateApps.some(app => app.job_id === null && app.recruiter_id === profile.id);
      if (isSpam) {
        console.warn(`[Agent Sync] Duplicate blocked: Candidate already in general pool for this recruiter.`);
        return NextResponse.json({ error: 'Resume already exists in your General Pool.' }, { status: 400 });
      }

      // Edge Case 2: Cloning existing data
      // If the resume exists elsewhere in the company workspace and was successfully parsed,
      // we clone the data directly into the recruiter's general pool without calling the Gemini API.
      if (existingApp.ai_status === 'completed') {
        console.log(`[Agent Sync] Cloning existing AI parsed data for recruiter ${profile.id}...`);
        
        const { data: clonedApp, error: cloneError } = await supabaseAdmin
          .from('applications')
          .insert({
            job_id: null, // General Pool
            company_id: profile.company_id,
            recruiter_id: profile.id,
            candidate_name: existingApp.candidate_name,
            candidate_email: existingApp.candidate_email,
            candidate_phone: existingApp.candidate_phone,
            resume_filename: existingApp.resume_filename,
            drive_file_id: existingApp.drive_file_id,
            drive_web_url: existingApp.drive_web_url,
            local_path: existingApp.local_path,
            experience_level: '',
            experience_years: existingApp.experience_years,
            skills: existingApp.skills,
            // New flat searchable columns — cloned so search works immediately
            current_title:   existingApp.current_title   || '',
            current_company: existingApp.current_company || '',
            city:            existingApp.city            || '',
            state:           existingApp.state           || '',
            metro_region:    existingApp.metro_region    || '',
            degrees:         existingApp.degrees         || [],
            degree_level:    existingApp.degree_level    || '',
            seniority:       existingApp.seniority       || '',
            summary:         existingApp.summary         || '',
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
          console.error('[Agent Sync] Clone Insert Error:', cloneError);
          return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
        }
        
        // Return instantly. Crucial for mass-sync speeds.
        return NextResponse.json({ success: true, applicationId: clonedApp.id, is_duplicate: true });
      } else {
        console.log(`[Agent Sync] Existing duplicate is not 'completed'. Forcing fresh processing.`);
      }
    }

    // ------------------------------------------------------------------------
    // 3. CLOUD STORAGE UPLOAD
    // ------------------------------------------------------------------------
    // Upload dynamically via the Storage Factory (BYOS)
    console.log(`[Desktop Agent] Routing ${fileName} to ${profile.companies?.storage_provider || 'unconfigured'}...`);
    const uploadResult = await StorageFactory.upload(
      profile.companies?.storage_provider,
      profile.companies?.storage_config || {},
      buffer,
      fileName,
      'global-pool' // Folder naming convention for general pool resumes
    );
    
    if (!uploadResult || !uploadResult.success) {
       return NextResponse.json({ error: 'Failed to safely upload resume. Please try again.' }, { status: 500 });
    }

    // [ZERO-TOUCH AUTOMATION] If the storage adapter automatically created a new folder, save the ID
    if (uploadResult.new_folder_id && profile.companies?.storage_provider) {
      const updatedConfig = { 
        ...(profile.companies.storage_config || {}), 
        folderId: uploadResult.new_folder_id 
      };
      console.log(`[Desktop Agent] Saving auto-created folder ID (${uploadResult.new_folder_id}) to company config...`);
      await supabaseAdmin.from('companies')
        .update({ storage_config: updatedConfig })
        .eq('id', profile.company_id);
    }

    // ------------------------------------------------------------------------
    // 4. DATABASE INSERTION
    // ------------------------------------------------------------------------
    // Create a placeholder record in the UI while AI parses in the background
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: null, // General Pool!
        company_id: profile.company_id, 
        recruiter_id: profile.id, 
        candidate_name: 'Agent Processing...',
        candidate_email: '',
        candidate_phone: '',
        resume_filename: fileName,
        drive_file_id: uploadResult.drive_file_id || '',
        drive_web_url: uploadResult.drive_web_url || '',
        local_path: uploadResult.local_path || '',
        experience_level: '',
        experience_years: null,
        skills: [],
        parsed_data: null,
        status: 'unreviewed', 
        ai_status: 'queued',
        file_hash: fileHash
      })
      .select()
      .single();

    if (appError) {
      console.error('[Agent Sync] DB Insert Error:', appError);
      return NextResponse.json({ error: 'Failed to insert into database.' }, { status: 500 });
    }

    // ------------------------------------------------------------------------
    // 5. ASYNCHRONOUS AI PROCESSING DISPATCH
    // ------------------------------------------------------------------------
    // Because the Desktop Agent iterates over thousands of files, we MUST return 200 OK instantly.
    // We offload the Gemini API calls to the background worker via Upstash.
    if (process.env.NODE_ENV !== 'production' || !process.env.QSTASH_TOKEN) {
      console.log('[Agent Sync] Running locally using await fetch()');
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
            jobSlug: 'global-pool',
            ext,
            storage_config: profile.companies?.storage_config || {},
          })
        });
        if (!res.ok) console.error('[Agent Sync] Local worker returned', res.status);
      } catch (e) {
        console.error('[Agent Sync] Local processing failed:', e);
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: e.message }).eq('id', application.id);
      }
    } else {
      try {
        const qstash = new Client({ token: process.env.QSTASH_TOKEN });
        const protocol = 'https';
        const host = request.headers.get('host');
        let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!baseUrl || baseUrl.includes('localhost')) {
          baseUrl = host && !host.includes('localhost') ? `${protocol}://${host}` : 'https://recruitflow-nexion.vercel.app';
        }
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        
        await qstash.publishJSON({
          url: `${baseUrl}/api/worker/process-resume`,
          body: {
            applicationId: application.id,
            drive_file_id: uploadResult.drive_file_id || '',
            local_path: uploadResult.local_path || '',
            fileName,
            jobSlug: 'global-pool',
            ext,
            storage_config: profile.companies?.storage_config || {},
          },
        });
        console.log(`[Agent Sync] Queued to QStash`);
      } catch (qErr) {
        console.error('[Agent Sync] Failed to push to QStash:', qErr);
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: `QStash Error: ${qErr.message}` }).eq('id', application.id);
      }
    }

    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Agent Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
