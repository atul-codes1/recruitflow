import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Application Status Management API
 * 
 * Route: `/api/applications/manage`
 * 
 * Handles editing (PATCH) the status of an application.
 * Relies on RLS to ensure a user can only edit applications for their company.
 */
export async function PATCH(request) {
  try {
    const data = await request.json();
    const { id, status } = data;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('API /applications/manage PATCH Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
