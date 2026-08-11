import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, 'data.json')
const DATA_BLOB_PATH = 'pixel-portfolio-data.json'

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

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

async function readLocal() {
  if (!fs.existsSync(dataPath)) {
    const data = defaultData()
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    return data
  }
  return normalize(JSON.parse(fs.readFileSync(dataPath, 'utf-8')))
}

function writeLocal(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
}

async function readBlob() {
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: DATA_BLOB_PATH })
  const hit = blobs.find((b) => b.pathname === DATA_BLOB_PATH) || blobs[0]
  if (!hit) {
    const data = await readLocal()
    await writeBlob(data)
    return data
  }
  const res = await fetch(hit.url, { cache: 'no-store' })
  if (!res.ok) return normalize(await readLocal())
  return normalize(await res.json())
}

async function writeBlob(data) {
  const { put } = await import('@vercel/blob')
  await put(DATA_BLOB_PATH, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export async function readData() {
  if (hasBlob()) {
    try {
      return await readBlob()
    } catch (err) {
      console.error('Blob read failed, fallback local', err)
      return readLocal()
    }
  }
  return readLocal()
}

export async function writeData(data) {
  if (hasBlob()) {
    try {
      await writeBlob(data)
      return
    } catch (err) {
      console.error('Blob write failed, fallback local', err)
    }
  }
  writeLocal(data)
}

export async function saveUpload(file) {
  const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}-${safe}`

  if (hasBlob()) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`uploads/${filename}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype || 'application/octet-stream',
    })
    return { url: blob.url, filename }
  }

  const root = path.join(__dirname, '..')
  const uploadsDir = path.join(root, 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer)
  return { url: `/uploads/${filename}`, filename }
}

export function ensureCategory(data, category) {
  const name = String(category || '').trim()
  if (!name) return data.categories[0] || 'Другое'
  if (!data.categories.includes(name)) data.categories.push(name)
  return name
}
