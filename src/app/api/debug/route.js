import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data } = await supabase.from('applications').select('id, candidate_name, raw_text, parsed_data');
  return NextResponse.json(data);
}
