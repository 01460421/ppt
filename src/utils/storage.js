import { openDB } from 'idb';

const DB_NAME = 'FileVaultDB';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const FOLDERS_STORE = 'folders';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Files store
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        filesStore.createIndex('folderId', 'folderId');
        filesStore.createIndex('name', 'name');
        filesStore.createIndex('createdAt', 'createdAt');
      }
      // Folders store
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        const foldersStore = db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
        foldersStore.createIndex('parentId', 'parentId');
        foldersStore.createIndex('name', 'name');
      }
    }
  });
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// File operations
export async function addFile(file, folderId = 'root', note = '') {
  const db = await getDB();
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      const fileData = {
        id: generateId(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: reader.result,
        folderId,
        note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        await db.add(FILES_STORE, fileData);
        resolve(fileData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function getFiles(folderId = 'root') {
  const db = await getDB();
  const allFiles = await db.getAllFromIndex(FILES_STORE, 'folderId', folderId);
  return allFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getFile(id) {
  const db = await getDB();
  return db.get(FILES_STORE, id);
}

export async function updateFile(id, updates) {
  const db = await getDB();
  const file = await db.get(FILES_STORE, id);
  if (file) {
    const updated = { ...file, ...updates, updatedAt: new Date().toISOString() };
    await db.put(FILES_STORE, updated);
    return updated;
  }
  return null;
}

export async function deleteFile(id) {
  const db = await getDB();
  await db.delete(FILES_STORE, id);
}

// Folder operations
export async function addFolder(name, parentId = 'root') {
  const db = await getDB();
  const folder = {
    id: generateId(),
    name,
    parentId,
    createdAt: new Date().toISOString()
  };
  await db.add(FOLDERS_STORE, folder);
  return folder;
}

export async function getFolders(parentId = 'root') {
  const db = await getDB();
  const allFolders = await db.getAllFromIndex(FOLDERS_STORE, 'parentId', parentId);
  return allFolders.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFolder(id) {
  const db = await getDB();
  if (id === 'root') {
    return { id: 'root', name: '根目錄', parentId: null };
  }
  return db.get(FOLDERS_STORE, id);
}

export async function updateFolder(id, updates) {
  const db = await getDB();
  const folder = await db.get(FOLDERS_STORE, id);
  if (folder) {
    const updated = { ...folder, ...updates };
    await db.put(FOLDERS_STORE, updated);
    return updated;
  }
  return null;
}

export async function deleteFolder(id) {
  const db = await getDB();
  // Delete all files in folder
  const files = await getFiles(id);
  for (const file of files) {
    await db.delete(FILES_STORE, file.id);
  }
  // Delete subfolders recursively
  const subfolders = await getFolders(id);
  for (const subfolder of subfolders) {
    await deleteFolder(subfolder.id);
  }
  // Delete folder itself
  await db.delete(FOLDERS_STORE, id);
}

// Get folder path (breadcrumb)
export async function getFolderPath(folderId) {
  const path = [];
  let currentId = folderId;
  
  while (currentId && currentId !== 'root') {
    const folder = await getFolder(currentId);
    if (folder) {
      path.unshift(folder);
      currentId = folder.parentId;
    } else {
      break;
    }
  }
  
  path.unshift({ id: 'root', name: '根目錄' });
  return path;
}

// Get all files count and size
export async function getStats() {
  const db = await getDB();
  const files = await db.getAll(FILES_STORE);
  const folders = await db.getAll(FOLDERS_STORE);
  
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  
  return {
    fileCount: files.length,
    folderCount: folders.length,
    totalSize
  };
}

// Search files
export async function searchFiles(query) {
  const db = await getDB();
  const allFiles = await db.getAll(FILES_STORE);
  const lowerQuery = query.toLowerCase();
  
  return allFiles.filter(f => 
    f.name.toLowerCase().includes(lowerQuery) ||
    (f.note && f.note.toLowerCase().includes(lowerQuery))
  );
}

// Download file
export function downloadFile(file) {
  const link = document.createElement('a');
  link.href = file.data;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Format file size
export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get file icon
export function getFileIcon(type, name) {
  const ext = name.split('.').pop().toLowerCase();
  
  const iconMap = {
    // Documents
    'pdf': '📄',
    'doc': '📝', 'docx': '📝',
    'xls': '📊', 'xlsx': '📊',
    'ppt': '📽️', 'pptx': '📽️',
    'txt': '📃',
    'md': '📑',
    'html': '🌐', 'htm': '🌐',
    'css': '🎨',
    'js': '⚡', 'jsx': '⚡', 'ts': '⚡', 'tsx': '⚡',
    'json': '📋',
    'xml': '📋',
    // Images
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
    // Audio/Video
    'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
    'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'webm': '🎬',
    // Archives
    'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
    // Code
    'py': '🐍',
    'java': '☕',
    'c': '©️', 'cpp': '©️', 'h': '©️',
    'rb': '💎',
    'go': '🔵',
    'rs': '🦀',
    'php': '🐘'
  };
  
  return iconMap[ext] || '📁';
}
