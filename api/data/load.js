import { neon } from '@neondatabase/serverless'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = req.body?.userId
  if (!userId || typeof userId !== 'string' || userId.length > 128) {
    return res.status(400).json({ error: 'userId required' })
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

    return res.status(200).json({ state: rows[0]?.state ?? null })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
