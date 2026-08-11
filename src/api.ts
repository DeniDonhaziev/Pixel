import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getFirebase, isFirebaseEnabled } from './firebase'
import type { Accent, PortfolioData, Profile, Project, SoftwareItem } from './types'
import { isSiteCategory } from './types'

const TOKEN_KEY = 'cut_admin_token'
const META = 'meta'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, options)
  } catch {
    throw new Error('Нет связи с сервером. Запусти npm run dev или настрой Firebase')
  }

  const text = await res.text()
  let data: { error?: string } = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

  if (!res.ok) throw new Error(data.error || `Ошибка запроса (${res.status})`)
  return data as T
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  return { 'x-admin-token': getToken(), ...extra }
}

const emptyProfile = (): Profile => ({
  brand: 'CUT.',
  name: 'Дени',
  role: 'Video Editor / Creator',
  tagline: '',
  bio: '',
  email: '',
  telegram: '',
  whatsapp: '',
  instagram: '',
})

async function firebaseFetchPortfolio(): Promise<PortfolioData> {
  const { db } = getFirebase()
  const [profileSnap, softwareSnap, categoriesSnap, projectsSnap] = await Promise.all([
    getDoc(doc(db, META, 'profile')),
    getDoc(doc(db, META, 'software')),
    getDoc(doc(db, META, 'categories')),
    getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc'))),
  ])

  const profile = { ...emptyProfile(), ...(profileSnap.data() as Partial<Profile> | undefined) }
  const software = (softwareSnap.data()?.items as SoftwareItem[] | undefined) || []
  const categories =
    (categoriesSnap.data()?.items as string[] | undefined) ||
    ['Reels', 'Сайты', 'Карточки товаров для WB']
  const projects = projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project)

  return { profile, software, categories, projects }
}

async function requireAuth() {
  const { auth } = getFirebase()
  if (!auth.currentUser) throw new Error('Войди в админку')
  return auth.currentUser
}

async function uploadMedia(file: File) {
  const { storage } = getFirebase()
  await requireAuth()
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `uploads/${Date.now()}-${safe}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type || undefined })
  const url = await getDownloadURL(storageRef)
  const mediaType: Project['mediaType'] = file.type.startsWith('video')
    ? 'video'
    : file.type.startsWith('image')
      ? 'image'
      : /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name)
        ? 'video'
        : 'image'
  return { url, mediaType }
}

export async function fetchPortfolio() {
  if (isFirebaseEnabled()) return firebaseFetchPortfolio()
  return request<PortfolioData>('/api/portfolio')
}

export async function login(password: string, email?: string) {
  if (isFirebaseEnabled()) {
    const { auth } = getFirebase()
    const adminEmail =
      email?.trim() ||
      (import.meta.env.VITE_FIREBASE_ADMIN_EMAIL as string | undefined) ||
      ''
    if (!adminEmail) {
      throw new Error('Укажи email админа (VITE_FIREBASE_ADMIN_EMAIL) или введи email в форме')
    }
    try {
      await signInWithEmailAndPassword(auth, adminEmail, password)
    } catch (err) {
      const code = (err as { code?: string }).code
      // First launch: create admin if env allows bootstrap
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        const canBootstrap = import.meta.env.VITE_FIREBASE_BOOTSTRAP === 'true'
        if (canBootstrap && code === 'auth/user-not-found') {
          await createUserWithEmailAndPassword(auth, adminEmail, password)
          await seedIfEmpty()
        } else {
          throw new Error('Неверный email или пароль')
        }
      } else {
        throw new Error('Неверный email или пароль')
      }
    }
    setToken('firebase')
    await seedIfEmpty()
    return { ok: true, token: 'firebase' }
  }

  const res = await request<{ ok: boolean; token: string }>('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res
}

async function seedIfEmpty() {
  const { db } = getFirebase()
  const profileSnap = await getDoc(doc(db, META, 'profile'))
  if (profileSnap.exists()) return

  const batch = writeBatch(db)
  batch.set(doc(db, META, 'profile'), emptyProfile())
  batch.set(doc(db, META, 'software'), {
    items: [
      {
        id: 'code',
        name: 'Программирование',
        short: '</>',
        url: 'https://code.visualstudio.com/',
        color: '#007ACC',
      },
      {
        id: 'figma',
        name: 'Figma',
        short: 'Fg',
        url: 'https://www.figma.com/',
        color: '#F24E1E',
      },
      {
        id: 'capcut',
        name: 'CapCut',
        short: 'Cc',
        url: 'https://www.capcut.com/',
        color: '#00F2EA',
      },
    ],
  })
  batch.set(doc(db, META, 'categories'), {
    items: ['Reels', 'Сайты', 'Карточки товаров для WB'],
  })
  await batch.commit()
}

export async function logout() {
  clearToken()
  if (isFirebaseEnabled()) {
    const { auth } = getFirebase()
    await signOut(auth)
  }
}

export function watchAuth(cb: (user: User | null) => void) {
  if (!isFirebaseEnabled()) {
    cb(getToken() ? ({ uid: 'local' } as User) : null)
    return () => undefined
  }
  const { auth } = getFirebase()
  return onAuthStateChanged(auth, cb)
}

export async function updateProfile(profile: Partial<Profile>) {
  if (isFirebaseEnabled()) {
    await requireAuth()
    const { db } = getFirebase()
    const current = await firebaseFetchPortfolio()
    const next = { ...current.profile, ...profile }
    await setDoc(doc(db, META, 'profile'), next, { merge: true })
    return next
  }
  return request<Profile>('/api/profile', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(profile),
  })
}

export async function createProject(form: FormData) {
  if (isFirebaseEnabled()) {
    await requireAuth()
    const { db } = getFirebase()
    const title = String(form.get('title') || 'Без названия')
    const description = String(form.get('description') || '')
    const category = String(form.get('category') || 'Reels')
    const tools = String(form.get('tools') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const year = String(form.get('year') || new Date().getFullYear())
    let link = String(form.get('link') || '').trim()
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`
    const accent = (String(form.get('accent') || 'lime') as Accent) || 'lime'
    const kind = String(form.get('kind') || '')
    const file = form.get('media')
    const site = isSiteCategory(category) || kind === 'site'

    let mediaUrl = ''
    let mediaType: Project['mediaType'] = site ? 'site' : 'image'

    if (site) {
      if (!link) throw new Error('Для сайтов нужна ссылка')
      mediaType = 'site'
    } else if (file instanceof File && file.size > 0) {
      const uploaded = await uploadMedia(file)
      mediaUrl = uploaded.url
      mediaType = uploaded.mediaType
    } else {
      throw new Error('Выбери файл для загрузки')
    }

    // ensure category exists
    const portfolio = await firebaseFetchPortfolio()
    if (!portfolio.categories.includes(category)) {
      await setDoc(
        doc(db, META, 'categories'),
        { items: [...portfolio.categories, category] },
        { merge: true },
      )
    }

    const id = `p-${Date.now()}`
    const project: Project = {
      id,
      title,
      description,
      category,
      tools,
      year,
      link,
      accent: site ? accent || 'blue' : accent,
      mediaType,
      mediaUrl,
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'projects', id), project)
    return project
  }

  return request('/api/projects', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
}

export async function updateProject(id: string, form: FormData) {
  if (isFirebaseEnabled()) {
    await requireAuth()
    const { db } = getFirebase()
    const snap = await getDoc(doc(db, 'projects', id))
    if (!snap.exists()) throw new Error('Не найдено')
    const prev = { id, ...snap.data() } as Project
    const file = form.get('media')
    const next: Project = {
      ...prev,
      title: String(form.get('title') ?? prev.title),
      description: String(form.get('description') ?? prev.description),
      category: String(form.get('category') ?? prev.category),
      year: String(form.get('year') ?? prev.year),
      link: String(form.get('link') ?? prev.link),
      accent: (String(form.get('accent') ?? prev.accent) as Accent) || prev.accent,
      tools: form.get('tools')
        ? String(form.get('tools'))
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : prev.tools,
    }
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadMedia(file)
      next.mediaUrl = uploaded.url
      next.mediaType = uploaded.mediaType
    }
    await setDoc(doc(db, 'projects', id), next)
    return next
  }

  return request(`/api/projects/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: form,
  })
}

export async function deleteProject(id: string) {
  if (isFirebaseEnabled()) {
    await requireAuth()
    const { db } = getFirebase()
    await deleteDoc(doc(db, 'projects', id))
    return { ok: true }
  }
  return request(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export async function updateSoftware(software: SoftwareItem[]) {
  if (isFirebaseEnabled()) {
    await requireAuth()
    const { db } = getFirebase()
    await setDoc(doc(db, META, 'software'), { items: software })
    return software
  }
  return request<SoftwareItem[]>('/api/software', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(software),
  })
}

export async function updateCategories(categories: string[]) {
  if (isFirebaseEnabled()) {
    await requireAuth()
    const { db } = getFirebase()
    await setDoc(doc(db, META, 'categories'), { items: categories })
    return categories
  }
  return request<string[]>('/api/categories', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(categories),
  })
}

export async function importLocalSeed(data: PortfolioData) {
  if (!isFirebaseEnabled()) throw new Error('Только для Firebase')
  await requireAuth()
  const { db } = getFirebase()
  const batch = writeBatch(db)
  batch.set(doc(db, META, 'profile'), data.profile)
  batch.set(doc(db, META, 'software'), { items: data.software })
  batch.set(doc(db, META, 'categories'), { items: data.categories })
  for (const p of data.projects) {
    // skip local /uploads paths — they won't work on Firebase
    const mediaUrl = p.mediaUrl.startsWith('/uploads') ? '' : p.mediaUrl
    batch.set(doc(db, 'projects', p.id), { ...p, mediaUrl })
  }
  await batch.commit()
}
