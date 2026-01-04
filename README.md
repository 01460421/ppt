# File Vault 文件暫存庫

一個簡潔的本地文件暫存網站，使用 IndexedDB 在瀏覽器中儲存檔案。

## 功能特色

- **檔案上傳**：支援拖曳上傳，接受所有檔案類型
- **資料夾管理**：建立、編輯、刪除資料夾，支援巢狀結構
- **檔案註記**：為每個檔案添加說明文字
- **搜尋功能**：依檔名或註記內容搜尋
- **檔案預覽**：支援圖片與 PDF 預覽
- **批次操作**：多選刪除
- **本地儲存**：使用 IndexedDB，資料儲存於瀏覽器

## 技術架構

- **前端框架**：React 18
- **建構工具**：Vite
- **資料儲存**：IndexedDB (idb)
- **部署平台**：Vercel

## 部署到 Vercel

### 方法一：透過 GitHub

1. Fork 或 Clone 此專案到你的 GitHub

2. 前往 [Vercel](https://vercel.com) 並登入

3. 點擊 "New Project"

4. 選擇你的 GitHub repository

5. Vercel 會自動偵測設定，直接點擊 "Deploy"

6. 完成！你的網站會在幾分鐘內上線

### 方法二：使用 Vercel CLI

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 在專案目錄執行
vercel

# 依照提示操作即可
```

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建構生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 專案結構

```
file-vault/
├── public/
├── src/
│   ├── utils/
│   │   └── storage.js    # IndexedDB 操作函式
│   ├── App.jsx           # 主要元件
│   ├── main.jsx          # 入口點
│   └── index.css         # 樣式
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## 注意事項

- 資料儲存於瀏覽器的 IndexedDB 中，清除瀏覽器資料會導致檔案遺失
- 不同瀏覽器或裝置的資料不會同步
- 建議定期下載重要檔案備份

## 授權

MIT License
