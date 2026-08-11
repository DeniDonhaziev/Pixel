# Pixel — портфолио Дени

Сайт-портфолио (монтаж / Reels / сайты / карточки WB) + админка.

## Локально

```bash
npm install
npm run dev
```

- Сайт: http://localhost:5173  
- Админка: http://localhost:5173/admin  
- Пароль по умолчанию: `cut2026`

## Деплой на Vercel (красивая ссылка)

Репозиторий: https://github.com/DeniDonhaziev/Pixel

1. Зайди на [vercel.com](https://vercel.com) → **Add New Project** → импортируй `DeniDonhaziev/Pixel`
2. Framework: **Vite** (подхватится из `vercel.json`)
3. Environment Variables:
   - `ADMIN_PASSWORD` — свой пароль админки
   - `BLOB_READ_WRITE_TOKEN` — создай в Vercel: **Storage → Blob → Create** и скопируй токен  
     (без Blob загрузки с админки на проде не сохранятся)
4. Deploy

Ссылка будет вида:

- `https://pixel.vercel.app` — если имя `pixel` свободно  
- или `https://pixel-<твой-ник>.vercel.app`

Потом в Vercel → **Domains** можно повесить свой домен, например `pixel.doni.ru`.

### Важно про видео на Vercel

На Hobby у serverless лимит тела запроса ~4.5 МБ. Для больших роликов:
- заливай на YouTube / Instagram и кидай **ссылку**, или  
- используй вкладку **Сайты** (только URL), или  
- проверь лимиты Blob / Pro план

## Структура

- `src/` — фронт (React + Vite)
- `server/` — API (Express)
- `api/` — вход для Vercel Serverless
- `uploads/` — локальные файлы (в git не попадают)
