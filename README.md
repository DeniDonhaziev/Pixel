# Pixel — портфолио Дени

Сайт-портфолио (монтаж / Reels / сайты / карточки WB) + админка.

Репозиторий: https://github.com/DeniDonhaziev/Pixel

## Локально

```bash
npm install
npm run dev
```

- Сайт: http://localhost:5173
- Админка: http://localhost:5173/admin
- Пароль: `cut2026` (или `ADMIN_PASSWORD`)

## Деплой на Netlify (рекомендуется)

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git** → `DeniDonhaziev/Pixel`
2. Build settings подхватятся из `netlify.toml`:
   - Build: `npm run build`
   - Publish: `dist`
   - Functions: `netlify/functions`
3. Site name: **`pixel`** → ссылка `https://pixel.netlify.app`
4. Site settings → Environment variables:
   - `ADMIN_PASSWORD` = свой пароль
5. Deploy

Проверка API: открой `https://твой-сайт.netlify.app/api/portfolio` — должен быть JSON.

## Деплой на Vercel

1. Import `DeniDonhaziev/Pixel` на [vercel.com](https://vercel.com)
2. Project name: `pixel`
3. Env:
   - `ADMIN_PASSWORD`
   - `BLOB_READ_WRITE_TOKEN` (Vercel Storage → Blob)

## Важно про большие видео

На бесплатном serverless лимит тела запроса небольшой. Для тяжёлых роликов лучше ссылка (YouTube/Instagram) или вкладка «Сайты».

## Структура

- `src/` — фронт
- `server/` — Express API
- `netlify/functions/` — Netlify Functions
- `api/` — Vercel Serverless
- `uploads/` — только локально (в git не попадает)
