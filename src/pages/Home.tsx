import { useEffect, useMemo, useState } from 'react'
import { fetchPortfolio } from '../api'
import { ThemedCover } from '../components/ThemedCover'
import type { PortfolioData, Profile, Project } from '../types'
import {
  getCoverKind,
  instagramLink,
  normalizeSiteUrl,
  telegramLink,
  whatsappLink,
} from '../types'

const SERVICES = [
  {
    num: '01',
    title: 'Реклама',
    text: 'Короткие ролики с жёстким ритмом и акцентом на продукт.',
  },
  {
    num: '02',
    title: 'Клипы',
    text: 'Синхронизация под бит, перебивки и визуальные хуки.',
  },
  {
    num: '03',
    title: 'Reels / Shorts',
    text: 'Вертикальный контент под платформы и удержание внимания.',
  },
  {
    num: '04',
    title: 'Цветкор',
    text: 'Кинематографичный цвет и единый стиль серии роликов.',
  },
]

function mediaSrc(url: string) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return url
}

function getContacts(profile?: Profile | null) {
  if (!profile) return []
  const items: { id: string; label: string; href: string; hint: string }[] = []
  const tg = telegramLink(profile.telegram || '')
  const wa = whatsappLink(profile.whatsapp || '')
  const ig = instagramLink(profile.instagram || '')
  if (tg) items.push({ id: 'tg', label: 'Telegram', href: tg, hint: 'Написать в Telegram' })
  if (wa) items.push({ id: 'wa', label: 'WhatsApp', href: wa, hint: 'Написать в WhatsApp' })
  if (ig) items.push({ id: 'ig', label: 'Instagram', href: ig, hint: 'Открыть Instagram' })
  if (profile.email) {
    items.push({
      id: 'mail',
      label: 'Email',
      href: `mailto:${profile.email}`,
      hint: profile.email,
    })
  }
  return items
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project
  onOpen: (project: Project) => void
}) {
  const kind = getCoverKind(project.category, project.mediaType)
  const isSite = kind === 'site'
  const href = project.link ? normalizeSiteUrl(project.link) : ''

  const body = (
    <>
      <ThemedCover project={project} />
      <div className="project-card__body">
        <div className="project-card__meta">
          <span className="tag">{project.category}</span>
          <span className="tag">{project.year}</span>
        </div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <div className="project-card__footer">
          <div className="tools-inline">
            {project.tools.length ? project.tools.join(' · ') : isSite && href ? href : ''}
          </div>
          <span className="icon-btn" aria-hidden>
            {isSite ? '↗' : '→'}
          </span>
        </div>
      </div>
    </>
  )

  if (isSite && href) {
    return (
      <a
        className={`project-card site-card cover-card cover-card--${kind} project-card--${project.accent}`}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {body}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={`project-card cover-card cover-card--${kind} project-card--${project.accent}`}
      onClick={() => onOpen(project)}
    >
      {body}
    </button>
  )
}

export default function Home() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [filter, setFilter] = useState('Все')
  const [error, setError] = useState('')
  const [active, setActive] = useState<Project | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  useEffect(() => {
    fetchPortfolio()
      .then(setData)
      .catch(() => setError('Не удалось загрузить портфолио. Запусти сервер: npm run dev'))
  }, [])

  const categories = useMemo(() => {
    if (!data) return ['Все']
    const base = data.categories?.length
      ? data.categories
      : [...new Set(data.projects.map((p) => p.category))]
    return ['Все', ...base]
  }, [data])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab) setFilter(tab)
  }, [])

  const projects = useMemo(() => {
    if (!data) return []
    if (filter === 'Все') return data.projects
    return data.projects.filter((p) => p.category === filter)
  }, [data, filter])

  const profile = data?.profile
  const contacts = useMemo(() => getContacts(profile), [profile])

  return (
    <div className="page">
      <header className="nav">
        <div className="shell nav__inner">
          <a className="brand" href="#top">
            {(profile?.brand || 'CUT.').replace(/\.$/, '')}
            <span>.</span>
          </a>
          <nav className="nav__links" aria-label="Основное меню">
            <a href="#works">Работы</a>
            <a href="#software">Программы</a>
            <a href="#services">Услуги</a>
            <a href="#about">Обо мне</a>
          </nav>
          <div className="nav__actions">
            <button
              className="menu-btn"
              type="button"
              aria-label="Меню"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="menu-btn__bars" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              MENU
            </button>
            <button className="hire-btn" type="button" onClick={() => setContactOpen(true)}>
              Написать
              <span className="hire-btn__dot" aria-hidden>
                ✉
              </span>
            </button>
          </div>
        </div>
        <div className={`shell mobile-menu ${menuOpen ? 'open' : ''}`}>
          <a href="#works" onClick={() => setMenuOpen(false)}>
            Работы
          </a>
          <a href="#software" onClick={() => setMenuOpen(false)}>
            Программы
          </a>
          <a href="#services" onClick={() => setMenuOpen(false)}>
            Услуги
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            Обо мне
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero shell">
          <div className="hero__frame">
            <div className="hero__grid">
              <div className="hero__copy rise">
                <span className="eyebrow">Video Editing Portfolio</span>
                <h1>
                  Монтаж, который{' '}
                  <span className="mark">цепляет</span>
                </h1>
                <p className="hero__text">
                  {profile?.tagline ||
                    'Реклама, клипы, Reels и цветкор — чисто, быстро, с характером.'}
                </p>
                <div className="hero__cta">
                  <a className="btn btn--ink" href="#works">
                    Смотреть работы
                    <span className="btn__arrow">→</span>
                  </a>
                  <button className="btn btn--ghost" type="button" onClick={() => setContactOpen(true)}>
                    Связаться
                  </button>
                </div>
              </div>
              <div className="hero__visual rise rise-2" aria-hidden>
                <div className="hero__visual-mask">
                  {(profile?.brand || 'CUT.').replace(/\.$/, '')}
                </div>
                <div className="star star--1" />
                <div className="star star--2" />
                <div className="hero__visual-card">
                  <strong>{profile?.name || 'Editor'}</strong>
                  <span>{profile?.role || 'Video Editor'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="soft-strip shell" id="software">
          <div className="soft-strip__inner rise rise-3">
            <span className="soft-strip__label">Софт</span>
            <div className="soft-list">
              {(data?.software || []).map((item) => (
                <a
                  key={item.id}
                  className="soft-chip"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="soft-chip__badge" style={{ color: item.color }}>
                    {item.short}
                  </span>
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section shell" id="works">
          <div className="section__head">
            <h2>Коллекция работ</h2>
            <p>Выбери вкладку и смотри ролики по направлению.</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Категории">
            {categories.map((cat) => {
              const count =
                cat === 'Все'
                  ? data?.projects.length || 0
                  : (data?.projects || []).filter((p) => p.category === cat).length
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={filter === cat}
                  className={`tab ${filter === cat ? 'is-active' : ''}`}
                  onClick={() => setFilter(cat)}
                >
                  <span>{cat}</span>
                  <em>{count}</em>
                </button>
              )
            })}
          </div>

          {error ? <p className="error">{error}</p> : null}

          {!error && projects.length === 0 ? (
            <div className="empty">
              {filter === 'Все'
                ? 'Скоро здесь появятся новые работы.'
                : `Во вкладке «${filter}» пока нет роликов.`}
            </div>
          ) : (
            <div className="bento">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onOpen={setActive} />
              ))}
            </div>
          )}
        </section>

        {active ? (
          <div className="viewer" role="dialog" aria-modal="true" onClick={() => setActive(null)}>
            <div className="viewer__panel" onClick={(e) => e.stopPropagation()}>
              <div className="viewer__top">
                <div>
                  <h3>{active.title}</h3>
                  <p>{active.description}</p>
                </div>
                <button className="btn btn--ghost" type="button" onClick={() => setActive(null)}>
                  Закрыть
                </button>
              </div>
              {active.mediaType === 'video' && active.mediaUrl ? (
                <video className="viewer__media" src={mediaSrc(active.mediaUrl)} controls autoPlay playsInline />
              ) : active.mediaUrl ? (
                <img className="viewer__media" src={mediaSrc(active.mediaUrl)} alt={active.title} />
              ) : null}
              {active.link ? (
                <a className="btn btn--ink" href={active.link} target="_blank" rel="noreferrer">
                  Открыть ссылку
                  <span className="btn__arrow">→</span>
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="section shell" id="services">
          <div className="services">
            <h2>Что ты получаешь</h2>
            <div className="services__grid">
              {SERVICES.map((s) => (
                <article key={s.num} className="service">
                  <div className="service__num">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section shell" id="about">
          <div className="about-panel">
            <article className="about-card">
              <h2>Обо мне</h2>
              <p>{profile?.bio}</p>
              <div className="socials">
                {contacts.map((c) => (
                  <a key={c.id} href={c.href} target="_blank" rel="noreferrer">
                    {c.label}
                  </a>
                ))}
              </div>
            </article>
            <article className="contact-card">
              <h2>Есть проект?</h2>
              <p>Напиши — обсудим задачу, сроки и формат. Отвечаю быстро.</p>
              <button className="btn" type="button" onClick={() => setContactOpen(true)}>
                Написать мне
                <span className="btn__arrow">→</span>
              </button>
            </article>
          </div>
        </section>
      </main>

      {contactOpen ? (
        <div className="contact-sheet" role="dialog" aria-modal="true" onClick={() => setContactOpen(false)}>
          <div className="contact-sheet__panel" onClick={(e) => e.stopPropagation()}>
            <div className="contact-sheet__head">
              <div>
                <h3>Связаться с {profile?.name || 'автором'}</h3>
                <p>Выбери удобный способ</p>
              </div>
              <button className="btn btn--ghost" type="button" onClick={() => setContactOpen(false)}>
                Закрыть
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="empty">Контакты пока не указаны.</p>
            ) : (
              <div className="contact-sheet__list">
                {contacts.map((c) => (
                  <a
                    key={c.id}
                    className={`contact-option contact-option--${c.id}`}
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setContactOpen(false)}
                  >
                    <strong>{c.label}</strong>
                    <span>{c.hint}</span>
                    <em aria-hidden>→</em>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <footer className="shell footer">
        <span>
          © {new Date().getFullYear()} {profile?.brand || 'CUT.'} — {profile?.name}
        </span>
      </footer>
    </div>
  )
}
