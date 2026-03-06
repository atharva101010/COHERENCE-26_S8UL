import pg from 'pg';

const DATABASE_URL = 'postgresql://postgres:JwACXJGcaOtcRLYG@db.hwoywqlmyzgraosqdhxa.supabase.co:5432/postgres';

const client = new pg.Client({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

async function migrate() {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✅ Connected!\n');

    await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;');
    console.log('✅ Phone column added!\n');

    await client.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;');
    await client.query("ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('email','sms','linkedin','whatsapp','call'));");
    console.log('✅ Messages type updated!\n');

    await client.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;');
    await client.query("ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status IN ('draft','sent','delivered','opened','bounced','failed','blocked','rate_limited'));");
    console.log('✅ Messages status updated!\n');

    try {
      await client.query('ALTER TABLE messages ALTER COLUMN execution_id DROP NOT NULL;');
      console.log('✅ execution_id nullable!\n');
    } catch(e) { console.log('execution_id already nullable\n'); }

    const phoneData = [
      { id: 224, phone: '+919876543210' },
      { id: 225, phone: '+919123456789' },
      { id: 229, phone: '+918765432100' },
      { id: 213, phone: '+917654321098' },
      { id: 206, phone: '+916543210987' },
    ];

    for (const { id, phone } of phoneData) {
      await client.query('UPDATE leads SET phone = $1, updated_at = now() WHERE id = $2', [phone, id]);
      console.log(`  ✅ Lead ${id} → ${phone}`);
    }
    console.log('\n🎉 Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}
migrate();
