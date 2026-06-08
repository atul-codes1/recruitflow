import { NextResponse } from 'next/server';
import { getJobBySlug } from '@/lib/db';

export async function GET(request, { params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  
  return NextResponse.json(job);
}
