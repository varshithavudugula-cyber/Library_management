const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn("Supabase credentials are missing. API database routes will report a configuration error.");
}

const supabase = url && key
  ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

module.exports = { supabase };
