import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { ensureCategory, readData, saveUpload, writeData } from './storage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')
const uploadsDir = path.join(root, 'uploads')

if (!process.env.VERCEL && !process.env.NETLIFY) {
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  } catch {
    // ignore
  }
}

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cut2026'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(uploadsDir))

const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi', '.3gp', '.hevc'])
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])

function isMediaFile(file) {
  const mime = (file.mimetype || '').toLowerCase()
  if (mime.startsWith('image/') || mime.startsWith('video/')) return true
  if (mime === 'application/octet-stream' || mime === '' || mime === 'application/mp4') {
    const ext = path.extname(file.originalname || '').toLowerCase()
    return VIDEO_EXT.has(ext) || IMAGE_EXT.has(ext)
  }
  const ext = path.extname(file.originalname || '').toLowerCase()
  return VIDEO_EXT.has(ext) || IMAGE_EXT.has(ext)
}

function detectMediaType(file) {
  const mime = (file.mimetype || '').toLowerCase()
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (VIDEO_EXT.has(ext) || mime === 'application/mp4') return 'video'
  return 'image'
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isMediaFile(file)) return cb(null, true)
    cb(new Error('Можно загружать только видео или фото (mp4, mov, webm, jpg…)'))
  },
})

function uploadMedia(req, res, next) {
  upload.single('media')(req, res, (err) => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой (макс. 80 МБ на сервере)' })
      }
      return res.status(400).json({ error: err.message })
    }
    return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' })
  })
}

function auth(req, res, next) {
  const token = req.headers['x-admin-token']
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Неверный пароль' })
  }
  next()
}

app.get('/api/portfolio', async (_req, res) => {
  try {
    res.json(await readData())
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка чтения данных' })
  }
})

app.post('/api/auth', (req, res) => {
  const { password } = req.body || {}
  if (password === ADMIN_PASSWORD) {
    return res.json({ ok: true, token: ADMIN_PASSWORD })
  }
  res.status(401).json({ error: 'Неверный пароль' })
})

app.put('/api/profile', auth, async (req, res) => {
  try {
    const data = await readData()
    data.profile = { ...data.profile, ...req.body }
    await writeData(data)
    res.json(data.profile)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

app.post('/api/projects', auth, uploadMedia, async (req, res) => {
  try {
    const data = await readData()
    const body = req.body
    const category = ensureCategory(data, body.category || 'Реклама')
    const isSite = /сайт/i.test(category) || body.kind === 'site'
    let link = String(body.link || '').trim()
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`

    if (isSite) {
      if (!link) {
        return res.status(400).json({ error: 'Для вкладки «Сайты» нужна ссылка на сайт' })
      }
    } else if (!req.file && !body.mediaUrl) {
      return res.status(400).json({ error: 'Выбери видеофайл для загрузки' })
    }

    const tools = body.tools
      ? String(body.tools)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    let mediaUrl = body.mediaUrl || ''
    let mediaType = isSite ? 'site' : 'image'
    if (req.file) {
      const saved = await saveUpload(req.file)
      mediaUrl = saved.url
      mediaType = detectMediaType(req.file)
    } else if (isSite) {
      mediaType = 'site'
      mediaUrl = ''
    }

    const project = {
      id: `p-${Date.now()}`,
      title: body.title || (isSite ? 'Сайт' : 'Без названия'),
      description: body.description || '',
      category,
      tools,
      year: body.year || String(new Date().getFullYear()),
      link: link || '',
      accent: body.accent || (isSite ? 'blue' : 'lime'),
      mediaType: isSite ? 'site' : mediaType,
      mediaUrl,
      createdAt: new Date().toISOString(),
    }

    data.projects.unshift(project)
    await writeData(data)
    res.status(201).json(project)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка сохранения' })
  }
})

app.put('/api/projects/:id', auth, uploadMedia, async (req, res) => {
  try {
    const data = await readData()
    const idx = data.projects.findIndex((p) => p.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Не найдено' })

    const prev = data.projects[idx]
    const body = req.body
    const tools = body.tools
      ? String(body.tools)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : prev.tools

    const next = {
      ...prev,
      title: body.title ?? prev.title,
      description: body.description ?? prev.description,
      category: body.category ? ensureCategory(data, body.category) : prev.category,
      tools,
      year: body.year ?? prev.year,
      link: body.link ?? prev.link,
      accent: body.accent ?? prev.accent,
    }

    if (req.file) {
      const saved = await saveUpload(req.file)
      next.mediaType = detectMediaType(req.file)
      next.mediaUrl = saved.url
    }

    data.projects[idx] = next
    await writeData(data)
    res.json(next)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    const data = await readData()
    const idx = data.projects.findIndex((p) => p.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Не найдено' })
    data.projects.splice(idx, 1)
    await writeData(data)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

app.put('/api/software', auth, async (req, res) => {
  try {
    const data = await readData()
    data.software = Array.isArray(req.body) ? req.body : data.software
    await writeData(data)
    res.json(data.software)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

app.put('/api/categories', auth, async (req, res) => {
  try {
    const data = await readData()
    const list = Array.isArray(req.body)
      ? req.body.map((c) => String(c).trim()).filter(Boolean)
      : data.categories
    data.categories = [...new Set(list)]
    await writeData(data)
    res.json(data.categories)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка' })
  }
})

export default app
