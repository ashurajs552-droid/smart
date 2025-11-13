import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'

const PORT = process.env.PORT || 8787
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_, res) => res.json({ ok: true }))

// Ensure schema if SUPABASE_DB_URL provided (service connection)
app.post('/ensure-schema', async (req, res) => {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.SUPABASE_POSTGRES_URL
  if (!dbUrl) return res.status(400).json({ error: 'SUPABASE_DB_URL not set on server env' })
  const sql = `
  create table if not exists public.students (
    student_id text primary key,
    student_name text not null,
    descriptors jsonb not null
  );
  create table if not exists public.emotion_stream (
    student_id text primary key references public.students(student_id) on delete cascade,
    at timestamptz not null,
    emotion text not null,
    confidence double precision not null,
    attention double precision not null
  );
  create table if not exists public.attendance (
    id bigserial primary key,
    student_id text not null references public.students(student_id) on delete cascade,
    student_name text not null,
    at timestamptz not null default now(),
    emotion text null,
    attention double precision null
  );`
  const pg = new PgClient({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  try {
    await pg.connect()
    await pg.query(sql)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  } finally {
    await pg.end()
  }
})

// Aggregated stats (last N minutes)
app.get('/stats', async (req, res) => {
  const minutes = Number(req.query.minutes || 10)
  const since = new Date(Date.now() - minutes * 60_000).toISOString()
  const { data, error } = await supabase
    .from('emotion_stream')
    .select('emotion, attention, confidence, at')
    .gte('at', since)
  if (error) return res.status(500).json({ error: error.message })
  const total = data.length
  const avgAttention = total ? data.reduce((a, r) => a + (r.attention || 0), 0) / total : 0
  const dist = data.reduce((acc, r) => { acc[r.emotion] = (acc[r.emotion] || 0) + 1; return acc }, {})
  res.json({ total, avgAttention, emotionDist: dist })
})

// Insert attendance manually
app.post('/attendance', async (req, res) => {
  const { student_id, student_name, emotion = null, attention = null } = req.body || {}
  if (!student_id || !student_name) return res.status(400).json({ error: 'student_id and student_name required' })
  const { error } = await supabase.from('attendance').insert({
    student_id, student_name, emotion, attention, at: new Date().toISOString()
  })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`[mcp-server] listening on http://localhost:${PORT}`)
})
