import { NextResponse } from 'next/server'
import { redis, generateId } from '@/lib/redis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId') || 'root'
    const id = searchParams.get('id')
    
    if (id) {
      if (id === 'root') return NextResponse.json({ id: 'root', name: '根目錄', parentId: null })
      const folder = await redis.get(`folder:${id}`)
      return NextResponse.json(folder)
    }
    
    const ids = await redis.smembers(`parent:${parentId}:folders`) || []
    const folders = []
    for (const fid of ids) {
      const f = await redis.get(`folder:${fid}`)
      if (f) folders.push(f)
    }
    folders.sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json(folders)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { name, parentId = 'root' } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    
    const id = generateId()
    const folder = { id, name: name.trim(), parentId, createdAt: new Date().toISOString() }
    
    await redis.set(`folder:${id}`, folder)
    await redis.sadd(`parent:${parentId}:folders`, id)
    await redis.sadd('all:folders', id)
    
    return NextResponse.json(folder)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    const fileIds = await redis.smembers(`folder:${id}:files`) || []
    for (const fid of fileIds) {
      await redis.del(`file:${fid}`)
      await redis.srem('all:files', fid)
    }
    await redis.del(`folder:${id}:files`)
    
    const folder = await redis.get(`folder:${id}`)
    if (folder) {
      await redis.srem(`parent:${folder.parentId || 'root'}:folders`, id)
      await redis.del(`folder:${id}`)
      await redis.srem('all:folders', id)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, name } = await request.json()
    const folder = await redis.get(`folder:${id}`)
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = { ...folder, name }
    await redis.set(`folder:${id}`, updated)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
