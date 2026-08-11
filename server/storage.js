import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, 'data.json')
const DATA_BLOB_PATH = 'pixel-portfolio-data.json'
const DATA_KEY = 'portfolio-data'

const defaultData = () => ({
  profile: {
    brand: 'CUT.',
    name: 'Дени',
    role: 'Video Editor / Creator',
    tagline: 'Монтаж, который держит внимание до последней секунды',
    bio: 'Рекламные ролики, клипы, Reels и цветкор.',
    email: '',
    telegram: '',
    whatsapp: '',
    instagram: '',
  },
  software: [],
  categories: ['Reels', 'Сайты', 'Карточки товаров для WB'],
  projects: [],
})

function normalize(data) {
  if (!data || typeof data !== 'object') return defaultData()
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    data.categories = ['Реклама', 'Клип', 'Reels', 'Сайты', 'Другое']
  }
  if (!Array.isArray(data.projects)) data.projects = []
  if (!Array.isArray(data.software)) data.software = []
  if (!data.profile) data.profile = defaultData().profile
  return data
}

function hasVercelBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function isNetlify() {
  return Boolean(process.env.NETLIFY || process.env.CONTEXT)
}

async function readLocal() {
  try {
    if (!fs.existsSync(dataPath)) return defaultData()
    return normalize(JSON.parse(fs.readFileSync(dataPath, 'utf-8')))
  } catch {
    return defaultData()
  }
}

function writeLocal(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Local write skipped (read-only FS)', err.message)
  }
}

async function getNetlifyStore() {
  const { getStore } = await import('@netlify/blobs')
  return getStore('pixel-portfolio')
}

async function readNetlify() {
  const store = await getNetlifyStore()
  const data = await store.get(DATA_KEY, { type: 'json' })
  if (!data) {
    const local = await readLocal()
    await writeNetlify(local)
    return local
  }
  return normalize(data)
}

async function writeNetlify(data) {
  const store = await getNetlifyStore()
  await store.setJSON(DATA_KEY, data)
}

async function readVercelBlob() {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: DATA_BLOB_PATH })
  const hit = blobs.find((b) => b.pathname === DATA_BLOB_PATH) || blobs[0]
  if (!hit) {
    const data = await readLocal()
    await writeVercelBlob(data)
    return data
  }
  const res = await fetch(hit.url, { cache: 'no-store' })
  if (!res.ok) return normalize(await readLocal())
  return normalize(await res.json())
}

async function writeVercelBlob(data) {
  const { put } = await import('@vercel/blob')
  await put(DATA_BLOB_PATH, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export async function readData() {
  if (hasVercelBlob()) {
    try {
      return await readVercelBlob()
    } catch (err) {
      console.error('Vercel Blob read failed', err)
    }
  }
  if (isNetlify()) {
    try {
      return await readNetlify()
    } catch (err) {
      console.error('Netlify Blobs read failed', err)
    }
  }
  return readLocal()
}

export async function writeData(data) {
  if (hasVercelBlob()) {
    try {
      await writeVercelBlob(data)
      return
    } catch (err) {
      console.error('Vercel Blob write failed', err)
    }
  }
  if (isNetlify()) {
    try {
      await writeNetlify(data)
      return
    } catch (err) {
      console.error('Netlify Blobs write failed', err)
    }
  }
  writeLocal(data)
}

export async function saveUpload(file) {
  const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}-${safe}`
  const contentType = file.mimetype || 'application/octet-stream'

  if (hasVercelBlob()) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`uploads/${filename}`, file.buffer, {
      access: 'public',
      contentType,
    })
    return { url: blob.url, filename }
  }

  if (isNetlify()) {
    const store = await getNetlifyStore()
    const key = `uploads/${filename}`
    await store.set(key, file.buffer, { metadata: { contentType } })
    // Public URL via Netlify Blobs serve endpoint is site-specific;
    // expose through our API proxy path
    const site = process.env.URL || process.env.DEPLOY_PRIME_URL || ''
    return {
      url: `${site}/.netlify/functions/media?key=${encodeURIComponent(key)}`,
      filename,
    }
  }

  const root = path.join(__dirname, '..')
  const uploadsDir = path.join(root, 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer)
  return { url: `/uploads/${filename}`, filename }
}

export async function readUpload(key) {
  if (!key || key.includes('..')) return null
  if (isNetlify()) {
    const store = await getNetlifyStore()
    const buf = await store.get(key, { type: 'arrayBuffer' })
    const meta = await store.getMetadata(key)
    if (!buf) return null
    return {
      buffer: Buffer.from(buf),
      contentType: meta?.metadata?.contentType || 'application/octet-stream',
    }
  }
  return null
}

export function ensureCategory(data, category) {
  const name = String(category || '').trim()
  if (!name) return data.categories[0] || 'Другое'
  if (!data.categories.includes(name)) data.categories.push(name)
  return name
}
