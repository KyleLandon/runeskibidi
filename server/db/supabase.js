// server/db/supabase.js
const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = { getSupabaseAdminClient };


