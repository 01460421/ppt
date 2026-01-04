import { NextResponse } from 'next/server'
import { db, parseJSON, genId } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const parentId = searchParams.get('parentId') || 'root'
    const id = searchParams.get('id')

    if (id) {
      if (id === 'root') return NextResponse.json({ id: 'root', name: '根目錄', parentId: null })
      const data = await db.get(`folder:${id}`)
      return NextResponse.json(parseJSON(data))
    }

    const keys = await db.keys('folder:*') || []
    const folders = []

    for (const key of keys) {
      const data = await db.get(key)
      const folder = parseJSON(data)
      if (folder && (folder.parentId || 'root') === parentId) {
        folders.push(folder)
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json(folders)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { name, parentId = 'root' } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const id = genId()
    const folder = { id, name: name.trim(), parentId, createdAt: new Date().toISOString() }

    await db.set(`folder:${id}`, folder)
    return NextResponse.json(folder)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Delete files in folder
    const fileKeys = await db.keys('file:*') || []
    for (const key of fileKeys) {
      const data = await db.get(key)
      const file = parseJSON(data)
      if (file?.folderId === id) {
        await db.del(key)
      }
    }

    await db.del(`folder:${id}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const { id, name } = await req.json()

    const data = await db.get(`folder:${id}`)
    const folder = parseJSON(data)
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    folder.name = name
    await db.set(`folder:${id}`, folder)
    return NextResponse.json(folder)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
