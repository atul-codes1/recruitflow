import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runHeal() {
  console.log("🔍 Scanning Database for Corrupted Parses...");

  // 1. Find resumes with no email extracted
  const { data: missingEmails } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('ai_status', 'completed')
    .or('candidate_email.is.null,candidate_email.eq.');

  // 2. Find resumes where phone number is suspiciously long (like a LinkedIn ID)
  // Standard phone numbers are max 15 chars. If it's > 15, it might be a hallucinated ID.
  // We can't use complex regex in Supabase JS easily, so we just fetch all and filter in memory.
  const { data: allCompleted } = await supabaseAdmin
    .from('applications')
    .select('id, candidate_phone')
    .eq('ai_status', 'completed')
    .not('candidate_phone', 'is', null);

  const badPhones = allCompleted.filter(app => {
    const p = app.candidate_phone;
    // If it's longer than 15 characters, it's likely a LinkedIn URL chunk hallucination.
    return p.length > 15 || p.length < 5;
  });

  const idsToRequeue = new Set([
    ...(missingEmails || []).map(a => a.id),
    ...(badPhones || []).map(a => a.id)
  ]);

  console.log(`🚨 Found ${idsToRequeue.size} resumes that need re-parsing.`);

  if (idsToRequeue.size > 0) {
    console.log("🔄 Dropping them back into the queue...");
    const idArray = Array.from(idsToRequeue);
    
    // Batch update to avoid payload limits
    const chunkSize = 100;
    for (let i = 0; i < idArray.length; i += chunkSize) {
      const chunk = idArray.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from('applications')
        .update({ ai_status: 'queued' })
        .in('id', chunk);

      if (error) {
        console.error("Error updating chunk:", error.message);
      } else {
        console.log(`✅ Re-queued chunk of ${chunk.length} resumes.`);
      }
    }
    console.log("🎉 Database Heal Complete! The background worker will now automatically repair them.");
  } else {
    console.log("✨ Database is healthy! No bad data found.");
  }
}

// Also standardize existing phone numbers to exactly 10 digits
async function runPhoneStandardization() {
  console.log("\n📞 Standardizing all phone numbers to 10 digits...");
  
  const { data: allPhones } = await supabaseAdmin
    .from('applications')
    .select('id, candidate_phone')
    .not('candidate_phone', 'is', null)
    .neq('candidate_phone', '')
    .limit(10000);

  let updatedCount = 0;
  for (const app of allPhones || []) {
    const original = app.candidate_phone;
    const digitsOnly = original.replace(/\D/g, '');
    let normalized = digitsOnly;
    if (digitsOnly.length >= 10) {
      normalized = digitsOnly.slice(-10);
    } else {
      normalized = ''; // Reject anything less than 10 digits
    }

    if (original !== normalized) {
      await supabaseAdmin.from('applications').update({ candidate_phone: normalized }).eq('id', app.id);
      updatedCount++;
    }
  }
  console.log(`✅ Standardized ${updatedCount} phone numbers in the database!`);
}

async function runAll() {
  await runHeal();
  await runPhoneStandardization();
}

runAll();
