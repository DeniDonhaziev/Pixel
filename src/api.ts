import type { PortfolioData, Profile, SoftwareItem } from './types'

const TOKEN_KEY = 'cut_admin_token'

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
    throw new Error('Нет связи с сервером. Запусти npm run dev')
  }

  const text = await res.text()
  let data: { error?: string } = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    throw new Error(data.error || `Ошибка запроса (${res.status})`)
  }
  return data as T
}

export function fetchPortfolio() {
  return request<PortfolioData>('/api/portfolio')
}

export function login(password: string) {
  return request<{ ok: boolean; token: string }>('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  return { 'x-admin-token': getToken(), ...extra }
}

export function updateProfile(profile: Partial<Profile>) {
  return request<Profile>('/api/profile', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(profile),
  })
}

export function createProject(form: FormData) {
  return request('/api/projects', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
}

export function updateProject(id: string, form: FormData) {
  return request(`/api/projects/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: form,
  })
}

export function deleteProject(id: string) {
  return request(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export function updateSoftware(software: SoftwareItem[]) {
  return request<SoftwareItem[]>('/api/software', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(software),
  })
}

export function updateCategories(categories: string[]) {
  return request<string[]>('/api/categories', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(categories),
  })
}
