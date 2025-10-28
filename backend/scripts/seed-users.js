require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const pwd = 'admin123';
  const password_hash = await bcrypt.hash(pwd, 10);

  const users = [
    { email: 'superadmin@sh.com', full_name: 'Super Admin', role: 'super_admin', is_active: true },
    { email: 'admin@sh.com', full_name: 'Admin User', role: 'admin', is_active: true },
    { email: 'learner@sh.com', full_name: 'Learner User', role: 'student', is_active: true },
  ];

  for (const u of users) {
    const { data, error } = await supabase
      .from('users')
      .upsert([{ ...u, email: u.email.toLowerCase(), password_hash }], { onConflict: 'email' })
      .select()
      .maybeSingle();
    if (error) {
      console.error('Error upserting user', u.email, error.message);
      process.exitCode = 1;
    } else {
      console.log('Seeded/updated:', data.email, '-', data.role);
    }
  }
}

main();
