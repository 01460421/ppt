import { NextResponse } from 'next/server'
import { redis, generateId } from '@/lib/redis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId') || 'root'
    const search = searchParams.get('search')
    
    if (search) {
      const allIds = await redis.smembers('all:files') || []
      const files = []
      for (const id of allIds) {
        const f = await redis.get(`file:${id}`)
        if (f && (f.name?.toLowerCase().includes(search.toLowerCase()) || f.note?.toLowerCase().includes(search.toLowerCase()))) {
          files.push(f)
        }
      }
      return NextResponse.json(files)
    }
    
    const ids = await redis.smembers(`folder:${folderId}:files`) || []
    const files = []
    for (const id of ids) {
      const f = await redis.get(`file:${id}`)
      if (f) files.push(f)
    }
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return NextResponse.json(files)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, type, size, data, folderId = 'root', note = '' } = body
    
    if (size > 400 * 1024) {
      return NextResponse.json({ error: '檔案超過 400KB 限制' }, { status: 400 })
    }
    
    const id = generateId()
    const file = { id, name, type, size, data, folderId, note, createdAt: new Date().toISOString() }
    
    await redis.set(`file:${id}`, file)
    await redis.sadd(`folder:${folderId}:files`, id)
    await redis.sadd('all:files', id)
    
    return NextResponse.json(file)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const file = await redis.get(`file:${id}`)
    if (file) {
      await redis.del(`file:${id}`)
      await redis.srem(`folder:${file.folderId || 'root'}:files`, id)
      await redis.srem('all:files', id)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, name, note } = await request.json()
    const file = await redis.get(`file:${id}`)
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = { ...file, name: name ?? file.name, note: note ?? file.note }
    await redis.set(`file:${id}`, updated)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
