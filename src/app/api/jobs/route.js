import { NextResponse } from 'next/server';
import { createJob, getAllJobs } from '@/lib/db';

export async function GET() {
  const jobs = await getAllJobs();
  return NextResponse.json(jobs);
}

export async function POST(request) {
  try {
    const data = await request.json();
    const job = await createJob({
      title: data.title,
      company: data.company,
      budget: data.budget,
      experience: data.experience,
      department: data.department,
      location: data.location,
      employment_type: data.employment_type,
      description: data.description,
    });
    
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
