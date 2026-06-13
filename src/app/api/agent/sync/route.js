/**
 * ============================================================================
 * DESKTOP AGENT INGESTION LAYER
 * ============================================================================
 * 
 * Endpoint for the Desktop Sync Agent to mass-upload legacy and local resumes.
 * Resumes uploaded here are added to the "General Pool" (job_id = null)
 * instead of a specific job.
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
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || formData.get('token');

    if (!resume || !token) {
      return NextResponse.json({ error: 'Missing resume or auth token' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Authenticate the Recruiter Token
    const { data: profile, error: authError } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, role')
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

    // ==========================================
    // GLOBAL DEDUPLICATION ENGINE
    // ==========================================
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
      
      // Edge Case: The Spammer / Accidental Double Drop
      // If they already have this resume in the general pool under their name, block it.
      const isSpam = duplicateApps.some(app => app.job_id === null && app.recruiter_id === profile.id);
      if (isSpam) {
        console.warn(`[Agent Sync] Duplicate blocked: Candidate already in general pool for this recruiter.`);
        return NextResponse.json({ error: 'Resume already exists in your General Pool.' }, { status: 400 });
      }

      // Clone if previously successful
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
            parsed_data: existingApp.parsed_data,
            raw_text: existingApp.raw_text,
            embedding: existingApp.embedding,
            status: 'unreviewed', 
            ai_status: 'completed', 
            file_hash: fileHash
          })
          .select()
          .single();
          
        if (cloneError) {
          console.error('[Agent Sync] Clone Insert Error:', cloneError);
          return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
        }
        
        return NextResponse.json({ success: true, applicationId: clonedApp.id, is_duplicate: true });
      } else {
        console.log(`[Agent Sync] Existing duplicate is not 'completed'. Forcing fresh processing.`);
      }
    }

    // STEP 1: Upload directly to Google Drive
    // We use a pseudo jobSlug "global-pool" to group them nicely in Drive
    console.log(`[Agent Sync] Uploading ${fileName} to Google Drive...`);
    const uploadResult = await uploadToGoogleDrive(buffer, fileName, 'global-pool');
    
    if (!uploadResult || !uploadResult.success) {
       return NextResponse.json({ error: 'Failed to safely upload resume. Please try again.' }, { status: 500 });
    }

    // STEP 2: Fast Database Insert (Mark as Queued)
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

    // STEP 3: Enterprise Background Processing (Hybrid)
    if (process.env.NODE_ENV !== 'production' || !process.env.QSTASH_TOKEN) {
      console.log('[Agent Sync] Running locally using after()');
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
              jobSlug: 'global-pool',
              ext,
            })
          });
          if (!res.ok) throw new Error('Worker returned ' + res.status);
        } catch (e) {
          console.error('[Agent Sync] Local processing failed:', e);
          await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: e.message }).eq('id', application.id);
        }
      });
    } else {
      try {
        const qstash = new Client({ token: process.env.QSTASH_TOKEN });
        const protocol = 'https';
        const host = request.headers.get('host');
        let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'https://recruitflow-nexion.vercel.app');
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
          },
        });
        console.log(`[Agent Sync] Queued to QStash`);
      } catch (qErr) {
        console.error('[Agent Sync] Failed to push to QStash:', qErr);
        await supabaseAdmin.from('applications').update({ ai_status: 'failed', notes: 'Failed to connect to QStash API.' }).eq('id', application.id);
      }
    }

    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Agent Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
