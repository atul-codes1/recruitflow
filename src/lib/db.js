/**
 * RecruitFlow — Supabase PostgreSQL Database Layer
 */

import { supabase } from './supabase';

// ========================================
// Jobs
// ========================================

export async function getAllJobs(activeOnly = false) {
  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching jobs details:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
    return [];
  }
  return data || [];
}

export async function getJobBySlug(slug) {
  const { data, error } = await supabase.from('jobs').select('*').eq('slug', slug).single();
  if (error) {
    console.error('Error fetching job by slug:', error);
    return null;
  }
  return data;
}

export async function getJobById(id) {
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

export async function createJob(data) {
  const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const uniqueId = Math.random().toString(36).substring(2, 6);
  const slug = `${baseSlug}-${uniqueId}`;

  const job = {
    slug,
    title: data.title,
    company: data.company || '',
    budget: data.budget || '',
    experience: data.experience || '',
    department: data.department || '',
    location: data.location || '',
    employment_type: data.employment_type || 'Full-time',
    description: data.description || '',
    is_active: true,
  };

  const { data: inserted, error } = await supabase.from('jobs').insert(job).select().single();
  if (error) {
    console.error('Error creating job:', error);
    throw error;
  }
  return inserted;
}

export async function updateJob(id, updates) {
  const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single();
  if (error) {
    console.error('Error updating job:', error);
    throw error;
  }
  return data;
}

export async function deleteJob(id) {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}

// ========================================
// Applications
// ========================================

export async function getAllApplications(filters = {}) {
  let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
  
  if (filters.job_id) {
    query = query.eq('job_id', filters.job_id);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  // NOTE: Server-side search on JSONB fields is complex, we will fetch and filter in JS for now or implement full-text search later
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching applications:', error);
    return [];
  }

  let apps = data || [];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    apps = apps.filter(
      (a) =>
        (a.candidate_name || '').toLowerCase().includes(q) ||
        (a.candidate_email || '').toLowerCase().includes(q) ||
        (a.parsed_data?.full_name || '').toLowerCase().includes(q) ||
        (a.skills || []).some((s) => s.toLowerCase().includes(q))
    );
  }

  // Supabase uses created_at instead of applied_at
  // We'll map created_at to applied_at to keep frontend compatible
  return apps.map(app => ({...app, applied_at: app.created_at}));
}

export async function getApplicationById(id) {
  const { data, error } = await supabase.from('applications').select('*').eq('id', id).single();
  if (error) return null;
  return {...data, applied_at: data.created_at};
}

export async function createApplication(data) {
  // Ensure we map the API data correctly to the SQL table
  const application = {
    job_id: data.job_id,
    candidate_name: data.candidate_name || 'Unknown',
    candidate_email: data.candidate_email || '',
    candidate_phone: data.candidate_phone || '',
    experience_level: data.experience_level || '',
    experience_years: data.experience_years || null,
    skills: data.skills || null,
    resume_filename: data.resume_filename || '',
    drive_file_id: data.drive_file_id || '',
    drive_web_url: data.drive_web_url || '',
    local_path: data.local_path || '',
    parsed_data: data.parsed_data || null,
    status: data.status || 'unreviewed',
    ai_status: data.ai_status || 'completed',
    notes: data.recruiter_notes || '',
  };

  const { data: inserted, error } = await supabase.from('applications').insert(application).select().single();
  if (error) {
    console.error('Error creating application:', error);
    throw error;
  }
  return {...inserted, applied_at: inserted.created_at};
}

export async function updateApplication(id, updates) {
  // Map recruiter_notes to notes if needed
  if (updates.recruiter_notes !== undefined) {
    updates.notes = updates.recruiter_notes;
    delete updates.recruiter_notes;
  }
  const { data, error } = await supabase.from('applications').update(updates).eq('id', id).select().single();
  if (error) {
    console.error('Error updating application:', error);
    throw error;
  }
  return {...data, applied_at: data.created_at};
}

export async function deleteApplication(id) {
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) {
    console.error('Error deleting application:', error);
    throw error;
  }
}

// ========================================
// Dashboard Stats
// ========================================

export async function getDashboardStats() {
  const { data: apps, error: appsError } = await supabase.from('applications').select('status, created_at');
  const { data: jobs, error: jobsError } = await supabase.from('jobs').select('is_active');

  if (appsError || jobsError) {
    console.error('Error fetching stats');
    return {
      total: 0,
      today: 0,
      by_status: {
        shortlisted: 0,
      },
      active_jobs: 0,
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let totalApplications = 0;
  let shortlisted = 0;
  let newToday = 0;

  for (const a of (apps || [])) {
    totalApplications++;
    if (a.status === 'shortlisted' || a.status === 'hired') shortlisted++;
    const appDate = new Date(a.created_at).getTime();
    if (appDate >= startOfToday) newToday++;
  }

  const activeJobs = (jobs || []).filter(j => j.is_active).length;

  return {
    total: totalApplications,
    today: newToday,
    by_status: {
      shortlisted: shortlisted,
    },
    active_jobs: activeJobs,
  };
}
