import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Parse .env.local manually (Vite env vars aren't loaded in Node by default)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => l.split('=').map((p, i) => i === 0 ? p.trim() : l.slice(l.indexOf('=') + 1).trim()))
)

const url  = env['VITE_SUPABASE_URL']
const key  = env['VITE_SUPABASE_PUBLISHABLE_KEY']

if (!url || !key) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local')
  process.exit(1)
}

console.log('🔗  Connecting to:', url)

const supabase = createClient(url, key, { auth: { persistSession: false } })

// 1. Basic health — query players table
const { data: players, error: pErr } = await supabase.from('players').select('id').limit(1)
if (pErr) {
  console.error('❌  players table query failed:', pErr.message)
  console.log('    (Table may not exist yet — run your migrations first)')
} else {
  console.log('✅  players table accessible — rows returned:', players.length)
}

// 2. sessions table
const { error: sErr } = await supabase.from('sessions').select('id').limit(1)
if (sErr) {
  console.error('❌  sessions table query failed:', sErr.message)
} else {
  console.log('✅  sessions table accessible')
}

// 3. activity_records table
const { error: aErr } = await supabase.from('activity_records').select('id').limit(1)
if (aErr) {
  console.error('❌  activity_records table query failed:', aErr.message)
} else {
  console.log('✅  activity_records table accessible')
}

console.log('\nDone.')
