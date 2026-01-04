'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const formatSize = (b) => { if (!b) return '0 B'; const k = 1024, s = ['B','KB','MB','GB'], i = Math.floor(Math.log(b)/Math.log(k)); return (b/Math.pow(k,i)).toFixed(1)+' '+s[i] }
const formatDate = (d) => d ? new Date(d).toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''
const getIcon = (n) => { const e = n?.split('.').pop()?.toLowerCase(); const m = {pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📽',pptx:'📽',txt:'📃',jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',mp3:'🎵',mp4:'🎬',zip:'📦'}; return m[e]||'📄' }

export default function Home() {
  const [folder, setFolder] = useState('root')
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [path, setPath] = useState([{id:'root',name:'根目錄'}])
  const [stats, setStats] = useState({fileCount:0,folderCount:0,totalSize:0})
  const [search, setSearch] = useState('')
  const [searchRes, setSearchRes] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadModal, setUploadModal] = useState(false)
  const [folderModal, setFolderModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploadFiles, setUploadFiles] = useState([])
  const [uploadNote, setUploadNote] = useState('')
  const [newName, setNewName] = useState('')
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const inputRef = useRef()

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [f, fi, s, p] = await Promise.all([
        fetch(`/api/folders?parentId=${folder}`).then(r=>r.json()),
        fetch(`/api/files?folderId=${folder}`).then(r=>r.json()),
        fetch('/api/stats').then(r=>r.json()),
        fetch(`/api/stats?action=path&folderId=${folder}`).then(r=>r.json())
      ])
      setFolders(f); setFiles(fi); setStats(s); setPath(p); setSelected(new Set())
    } catch(e) { setError(e.message) }
    setLoading(false)
  }, [folder])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (search.trim()) fetch(`/api/files?search=${encodeURIComponent(search)}`).then(r=>r.json()).then(setSearchRes)
    else setSearchRes(null)
  }, [search])

  const toBase64 = (f) => new Promise((res,rej) => { const r = new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f) })

  const upload = async () => {
    setLoading(true); setError(null)
    try {
      for (const f of uploadFiles) {
        if (f.size > 400*1024) throw new Error(`${f.name} 超過 400KB`)
        const data = await toBase64(f)
        await fetch('/api/files', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:f.name,type:f.type,size:f.size,data,folderId:folder,note:uploadNote}) })
      }
      setUploadFiles([]); setUploadNote(''); setUploadModal(false); load()
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const createFolder = async () => {
    if (!newName.trim()) return
    try {
      await fetch('/api/folders', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:newName.trim(),parentId:folder}) })
      setNewName(''); setFolderModal(false); load()
    } catch(e) { setError(e.message) }
  }

  const del = async (t, id) => {
    if (!confirm('確定刪除？')) return
    await fetch(`/api/${t}s?id=${id}`, {method:'DELETE'})
    load()
  }

  const bulkDel = async () => {
    if (!selected.size || !confirm(`刪除 ${selected.size} 項？`)) return
    for (const k of selected) { const [t,id] = k.split(':'); await fetch(`/api/${t}s?id=${id}`, {method:'DELETE'}) }
    load()
  }

  const edit = async () => {
    const url = editModal.type === 'folder' ? '/api/folders' : '/api/files'
    const body = editModal.type === 'folder' ? {id:editModal.id,name:editName} : {id:editModal.id,name:editName,note:editNote}
    await fetch(url, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    setEditModal(null); load()
  }

  const openEdit = (item, type) => { setEditModal({...item,type}); setEditName(item.name); setEditNote(item.note||'') }
  const toggle = (t,id) => { const k=`${t}:${id}`; setSelected(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n}) }
  const download = (f) => { const a=document.createElement('a');a.href=f.data;a.download=f.name;a.click() }

  const items = searchRes || [...folders.map(f=>({...f,isFolder:true})), ...files]

  return (
    <div className="container">
      <h1>File Vault</h1>
      <p className="subtitle">雲端文件暫存庫</p>

      {error && <div className="error">{error}<button onClick={()=>setError(null)}>×</button></div>}

      <div className="toolbar">
        <button className="btn btn-primary" onClick={()=>setUploadModal(true)}>+ 上傳</button>
        <button className="btn" onClick={()=>setFolderModal(true)}>+ 資料夾</button>
        {selected.size > 0 && <button className="btn btn-danger" onClick={bulkDel}>刪除 ({selected.size})</button>}
        <input className="search" type="text" placeholder="搜尋..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="btn" onClick={load} disabled={loading}>↻</button>
      </div>

      {!searchRes && (
        <nav className="breadcrumb">
          {path.map((p,i) => <span key={p.id} onClick={()=>i<path.length-1&&setFolder(p.id)}>{i>0?' / ':''}{p.name}</span>)}
        </nav>
      )}

      <div className="card">
        <div className="list-header"><span></span><span>名稱</span><span>大小</span><span>日期</span><span></span></div>
        {items.length === 0 ? (
          <div className="empty"><div className="empty-icon">📁</div><p>空</p></div>
        ) : items.map(item => (
          <div key={item.isFolder?`f${item.id}`:`i${item.id}`} className={`item ${selected.has(`${item.isFolder?'folder':'file'}:${item.id}`)?'selected':''}`}>
            <input type="checkbox" checked={selected.has(`${item.isFolder?'folder':'file'}:${item.id}`)} onChange={()=>toggle(item.isFolder?'folder':'file',item.id)} />
            <div>
              <div className="item-name" onClick={()=>item.isFolder?setFolder(item.id):setPreview(item)}>
                <span>{item.isFolder?'📁':getIcon(item.name)}</span>
                <span>{item.name}</span>
              </div>
              {item.note && <div className="item-note">{item.note}</div>}
            </div>
            <span className="item-size">{item.isFolder?'—':formatSize(item.size)}</span>
            <span className="item-date">{formatDate(item.createdAt)}</span>
            <div className="item-actions">
              {!item.isFolder && <button className="icon-btn" onClick={()=>download(item)}>↓</button>}
              <button className="icon-btn" onClick={()=>openEdit(item,item.isFolder?'folder':'file')}>✎</button>
              <button className="icon-btn danger" onClick={()=>del(item.isFolder?'folder':'file',item.id)}>×</button>
            </div>
          </div>
        ))}
      </div>

      <div className="stats">
        <span>檔案: {stats.fileCount}</span>
        <span>資料夾: {stats.folderCount}</span>
        <span>容量: {formatSize(stats.totalSize)}</span>
      </div>

      {uploadModal && (
        <div className="modal-overlay" onClick={()=>setUploadModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2>上傳檔案</h2><button className="icon-btn" onClick={()=>setUploadModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="upload-zone" onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('dragover')}} onDragLeave={e=>e.currentTarget.classList.remove('dragover')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('dragover');setUploadFiles(p=>[...p,...Array.from(e.dataTransfer.files)])}}>
                <div className="upload-zone-icon">↑</div>
                <div className="upload-zone-text">點擊或拖曳（≤400KB）</div>
              </div>
              <input ref={inputRef} type="file" multiple hidden onChange={e=>setUploadFiles(p=>[...p,...Array.from(e.target.files)])} />
              {uploadFiles.map((f,i) => (
                <div key={i} className="upload-preview">
                  <span>{getIcon(f.name)}</span>
                  <div className="upload-preview-info"><div className="upload-preview-name">{f.name}</div><div className="upload-preview-size">{formatSize(f.size)}</div></div>
                  <button className="icon-btn" onClick={()=>setUploadFiles(p=>p.filter((_,j)=>j!==i))}>×</button>
                </div>
              ))}
              <div className="form-group" style={{marginTop:'0.75rem'}}><label className="form-label">註記</label><textarea value={uploadNote} onChange={e=>setUploadNote(e.target.value)} placeholder="選填" /></div>
            </div>
            <div className="modal-footer"><button className="btn" onClick={()=>setUploadModal(false)}>取消</button><button className="btn btn-primary" disabled={!uploadFiles.length||loading} onClick={upload}>{loading?'上傳中...':'上傳'}</button></div>
          </div>
        </div>
      )}

      {folderModal && (
        <div className="modal-overlay" onClick={()=>setFolderModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2>新增資料夾</h2><button className="icon-btn" onClick={()=>setFolderModal(false)}>×</button></div>
            <div className="modal-body"><div className="form-group"><label className="form-label">名稱</label><input type="text" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createFolder()} autoFocus /></div></div>
            <div className="modal-footer"><button className="btn" onClick={()=>setFolderModal(false)}>取消</button><button className="btn btn-primary" onClick={createFolder}>建立</button></div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={()=>setEditModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2>編輯</h2><button className="icon-btn" onClick={()=>setEditModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">名稱</label><input type="text" value={editName} onChange={e=>setEditName(e.target.value)} /></div>
              {editModal.type==='file' && <div className="form-group"><label className="form-label">註記</label><textarea value={editNote} onChange={e=>setEditNote(e.target.value)} /></div>}
            </div>
            <div className="modal-footer"><button className="btn" onClick={()=>setEditModal(null)}>取消</button><button className="btn btn-primary" onClick={edit}>儲存</button></div>
          </div>
        </div>
      )}

      {preview && (
        <div className="modal-overlay" onClick={()=>setPreview(null)}>
          <div className="modal" style={{maxWidth:'560px'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2>{preview.name}</h2><button className="icon-btn" onClick={()=>setPreview(null)}>×</button></div>
            <div className="modal-body">
              {preview.type?.startsWith('image/') ? <img src={preview.data} alt="" style={{maxWidth:'100%',borderRadius:'6px'}} /> : <div style={{textAlign:'center',padding:'2rem',color:'var(--muted)'}}><div style={{fontSize:'3rem'}}>{getIcon(preview.name)}</div><p>無法預覽</p></div>}
              <div style={{marginTop:'0.75rem',padding:'0.75rem',background:'#f5f5f5',borderRadius:'6px',fontSize:'0.875rem'}}>
                <p><b>大小：</b>{formatSize(preview.size)}</p>
                <p><b>類型：</b>{preview.type||'未知'}</p>
                {preview.note && <p><b>註記：</b>{preview.note}</p>}
              </div>
            </div>
            <div className="modal-footer"><button className="btn" onClick={()=>setPreview(null)}>關閉</button><button className="btn btn-primary" onClick={()=>download(preview)}>下載</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
