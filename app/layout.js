import './globals.css'

export const metadata = {
  title: 'File Vault',
  description: '雲端文件暫存庫',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
