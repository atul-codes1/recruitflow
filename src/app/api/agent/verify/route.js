import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 400 });
    }

    // 1. Authenticate the Recruiter Token
    const { data: profile, error: authError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', token)
      .single();

    if (authError || !profile) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    return NextResponse.json({ success: true, name: profile.id });

  } catch (error) {
    console.error('Verify API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
