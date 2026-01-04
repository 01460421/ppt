import { NextResponse } from 'next/server'
import { db, parseJSON, genId } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const folderId = searchParams.get('folderId') || 'root'
    const search = searchParams.get('search')

    const keys = await db.keys('file:*') || []
    const files = []

    for (const key of keys) {
      const data = await db.get(key)
      const file = parseJSON(data)
      if (!file) continue

      if (search) {
        if (file.name?.toLowerCase().includes(search.toLowerCase()) ||
            file.note?.toLowerCase().includes(search.toLowerCase())) {
          files.push(file)
        }
      } else {
        if ((file.folderId || 'root') === folderId) {
          files.push(file)
        }
      }
    }

    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return NextResponse.json(files)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, type, size, data, folderId = 'root', note = '' } = body

    if (size > 400 * 1024) {
      return NextResponse.json({ error: '檔案超過 400KB 限制' }, { status: 400 })
    }

    const id = genId()
    const file = { id, name, type: type || 'application/octet-stream', size, data, folderId, note, createdAt: new Date().toISOString() }

    await db.set(`file:${id}`, file)
    return NextResponse.json(file)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await db.del(`file:${id}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const { id, name, note } = await req.json()

    const data = await db.get(`file:${id}`)
    const file = parseJSON(data)
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (name !== undefined) file.name = name
    if (note !== undefined) file.note = note

    await db.set(`file:${id}`, file)
    return NextResponse.json(file)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
