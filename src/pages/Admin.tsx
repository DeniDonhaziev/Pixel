import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  clearToken,
  createProject,
  deleteProject,
  fetchPortfolio,
  getToken,
  importLocalSeed,
  login,
  logout as apiLogout,
  setToken,
  updateCategories,
  updateProfile,
  updateSoftware,
  watchAuth,
} from '../api'
import { isFirebaseEnabled } from '../firebase'
import type { Accent, PortfolioData, Profile, SoftwareItem } from '../types'
import { isSiteCategory, getCoverKind } from '../types'

const ACCENTS: Accent[] = ['lime', 'blue', 'dark', 'cream', 'orange']
const DEFAULT_CATEGORIES = ['Реклама', 'Клип', 'Reels', 'Сайты', 'Другое']

export default function Admin() {
  const [params] = useSearchParams()
  const presetCategory = params.get('category') || ''

  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState(
    (import.meta.env.VITE_FIREBASE_ADMIN_EMAIL as string | undefined) || '',
  )
  const [data, setData] = useState<PortfolioData | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [softwareText, setSoftwareText] = useState('')
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [newCategory, setNewCategory] = useState('')
  const [listTab, setListTab] = useState('Все')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(presetCategory || DEFAULT_CATEGORIES[0])
  const [tools, setTools] = useState('CapCut, Figma')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [link, setLink] = useState('')
  const [accent, setAccent] = useState<Accent>('lime')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const siteMode = isSiteCategory(category)
  const coverKind = getCoverKind(category)
  const wbMode = coverKind === 'wb'
  const acceptMedia = wbMode ? 'image/*,video/*' : 'video/*'
  const mediaLabel = wbMode ? 'Фото / видео карточки' : 'Твоё видео'

  async function load() {
    const portfolio = await fetchPortfolio()
    setData(portfolio)
    setProfile({
      brand: portfolio.profile.brand || 'CUT.',
      name: portfolio.profile.name || '',
      role: portfolio.profile.role || '',
      tagline: portfolio.profile.tagline || '',
      bio: portfolio.profile.bio || '',
      email: portfolio.profile.email || '',
      telegram: portfolio.profile.telegram || '',
      whatsapp: portfolio.profile.whatsapp || '',
      instagram: portfolio.profile.instagram || '',
    })
    const cats = portfolio.categories?.length ? portfolio.categories : DEFAULT_CATEGORIES
    setCategories(cats)
    setSoftwareText(
      portfolio.software
        .map((s) => `${s.short}|${s.name}|${s.url}|${s.color}`)
        .join('\n'),
    )
    if (presetCategory) {
      setCategory(presetCategory)
      setListTab(presetCategory)
    }
  }

  useEffect(() => {
    return watchAuth((user) => {
      if (isFirebaseEnabled()) {
        setAuthed(Boolean(user))
        if (user) setToken('firebase')
        else clearToken()
      }
    })
  }, [])

  useEffect(() => {
    if (!authed) return
    load().catch((e) => setError(e.message))
  }, [authed])

  useEffect(() => {
    if (presetCategory) {
      setCategory(presetCategory)
      setListTab(presetCategory)
    }
  }, [presetCategory])

  const filteredProjects = useMemo(() => {
    const list = data?.projects || []
    if (listTab === 'Все') return list
    return list.filter((p) => p.category === listTab)
  }, [data, listTab])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await login(password, email)
      setToken(res.token)
      setAuthed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    }
  }

  async function logout() {
    await apiLogout()
    setAuthed(false)
  }

  async function seedFromLocal() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/seed-data.json')
      if (!res.ok) throw new Error('Нет seed-data.json в public/')
      const json = await res.json()
      await importLocalSeed(json)
      setMessage('Данные залиты в Firebase')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта')
    } finally {
      setBusy(false)
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await updateProfile(profile)
      setMessage('Профиль сохранён')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  async function saveSoftware(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const items: SoftwareItem[] = softwareText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => {
          const [short, name, url, color] = line.split('|').map((x) => x.trim())
          return {
            id: `soft-${i}-${short}`,
            short: short || 'Xx',
            name: name || short,
            url: url || '#',
            color: color || '#111',
          }
        })
      await updateSoftware(items)
      setMessage('Программы сохранены')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  async function addCategory(e: FormEvent) {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    if (categories.includes(name)) {
      setError('Такая вкладка уже есть')
      return
    }
    setBusy(true)
    setError('')
    try {
      const next = [...categories, name]
      await updateCategories(next)
      setCategories(next)
      setCategory(name)
      setListTab(name)
      setNewCategory('')
      setMessage(`Вкладка «${name}» создана`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  async function removeCategory(name: string) {
    if (!confirm(`Удалить вкладку «${name}»? Видео в ней останутся, но вкладка пропадёт.`)) return
    setBusy(true)
    try {
      const next = categories.filter((c) => c !== name)
      await updateCategories(next)
      setCategories(next)
      if (category === name) setCategory(next[0] || 'Другое')
      if (listTab === name) setListTab('Все')
      setMessage(`Вкладка «${name}» удалена`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  async function addProject(e: FormEvent) {
    e.preventDefault()
    if (siteMode) {
      if (!link.trim()) {
        setError('Вставь ссылку на сайт')
        return
      }
    } else if (!file) {
      setError('Выбери видео — без файла работа не добавится')
      return
    }
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const form = new FormData()
      form.append('title', title)
      form.append('description', description)
      form.append('category', category)
      form.append('tools', tools)
      form.append('year', year)
      form.append('link', link)
      form.append('accent', accent)
      form.append('kind', siteMode ? 'site' : 'video')
      if (file && !siteMode) form.append('media', file)
      await createProject(form)
      setTitle('')
      setDescription('')
      setLink('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setListTab(category)
      setMessage(
        siteMode
          ? `Сайт добавлен во вкладку «${category}»`
          : `Видео добавлено во вкладку «${category}»`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  async function removeProject(id: string) {
    if (!confirm('Удалить эту работу?')) return
    setBusy(true)
    setError('')
    try {
      await deleteProject(id)
      setMessage('Удалено')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <div className="login-wrap">
        <form className="login-box" onSubmit={handleLogin}>
          <h1>PIXEL Admin</h1>
          <p className="admin__sub">
            {isFirebaseEnabled()
              ? 'Вход через Firebase. Данные и видео хранятся в облаке 24/7.'
              : 'Локальный режим. Пароль по умолчанию: cut2026'}
          </p>
          <div className="form-grid">
            {isFirebaseEnabled() ? (
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="admin@gmail.com"
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn--ink" type="submit">
              Войти
              <span className="btn__arrow">→</span>
            </button>
            <Link to="/">← На сайт</Link>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="admin">
      <div className="shell">
        <div className="admin__card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1>Админ-панель</h1>
              <p className="admin__sub">
                {isFirebaseEnabled()
                  ? 'Firebase: файлы и данные не пропадут, сервер онлайн 24/7.'
                  : 'Выбери вкладку — работа попадёт именно туда.'}
              </p>
            </div>
            <div className="admin-actions">
              {isFirebaseEnabled() ? (
                <button className="btn btn--ghost" type="button" onClick={seedFromLocal} disabled={busy}>
                  Импорт seed
                </button>
              ) : null}
              <Link
                className="btn btn--ghost"
                to={category ? `/?tab=${encodeURIComponent(category)}#works` : '/'}
              >
                Смотреть вкладку
              </Link>
              <button className="btn btn--ink" type="button" onClick={logout}>
                Выйти
              </button>
            </div>
          </div>
          {message ? (
            <p className="success">
              {message}{' '}
              <Link to={`/?tab=${encodeURIComponent(category)}#works`}>Открыть на сайте →</Link>
            </p>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
        </div>

        <form className="admin__card" onSubmit={addCategory}>
          <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.75rem' }}>Вкладки</h2>
          <div className="tabs" style={{ marginBottom: '1rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`tab ${category === cat ? 'is-active' : ''}`}
                onClick={() => {
                  setCategory(cat)
                  setListTab(cat)
                }}
              >
                <span>{cat}</span>
                <em>{(data?.projects || []).filter((p) => p.category === cat).length}</em>
              </button>
            ))}
          </div>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="new-cat">Новая вкладка</label>
              <input
                id="new-cat"
                placeholder="Например: Shorts"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
            <div className="field" style={{ alignContent: 'end' }}>
              <button className="btn btn--ink" type="submit" disabled={busy}>
                Создать вкладку
                <span className="btn__arrow">+</span>
              </button>
            </div>
          </div>
          <div className="admin-actions" style={{ marginTop: '0.75rem' }}>
            {categories.map((cat) => (
              <button
                key={`del-${cat}`}
                type="button"
                className="btn btn--ghost danger"
                onClick={() => removeCategory(cat)}
                disabled={busy || categories.length <= 1}
              >
                Удалить «{cat}»
              </button>
            ))}
          </div>
        </form>

        <form className="admin__card" onSubmit={addProject}>
          <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.35rem' }}>
            {siteMode ? 'Добавить сайт' : wbMode ? 'Добавить карточку WB' : 'Закинуть видео'}
          </h2>
          <p className="admin__sub">
            Сейчас вкладка: <strong>{category}</strong>
            {siteMode
              ? ' — достаточно вставить ссылку на сайт.'
              : coverKind === 'reels'
                ? ' — обложка будет как телефон с Reels.'
                : wbMode
                  ? ' — обложка будет как карточка Wildberries.'
                  : ' — работа появится именно в этой вкладке.'}
          </p>
          <div className="form-grid two">
            {siteMode ? (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="link">Ссылка на сайт</label>
                <input
                  id="link"
                  type="url"
                  placeholder="https://example.com"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{mediaLabel}</label>
                <div className="dropzone">
                  <p style={{ marginBottom: '0.75rem' }}>
                    {wbMode
                      ? 'Загрузи фото карточки WB или короткое видео — будет обложка в стиле маркетплейса'
                      : coverKind === 'reels'
                        ? 'Загрузи рилс — на сайте будет обложка в виде телефона'
                        : 'Нажми кнопку и выбери видео из галереи (mp4, mov и т.д.)'}
                  </p>
                  <input
                    ref={fileRef}
                    id="video-file"
                    type="file"
                    accept={acceptMedia}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="btn btn--ink"
                    type="button"
                    onClick={() => fileRef.current?.click()}
                  >
                    {wbMode ? 'Выбрать файл' : 'Выбрать видео'}
                    <span className="btn__arrow">⬆</span>
                  </button>
                  {file ? (
                    <div style={{ marginTop: '0.85rem', fontWeight: 700 }}>
                      Выбрано: {file.name} ({Math.round(file.size / 1024 / 1024)} МБ)
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.85rem', color: 'var(--muted)' }}>
                      Файл ещё не выбран
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor="title">Название</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="category">Вкладка</label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  const next = e.target.value
                  setCategory(next)
                  if (isSiteCategory(next)) {
                    setAccent('blue')
                    setTools('Программирование, Figma')
                  }
                }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="description">Описание</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder={siteMode ? 'Коротко о сайте' : ''}
              />
            </div>
            <div className="field">
              <label htmlFor="tools">Софт (через запятую)</label>
              <input id="tools" value={tools} onChange={(e) => setTools(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="year">Год</label>
              <input id="year" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            {!siteMode ? (
              <div className="field">
                <label htmlFor="link-extra">Ссылка (необязательно)</label>
                <input
                  id="link-extra"
                  type="url"
                  placeholder="https://..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="accent">Цвет карточки</label>
              <select
                id="accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value as Accent)}
              >
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-actions">
            <button
              className="btn btn--ink"
              type="submit"
              disabled={busy || (siteMode ? !link.trim() : !file)}
            >
              {busy ? 'Сохраняю…' : siteMode ? `Добавить сайт в «${category}»` : `Закинуть в «${category}»`}
              <span className="btn__arrow">+</span>
            </button>
          </div>
        </form>

        <div className="admin__card">
          <h2 style={{ fontFamily: 'var(--font-head)' }}>
            Работы ({filteredProjects.length}
            {listTab !== 'Все' ? ` · ${listTab}` : ''})
          </h2>
          <div className="tabs" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className={`tab ${listTab === 'Все' ? 'is-active' : ''}`}
              onClick={() => setListTab('Все')}
            >
              <span>Все</span>
              <em>{data?.projects.length || 0}</em>
            </button>
            {categories.map((cat) => (
              <button
                key={`list-${cat}`}
                type="button"
                className={`tab ${listTab === cat ? 'is-active' : ''}`}
                onClick={() => setListTab(cat)}
              >
                <span>{cat}</span>
                <em>{(data?.projects || []).filter((p) => p.category === cat).length}</em>
              </button>
            ))}
          </div>
          {filteredProjects.length === 0 ? (
            <p className="admin__sub">В этой вкладке пока пусто.</p>
          ) : null}
          <div className="admin-list">
            {filteredProjects.map((p) => (
              <div className="admin-item" key={p.id}>
                <div className="admin-item__top">
                  <div>
                    <h3>{p.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      Вкладка: {p.category} · {p.year}
                    </div>
                  </div>
                  <button
                    className="btn btn--ghost danger"
                    type="button"
                    onClick={() => removeProject(p.id)}
                    disabled={busy}
                  >
                    Удалить
                  </button>
                </div>
                {p.mediaType === 'site' || isSiteCategory(p.category) ? (
                  <a href={p.link} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                    {p.link || 'Без ссылки'}
                  </a>
                ) : p.mediaUrl ? (
                  p.mediaType === 'video' ? (
                    <video src={p.mediaUrl} controls style={{ borderRadius: 12, maxHeight: 220, width: '100%' }} />
                  ) : (
                    <img
                      src={p.mediaUrl}
                      alt=""
                      style={{ borderRadius: 12, maxHeight: 180, objectFit: 'cover' }}
                    />
                  )
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {profile ? (
          <form className="admin__card" onSubmit={saveProfile}>
            <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.75rem' }}>Профиль</h2>
            <div className="form-grid two">
              {(
                [
                  ['brand', 'Бренд'],
                  ['name', 'Имя'],
                  ['role', 'Роль'],
                  ['telegram', 'Telegram (@ник или ссылка)'],
                  ['whatsapp', 'WhatsApp (номер, например +79991234567)'],
                  ['instagram', 'Instagram (@ник или ссылка)'],
                  ['email', 'Email (необязательно)'],
                ] as const
              ).map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <input
                    id={key}
                    value={profile[key] || ''}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    placeholder={
                      key === 'telegram'
                        ? '@egoinsta'
                        : key === 'whatsapp'
                          ? '+79991234567'
                          : key === 'instagram'
                            ? '@username'
                            : ''
                    }
                  />
                </div>
              ))}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="tagline">Слоган</label>
                <input
                  id="tagline"
                  value={profile.tagline}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="bio">Био</label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
            </div>
            <div className="admin-actions">
              <button className="btn btn--ink" type="submit" disabled={busy}>
                Сохранить профиль
              </button>
            </div>
          </form>
        ) : null}

        <form className="admin__card" onSubmit={saveSoftware}>
          <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.5rem' }}>Программы</h2>
          <p className="admin__sub">По одной строке: короткое|название|ссылка|цвет</p>
          <div className="field">
            <label htmlFor="software">Список</label>
            <textarea
              id="software"
              value={softwareText}
              onChange={(e) => setSoftwareText(e.target.value)}
              style={{ minHeight: 120 }}
            />
          </div>
          <div className="admin-actions">
            <button className="btn btn--ink" type="submit" disabled={busy}>
              Сохранить программы
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
