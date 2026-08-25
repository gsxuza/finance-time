import { neon } from '@neondatabase/serverless'

export const config = { runtime: 'nodejs', maxDuration: 10 }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let userId
  try {
    const body = await req.json()
    userId = body.userId
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  if (!userId || typeof userId !== 'string' || userId.length > 128) {
    return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    await sql`
      CREATE TABLE IF NOT EXISTS user_state (
        user_id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    const rows = await sql`SELECT state FROM user_state WHERE user_id = ${userId}`

    return new Response(JSON.stringify({ state: rows[0]?.state ?? null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
