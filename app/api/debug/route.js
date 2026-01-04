import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET() {
  try {
    await redis.set('_test', Date.now())
    const val = await redis.get('_test')
    return NextResponse.json({ 
      status: 'ok', 
      redis: val ? 'connected' : 'failed', 
      hasToken: !!process.env.KV_REST_API_TOKEN, 
      hasUrl: !!process.env.KV_REST_API_URL 
    })
  } catch (err) {
    return NextResponse.json({ 
      status: 'error', 
      error: err.message, 
      hasToken: !!process.env.KV_REST_API_TOKEN, 
      hasUrl: !!process.env.KV_REST_API_URL 
    }, { status: 500 })
  }
}
