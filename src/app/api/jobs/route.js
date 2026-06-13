import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // RLS Automatically isolates jobs if we just select *.
    // However, it is always safer to explicitly select using the session.
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json(jobs || []);
  } catch (error) {
    console.error('API /jobs GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Fetch User Profile to get `company_id`
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'No workspace found for user' }, { status: 403 });
    }

    // 3. Prepare Job Data securely tagged with company_id
    const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueId = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${uniqueId}`;

    const job = {
      slug,
      title: data.title,
      company_id: profile.company_id, // Hard-link to the Tenant Workspace
      company: data.company || '', // Company string name (optional)
      budget: data.budget || '',
      experience: data.experience || '',
      department: data.department || '',
      location: data.location || '',
      employment_type: data.employment_type || 'Full-time',
      description: data.description || '',
      is_active: true,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('jobs')
      .insert(job)
      .select()
      .single();

    if (insertError) throw insertError;
    
    return NextResponse.json(inserted);
  } catch (error) {
    console.error('API /jobs POST Error:', error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
