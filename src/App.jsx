import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  addFile, getFiles, deleteFile, updateFile, downloadFile,
  addFolder, getFolders, deleteFolder, updateFolder, getFolder,
  getFolderPath, getStats, searchFiles,
  formatSize, formatDate, getFileIcon
} from './utils/storage';

// Icons as simple text/SVG
const Icons = {
  folder: '📁',
  upload: '↑',
  newFolder: '+',
  download: '↓',
  edit: '✎',
  delete: '×',
  search: '⌕',
  back: '←',
  check: '✓',
  close: '×'
};

export default function App() {
  const [currentFolder, setCurrentFolder] = useState('root');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([{ id: 'root', name: '根目錄' }]);
  const [stats, setStats] = useState({ fileCount: 0, folderCount: 0, totalSize: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Modals
  const [uploadModal, setUploadModal] = useState(false);
  const [folderModal, setFolderModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  
  // Form states
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadNote, setUploadNote] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editName, setEditName] = useState('');
  
  const fileInputRef = useRef(null);

  // Load data
  const loadData = useCallback(async () => {
    const [folderList, fileList, statsData, pathData] = await Promise.all([
      getFolders(currentFolder),
      getFiles(currentFolder),
      getStats(),
      getFolderPath(currentFolder)
    ]);
    setFolders(folderList);
    setFiles(fileList);
    setStats(statsData);
    setBreadcrumb(pathData);
    setSelectedItems(new Set());
  }, [currentFolder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search
  useEffect(() => {
    if (searchQuery.trim()) {
      searchFiles(searchQuery).then(setSearchResults);
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

  // File upload handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const handleUpload = async () => {
    for (const file of uploadFiles) {
      await addFile(file, currentFolder, uploadNote);
    }
    setUploadFiles([]);
    setUploadNote('');
    setUploadModal(false);
    loadData();
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await addFolder(newFolderName.trim(), currentFolder);
      setNewFolderName('');
      setFolderModal(false);
      loadData();
    }
  };

  const handleDelete = async (type, id) => {
    if (confirm('確定要刪除嗎？此操作無法復原。')) {
      if (type === 'folder') {
        await deleteFolder(id);
      } else {
        await deleteFile(id);
      }
      loadData();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`確定要刪除 ${selectedItems.size} 個項目嗎？`)) return;
    
    for (const item of selectedItems) {
      const [type, id] = item.split(':');
      if (type === 'folder') {
        await deleteFolder(id);
      } else {
        await deleteFile(id);
      }
    }
    loadData();
  };

  const handleEdit = async () => {
    if (editModal.type === 'folder') {
      await updateFolder(editModal.id, { name: editName });
    } else {
      await updateFile(editModal.id, { name: editName, note: editNote });
    }
    setEditModal(null);
    loadData();
  };

  const openEditModal = (item, type) => {
    setEditModal({ ...item, type });
    setEditName(item.name);
    setEditNote(item.note || '');
  };

  const toggleSelect = (type, id) => {
    const key = `${type}:${id}`;
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const displayItems = searchResults || [...folders.map(f => ({ ...f, isFolder: true })), ...files];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1>File Vault</h1>
        <p className="header-subtitle">文件暫存庫 — 本地儲存，安全便捷</p>
      </header>

      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setUploadModal(true)}>
          {Icons.upload} 上傳檔案
        </button>
        <button className="btn" onClick={() => setFolderModal(true)}>
          {Icons.newFolder} 新增資料夾
        </button>
        {selectedItems.size > 0 && (
          <button className="btn btn-danger" onClick={handleBulkDelete}>
            {Icons.delete} 刪除已選 ({selectedItems.size})
          </button>
        )}
        <input
          type="text"
          className="form-input search-input"
          placeholder="搜尋檔案名稱或註記..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Breadcrumb */}
      {!searchResults && (
        <nav className="breadcrumb">
          {breadcrumb.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <span className="breadcrumb-separator">/</span>}
              <span
                className={idx < breadcrumb.length - 1 ? 'breadcrumb-item' : ''}
                onClick={() => idx < breadcrumb.length - 1 && setCurrentFolder(item.id)}
              >
                {item.name}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}

      {searchResults && (
        <div className="breadcrumb">
          <span>搜尋結果：「{searchQuery}」({searchResults.length} 個項目)</span>
          <button className="btn btn-sm" onClick={() => setSearchQuery('')} style={{ marginLeft: 'auto' }}>
            清除搜尋
          </button>
        </div>
      )}

      {/* File Explorer */}
      <div className="file-explorer">
        <div className="file-list-header">
          <span></span>
          <span>名稱</span>
          <span>大小</span>
          <span>修改時間</span>
          <span>操作</span>
        </div>

        {displayItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{Icons.folder}</div>
            <p>{searchResults ? '沒有找到符合的檔案' : '此資料夾是空的'}</p>
          </div>
        ) : (
          displayItems.map(item => (
            <div
              key={item.isFolder ? `folder-${item.id}` : `file-${item.id}`}
              className={`file-item ${selectedItems.has(`${item.isFolder ? 'folder' : 'file'}:${item.id}`) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                className="checkbox"
                checked={selectedItems.has(`${item.isFolder ? 'folder' : 'file'}:${item.id}`)}
                onChange={() => toggleSelect(item.isFolder ? 'folder' : 'file', item.id)}
              />
              <div className="file-info">
                <div
                  className="file-name"
                  onClick={() => {
                    if (item.isFolder) {
                      setCurrentFolder(item.id);
                    } else {
                      setPreviewModal(item);
                    }
                  }}
                >
                  <span className="file-icon" style={item.isFolder ? { color: '#f6ad55' } : {}}>
                    {item.isFolder ? Icons.folder : getFileIcon(item.type, item.name)}
                  </span>{' '}
                  {item.name}
                </div>
                {item.note && <div className="file-note">{item.note}</div>}
              </div>
              <span className="file-size">
                {item.isFolder ? '—' : formatSize(item.size)}
              </span>
              <span className="file-date">
                {formatDate(item.createdAt)}
              </span>
              <div className="file-actions">
                {!item.isFolder && (
                  <button
                    className="action-btn"
                    title="下載"
                    onClick={() => downloadFile(item)}
                  >
                    {Icons.download}
                  </button>
                )}
                <button
                  className="action-btn"
                  title="編輯"
                  onClick={() => openEditModal(item, item.isFolder ? 'folder' : 'file')}
                >
                  {Icons.edit}
                </button>
                <button
                  className="action-btn danger"
                  title="刪除"
                  onClick={() => handleDelete(item.isFolder ? 'folder' : 'file', item.id)}
                >
                  {Icons.delete}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat-item">
          <span>檔案數：</span>
          <span className="stat-value">{stats.fileCount}</span>
        </div>
        <div className="stat-item">
          <span>資料夾數：</span>
          <span className="stat-value">{stats.folderCount}</span>
        </div>
        <div className="stat-item">
          <span>總容量：</span>
          <span className="stat-value">{formatSize(stats.totalSize)}</span>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="modal-overlay" onClick={() => setUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">上傳檔案</h2>
              <button className="modal-close" onClick={() => setUploadModal(false)}>
                {Icons.close}
              </button>
            </div>
            <div className="modal-body">
              <div
                className="upload-zone"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onDrop={(e) => { e.currentTarget.classList.remove('dragover'); handleDrop(e); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-zone-icon">{Icons.upload}</div>
                <div className="upload-zone-text">點擊或拖曳檔案至此處</div>
                <div className="upload-zone-hint">支援所有檔案類型</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              
              {uploadFiles.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  {uploadFiles.map((file, idx) => (
                    <div key={idx} className="upload-preview">
                      <span className="upload-preview-icon">{getFileIcon(file.type, file.name)}</span>
                      <div className="upload-preview-info">
                        <div className="upload-preview-name">{file.name}</div>
                        <div className="upload-preview-size">{formatSize(file.size)}</div>
                      </div>
                      <button
                        className="upload-preview-remove"
                        onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                      >
                        {Icons.close}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">註記（選填）</label>
                <textarea
                  className="form-textarea"
                  placeholder="為這些檔案添加註記..."
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setUploadModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                disabled={uploadFiles.length === 0}
                onClick={handleUpload}
              >
                上傳 ({uploadFiles.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Modal */}
      {folderModal && (
        <div className="modal-overlay" onClick={() => setFolderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">新增資料夾</h2>
              <button className="modal-close" onClick={() => setFolderModal(false)}>
                {Icons.close}
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">資料夾名稱</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="輸入資料夾名稱"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setFolderModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                disabled={!newFolderName.trim()}
                onClick={handleCreateFolder}
              >
                建立
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">編輯{editModal.type === 'folder' ? '資料夾' : '檔案'}</h2>
              <button className="modal-close" onClick={() => setEditModal(null)}>
                {Icons.close}
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">名稱</label>
                <input
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              {editModal.type === 'file' && (
                <div className="form-group">
                  <label className="form-label">註記</label>
                  <textarea
                    className="form-textarea"
                    placeholder="添加註記..."
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setEditModal(null)}>取消</button>
              <button className="btn btn-primary" onClick={handleEdit}>
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (
        <div className="modal-overlay" onClick={() => setPreviewModal(null)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{previewModal.name}</h2>
              <button className="modal-close" onClick={() => setPreviewModal(null)}>
                {Icons.close}
              </button>
            </div>
            <div className="modal-body">
              {previewModal.type?.startsWith('image/') ? (
                <img
                  src={previewModal.data}
                  alt={previewModal.name}
                  style={{ maxWidth: '100%', borderRadius: '4px' }}
                />
              ) : previewModal.type === 'application/pdf' ? (
                <iframe
                  src={previewModal.data}
                  style={{ width: '100%', height: '400px', border: 'none' }}
                  title={previewModal.name}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    {getFileIcon(previewModal.type, previewModal.name)}
                  </div>
                  <p>此檔案類型無法預覽</p>
                </div>
              )}
              
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>大小：</strong>{formatSize(previewModal.size)}
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>類型：</strong>{previewModal.type || '未知'}
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>上傳時間：</strong>{formatDate(previewModal.createdAt)}
                </p>
                {previewModal.note && (
                  <p style={{ fontSize: '0.875rem' }}>
                    <strong>註記：</strong>{previewModal.note}
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setPreviewModal(null)}>關閉</button>
              <button className="btn btn-primary" onClick={() => downloadFile(previewModal)}>
                {Icons.download} 下載
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
