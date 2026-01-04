import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
