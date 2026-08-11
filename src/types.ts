export type Accent = 'lime' | 'blue' | 'dark' | 'cream' | 'orange'

export interface SoftwareItem {
  id: string
  name: string
  short: string
  url: string
  color: string
}

export interface Project {
  id: string
  title: string
  description: string
  category: string
  tools: string[]
  year: string
  link: string
  accent: Accent
  mediaType: 'image' | 'video' | 'site'
  mediaUrl: string
  createdAt: string
}

export function isSiteCategory(category: string) {
  return /сайт/i.test(category)
}

export type CoverKind = 'site' | 'reels' | 'wb' | 'clip' | 'ad' | 'media'

export function getCoverKind(category: string, mediaType?: string): CoverKind {
  if (mediaType === 'site' || isSiteCategory(category)) return 'site'
  const c = category.toLowerCase()
  if (/reel|рилс|short|shorts/.test(c)) return 'reels'
  if (/wb|wildberries|вайлд|товар|карточк/.test(c)) return 'wb'
  if (/клип|clip|music|музык/.test(c)) return 'clip'
  if (/реклам|ad\b|promo|промо/.test(c)) return 'ad'
  return 'media'
}

export function siteHostname(url: string) {
  try {
    const full = url.startsWith('http') ? url : `https://${url}`
    return new URL(full).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function normalizeSiteUrl(url: string) {
  const raw = url.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

export interface Profile {
  brand: string
  name: string
  role: string
  tagline: string
  bio: string
  email: string
  telegram: string
  whatsapp: string
  instagram: string
}

export interface PortfolioData {
  profile: Profile
  software: SoftwareItem[]
  categories: string[]
  projects: Project[]
}

/** Accepts @user, user, t.me/user, full URL → https://t.me/user */
export function telegramLink(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  if (raw.startsWith('http')) {
    return raw.replace('https://t.me/@', 'https://t.me/').replace('http://t.me/@', 'https://t.me/')
  }
  const user = raw.replace(/^@/, '').replace(/^t\.me\//i, '')
  return `https://t.me/${user}`
}

/** Accepts +7999..., 8999..., wa.me/... → https://wa.me/7999... */
export function whatsappLink(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  if (raw.startsWith('http')) return raw
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  // 8XXXXXXXXXX (RU) → 7XXXXXXXXXX
  const normalized = digits.length === 11 && digits.startsWith('8') ? `7${digits.slice(1)}` : digits
  return `https://wa.me/${normalized}`
}

export function instagramLink(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  if (raw.startsWith('http')) return raw
  const user = raw.replace(/^@/, '').replace(/^instagram\.com\//i, '')
  return `https://instagram.com/${user}`
}
