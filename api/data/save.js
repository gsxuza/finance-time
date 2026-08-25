import { neon } from '@neondatabase/serverless'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, state } = req.body || {}
  if (!userId || typeof userId !== 'string' || userId.length > 128) {
    return res.status(400).json({ error: 'userId required' })
  }
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'state required' })
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

    await sql`
      INSERT INTO user_state (user_id, state, updated_at)
      VALUES (${userId}, ${JSON.stringify(state)}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET state = EXCLUDED.state,
            updated_at = NOW()
    `

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
