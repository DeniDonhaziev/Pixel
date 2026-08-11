import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import app, { ADMIN_PASSWORD } from './app.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')
const PORT = process.env.PORT || 3001

if (!process.env.VERCEL) {
  if (fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PIXEL API → http://localhost:${PORT}`)
    console.log(`Admin password: ${ADMIN_PASSWORD}`)
  })
}

export default app
