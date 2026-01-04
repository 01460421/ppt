const UPSTASH_URL = process.env.KV_REST_API_URL
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN

async function redis(command, ...args) {
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command, ...args]),
    cache: 'no-store'
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

export const db = {
  get: (key) => redis('GET', key),
  set: (key, value) => redis('SET', key, JSON.stringify(value)),
  del: (key) => redis('DEL', key),
  keys: (pattern) => redis('KEYS', pattern),
}

export function parseJSON(str) {
  if (!str) return null
  try { return JSON.parse(str) } catch { return str }
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8)
}
