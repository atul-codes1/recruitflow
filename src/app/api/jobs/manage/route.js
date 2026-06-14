import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Job Postings Management API
 * 
 * Route: `/api/jobs/manage`
 * 
 * Handles editing (PATCH) and deleting (DELETE) existing jobs.
 * Enforces RBAC (Role-Based Access Control) to ensure only 'admin' 
 * users can modify job postings.
 */
export async function PATCH(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Only admins can edit jobs.' }, { status: 403 });

    const { data: updated, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (error) {
    console.error('API /jobs/manage PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Only admins can delete jobs.' }, { status: 403 });

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API /jobs/manage DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
