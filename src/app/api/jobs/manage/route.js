import { NextResponse } from 'next/server';
import { updateJob, deleteJob } from '@/lib/db';

export async function PATCH(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }
    
    const updated = await updateJob(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
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
    
    await deleteJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
