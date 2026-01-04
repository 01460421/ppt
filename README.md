# File Vault

雲端文件暫存庫，使用 Upstash Redis 儲存。

## 部署

1. Push 到 GitHub
2. 到 Vercel 建立新專案
3. 設定環境變數：
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_URL`
4. Deploy

## 測試連線

部署後訪問 `/api/debug` 確認 Redis 連線狀態。
