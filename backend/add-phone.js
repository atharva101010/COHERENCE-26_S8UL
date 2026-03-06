import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('Running migrations...');

  // Step 1: Check if phone column exists by trying to query it
  const { data: testData, error: testErr } = await supabase
    .from('leads')
    .select('id')
    .limit(1);

  // Step 2: Try adding phone column via a workaround - insert a lead with phone
  // First, let's try updating the messages constraint by inserting a test
  
  // For adding the column, we need to use the Supabase Dashboard SQL Editor
  // But we can work around it by using custom_fields to store phone temporarily
  
  // Let's check if phone column already exists
  const { data: colTest, error: colErr } = await supabase
    .from('leads')
    .select('phone')
    .limit(1);
  
  if (colErr) {
    console.log('❌ Phone column does NOT exist in Supabase.');
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Please run this SQL in your Supabase SQL Editor:         ║');
    console.log('║  (Go to supabase.co → Your Project → SQL Editor)          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`-- Add phone column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update messages table constraints for new types
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('email','sms','linkedin','whatsapp','call'));

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status IN ('draft','sent','delivered','opened','bounced','failed','blocked','rate_limited'));

-- Make execution_id nullable for standalone calls
ALTER TABLE messages ALTER COLUMN execution_id DROP NOT NULL;`);
    console.log('');
    console.log('After running the SQL, run this script again to add phone numbers.');
  } else {
    console.log('✅ Phone column exists! Adding phone numbers to leads...');
    
    const phoneData = [
      { id: 224, phone: '+919876543210' },
      { id: 225, phone: '+919123456789' },
      { id: 229, phone: '+918765432100' },
      { id: 213, phone: '+917654321098' },
      { id: 206, phone: '+916543210987' },
    ];
    
    for (const { id, phone } of phoneData) {
      const { error: updateErr } = await supabase
        .from('leads')
        .update({ phone, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (updateErr) {
        console.log(`  ❌ Lead ${id}: ${updateErr.message}`);
      } else {
        console.log(`  ✅ Lead ${id} → phone: ${phone}`);
      }
    }
    
    console.log('');
    console.log('Done! Now run: Invoke-WebRequest -Uri "http://localhost:3001/api/calls/auto" -Method POST -ContentType "application/json" -Body "{}" -UseBasicParsing');
  }
}

migrate().catch(console.error);
