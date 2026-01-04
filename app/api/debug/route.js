import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = {
    env: {
      url: process.env.KV_REST_API_URL ? 'set' : 'missing',
      token: process.env.KV_REST_API_TOKEN ? 'set' : 'missing',
    },
    connection: 'untested',
    error: null
  }

  try {
    await db.set('_test', { time: Date.now() })
    const val = await db.get('_test')
    result.connection = val ? 'ok' : 'failed'
    const keys = await db.keys('*')
    result.keys = keys?.length || 0
  } catch (err) {
    result.connection = 'failed'
    result.error = err.message
  }

  return NextResponse.json(result)
}
