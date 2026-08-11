# Pixel — портфолио на Firebase

Данные и видео хранятся в **Firestore + Storage** — не пропадают.  
Хостинг **Firebase Hosting** — сайт онлайн 24/7 (без «засыпания» как на Render free).

Репозиторий: https://github.com/DeniDonhaziev/Pixel

## Почему Firebase, а не Render

| | Render free | Firebase |
|--|-------------|----------|
| Онлайн | Засыпает ~через 15–60 мин | 24/7 |
| Загрузки | Пропадают после рестарта | Остаются в Storage |
| Ссылка | `*.onrender.com` | `*.web.app` / свой домен |

## Быстрый старт Firebase

### 1. Создай проект
1. [console.firebase.google.com](https://console.firebase.google.com) → Add project  
2. Включи **Authentication** → Email/Password  
3. Создай **Firestore** (production mode → потом правила из репо)  
4. Создай **Storage**  
5. Project settings → Your apps → Web → скопируй конфиг

### 2. Локальный `.env.local`

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_ADMIN_EMAIL=твой@gmail.com
VITE_FIREBASE_BOOTSTRAP=true
```

### 3. Правила
В Firebase Console вставь содержимое:
- `firestore.rules`
- `storage.rules`

Или: `firebase deploy --only firestore:rules,storage`

### 4. Админ
1. `npm install && npm run dev`
2. Открой `/admin` → email + пароль (первый раз создаст пользователя, если `BOOTSTRAP=true`)
3. После создания пользователя поставь `VITE_FIREBASE_BOOTSTRAP=false`
4. Закидывай работы — они сразу в облаке

### 5. Деплой сайта

```bash
npm run build
npx firebase login
# в .firebaserc укажи свой project id
npx firebase deploy --only hosting
```

Ссылка будет: `https://ТВОЙ-PROJECT-ID.web.app`  
(красиво и постоянно)

Можно привязать свой домен в Hosting → Add custom domain.

## Локально без Firebase

Если `.env.local` пустой — работает старый Express:

```bash
npm run dev
```

## Структура данных Firebase

- `meta/profile` — профиль  
- `meta/software` — софт  
- `meta/categories` — вкладки  
- `projects/{id}` — работы  
- Storage `uploads/` — видео и фото  
