import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getApplicationById, updateApplication } from '@/lib/db';
import { downloadFromGoogleDrive } from '@/lib/gdrive';
import { parseResume } from '@/lib/parser';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

export async function POST(request, { params }) {
  try {
    const awaitedParams = await params;
    const appId = awaitedParams.id;
    const application = await getApplicationById(appId);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    let buffer;
    if (application.local_path) {
      // Read locally
      const fullPath = path.join(process.cwd(), application.local_path);
      if (fs.existsSync(fullPath)) {
        buffer = fs.readFileSync(fullPath);
      }
    } else if (application.drive_file_id) {
      // Download from Google Drive
      buffer = await downloadFromGoogleDrive(application.drive_file_id);
    }

    if (!buffer) {
      return NextResponse.json({ error: 'Resume file not found' }, { status: 404 });
    }

    const ext = application.resume_filename.split('.').pop() || 'pdf';
    let mimeType = 'application/pdf';
    if (ext.toLowerCase() === 'png') mimeType = 'image/png';
    if (ext.toLowerCase() === 'jpg' || ext.toLowerCase() === 'jpeg') mimeType = 'image/jpeg';

    let text = '';
    if (ext.toLowerCase() === 'pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (ext.toLowerCase() === 'docx') {
      const docxData = await mammoth.extractRawText({ buffer });
      text = docxData.value;
    }

    console.log(`[Reparse] Extracted ${text.length} characters.`);
    const parsedData = await parseResume(text, buffer, mimeType);

    if (!parsedData) {
      return NextResponse.json({ error: 'Gemini Parsing Failed Again' }, { status: 500 });
    }

    const updated = await updateApplication(application.id, {
      candidate_name: parsedData.full_name || 'Unknown Candidate',
      candidate_email: parsedData.email || '',
      candidate_phone: parsedData.phone || '',
      experience_years: parsedData.experience_years || null,
      skills: parsedData.skills || [],
      parsed_data: parsedData
    });

    revalidatePath('/dashboard/candidates');
    revalidatePath('/dashboard');

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    console.error('Reparse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
