import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'path') {
      const folderId = searchParams.get('folderId') || 'root'
      const path = [{ id: 'root', name: '根目錄' }]
      let currentId = folderId
      const visited = new Set()
      
      while (currentId && currentId !== 'root' && !visited.has(currentId)) {
        visited.add(currentId)
        const folder = await redis.get(`folder:${currentId}`)
        if (folder) {
          path.splice(1, 0, folder)
          currentId = folder.parentId
        } else break
      }
      return NextResponse.json(path)
    }
    
    const fileIds = await redis.smembers('all:files') || []
    const folderIds = await redis.smembers('all:folders') || []
    
    let totalSize = 0
    for (const id of fileIds) {
      const f = await redis.get(`file:${id}`)
      if (f?.size) totalSize += f.size
    }
    
    return NextResponse.json({ fileCount: fileIds.length, folderCount: folderIds.length, totalSize })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
