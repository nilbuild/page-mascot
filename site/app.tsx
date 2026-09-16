import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Mascot } from '../src/mascot'
import { MASCOTS, STYLES, sheets, type MascotName } from './mascots'
import { Icon } from './icons'
import {
  BACKGROUNDS,
  COLLECTION_KEY,
  DEFAULT_DESIGN,
  EXPRESSIONS,
  REACTION_ORDER,
  STORAGE_KEY,
  categoryOf,
  designSheets,
  fileStem,
  loadCollection,
  loadDraft,
  normalizeDesign,
  titleCase,
  type Category,
  type Design,
  type SavedDesign,
} from './studio-model'
import {
  download,
  exportKit,
  exportPng,
  loadImage,
  reactSnippet,
  readSheet,
  validateSheet,
} from './studio-export'

type ModalName = 'export' | 'collection' | 'upload' | 'help' | null

function Sprite({
  source,
  cell = 4,
  className = '',
  style,
}: {
  source: string
  cell?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      aria-hidden="true"
      className={`sprite ${className}`}
      style={{
        backgroundImage: `url(${source})`,
        backgroundPosition: `${(cell % 3) * 50}% ${Math.floor(cell / 3) * 50}%`,
        ...style,
      }}
    />
  )
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-labelledby="modal-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose()
        }
      }}
    >
      <header className="modal-heading">
        <div>
          <p className="eyebrow">MASCOT STUDIO</p>
          <h2 id="modal-title">{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  )
}
function Toggle({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div className="toggle-row">
      <div>
        <span>{title}</span>
        <small>{description}</small>
      </div>
      <button
        className="toggle"
        role="switch"
        aria-label={title}
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  )
}
function App() {
  const [design, setDesign] = useState<Design>(loadDraft)
  const [past, setPast] = useState<Design[]>([])
  const [future, setFuture] = useState<Design[]>([])
  const [collection, setCollection] = useState<SavedDesign[]>(loadCollection)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('All')
  const [modal, setModal] = useState<ModalName>(null)
  const [toast, setToast] = useState('')
  const [storageOK, setStorageOK] = useState(true)
  const importRef = useRef<HTMLInputElement>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [loadedAssets, setLoadedAssets] = useState<{
    directions: string
    reactions: string
    status: 'ready' | 'error'
  } | null>(null)
  const sources = designSheets(design)
  const { directions, reactions } = sources
  const assetState =
    loadedAssets?.directions === sources.directions && loadedAssets.reactions === sources.reactions
      ? loadedAssets.status
      : 'loading'
  const displayName = design.custom ? 'Custom character' : titleCase(design.character)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(design))
        setStorageOK(true)
      } catch {
        setStorageOK(false)
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [design])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    let stale = false
    Promise.all([loadImage(directions), loadImage(reactions)]).then(
      () => {
        if (!stale) setLoadedAssets({ directions, reactions, status: 'ready' })
      },
      () => {
        if (!stale) setLoadedAssets({ directions, reactions, status: 'error' })
      },
    )
    return () => {
      stale = true
    }
  }, [directions, reactions])

  function replaceDesign(next: Design) {
    setPast((items) => [...items.slice(-39), design])
    setFuture([])
    setDesign(next)
  }
  function update(patch: Partial<Design>) {
    replaceDesign({ ...design, ...patch })
  }
  function pick(character: MascotName) {
    update({
      character,
      style: 'colour',
      custom: undefined,
      name: `My little ${titleCase(character).toLowerCase()}`,
    })
    setActiveId(null)
  }
  function undo() {
    const previous = past.at(-1)
    if (!previous) return
    setPast(past.slice(0, -1))
    setFuture([design, ...future])
    setDesign(previous)
  }
  function redo() {
    const next = future[0]
    if (!next) return
    setPast([...past, design])
    setFuture(future.slice(1))
    setDesign(next)
  }
  function persistCollection(items: SavedDesign[]) {
    try {
      localStorage.setItem(COLLECTION_KEY, JSON.stringify(items))
      setCollection(items)
      return true
    } catch {
      setToast('Browser storage is full or unavailable. Export a design file to keep your work.')
      return false
    }
  }
  function saveDesign() {
    if (!activeId && collection.length >= 24) {
      setToast('Your collection holds 24 designs. Remove one to make room.')
      return
    }
    const id = activeId ?? crypto.randomUUID()
    const entry = {
      id,
      updatedAt: Date.now(),
      design: { ...design, name: design.name.trim() || 'My mascot' },
    }
    const next = [entry, ...collection.filter((item) => item.id !== id)]
    if (persistCollection(next)) {
      setActiveId(id)
      setToast('Design saved to your collection.')
    }
  }
  async function importDesign(file: File) {
    setImportBusy(true)
    try {
      if (file.size > 6_000_000) throw new Error('Choose a design file smaller than 6 MB.')
      let parsed: unknown
      try {
        parsed = JSON.parse(await file.text())
      } catch {
        throw new Error('This is not a valid JSON design file.')
      }
      const next = normalizeDesign(parsed)
      if (next.custom) {
        const [d, r] = await Promise.all([
          validateSheet(next.custom.directions),
          validateSheet(next.custom.reactions),
        ])
        if (d.width !== r.width)
          throw new Error('Both sprite sheets must have the same dimensions.')
      }
      replaceDesign(next)
      setActiveId(null)
      setToast('Design imported. Make it yours!')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not import this design.')
    } finally {
      setImportBusy(false)
    }
  }
  const filtered = MASCOTS.filter(
    (character) =>
      (category === 'All' || categoryOf(character) === category) &&
      titleCase(character).toLowerCase().includes(query.toLowerCase().trim()),
  )

  return (
    <div className="studio-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Mascot Studio home">
          <img src={`${import.meta.env.BASE_URL}studio.svg`} width="36" height="36" alt="" />
          <span>
            mascot<span className="brand-light">studio</span>
            <span className="brand-dot">.</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button className="nav-link active" onClick={() => setModal(null)}>
            <Icon name="grid" size={16} /> Studio
          </button>
          <button className="nav-link" onClick={() => setModal('collection')}>
            <Icon name="folder" size={17} /> My collection{' '}
            <span className="count">{collection.length}</span>
          </button>
        </nav>
        <div className="topbar-right">
          <span className="local-note">
            <span className="status-dot" /> A little space to create
          </span>
          <button
            className="icon-button help-button"
            onClick={() => setModal('help')}
            aria-label="How it works"
          >
            <Icon name="help" size={20} />
          </button>
        </div>
      </header>

      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span className="tiny-star">✳</span> SMALL CHARACTER. BIG PERSONALITY.
            </div>
            <h1>
              Meet your next little sidekick<span>.</span>
            </h1>
            <p>Pick a character. Add your personality. Make it yours.</p>
          </div>
          <div className="intro-actions">
            <button className="button secondary" onClick={saveDesign}>
              <Icon name="save" /> {activeId ? 'Save changes' : 'Save design'}
            </button>
            <button className="button primary" onClick={() => setModal('export')}>
              <Icon name="download" /> Export mascot <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>

        <div className="workspace">
          <aside className="library panel" aria-label="Character library">
            <div className="panel-title">
              <h2>
                Characters <span className="count">{MASCOTS.length}</span>
              </h2>
              <span className="step-number">01</span>
            </div>
            <div className="library-search">
              <Icon name="search" size={17} />
              <input
                aria-label="Search characters"
                placeholder="Find your character…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  aria-label="Clear search"
                  className="icon-button small"
                  onClick={() => setQuery('')}
                >
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>
            <div className="category-tabs" aria-label="Character categories">
              {(['All', 'Animals', 'People', 'Robots'] as Category[]).map((item) => (
                <button
                  key={item}
                  aria-pressed={category === item}
                  className={category === item ? 'selected' : ''}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="character-scroll">
              <div className="character-grid">
                {filtered.map((character) => (
                  <button
                    key={character}
                    className={`character-card ${!design.custom && design.character === character ? 'selected' : ''}`}
                    onClick={() => pick(character)}
                    aria-label={`Choose ${titleCase(character)}`}
                    aria-pressed={!design.custom && design.character === character}
                  >
                    {!design.custom && design.character === character && (
                      <span className="card-check">
                        <Icon name="check" size={10} />
                      </span>
                    )}
                    <Sprite source={sheets(character).directions} />
                    <span>{titleCase(character)}</span>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-search">
                  <Icon name="search" size={27} />
                  <h3>No little faces found</h3>
                  <p>Try another name or category.</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setQuery('')
                      setCategory('All')
                    }}
                  >
                    Show all characters
                  </button>
                </div>
              )}
            </div>
            <div className="library-bottom">
              <button className="upload-callout" onClick={() => setModal('upload')}>
                <span className="upload-icon">
                  <Icon name="plus" size={20} />
                </span>
                <span>
                  <strong>Bring your own character</strong>
                  <small>Upload your sprite sheets</small>
                </span>
                <Icon name="chevron" size={15} />
              </button>
              <button
                className="import-link"
                onClick={() => importRef.current?.click()}
                disabled={importBusy}
              >
                <Icon name="upload" size={13} />
                {importBusy ? 'Importing…' : 'Import a saved design'}
              </button>
            </div>
          </aside>

          <section className="preview-column" aria-label="Mascot preview">
            <div className="canvas-toolbar">
              <div className="design-title">
                <span className="design-indicator" />
                <input
                  aria-label="Design name"
                  maxLength={48}
                  value={design.name}
                  placeholder="Name your mascot"
                  onChange={(event) => update({ name: event.target.value })}
                />
              </div>
              <div className="toolbar-actions">
                <button
                  className="icon-button"
                  aria-label="Undo"
                  disabled={!past.length}
                  onClick={undo}
                >
                  <Icon name="undo" size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Redo"
                  disabled={!future.length}
                  onClick={redo}
                >
                  <Icon name="undo" size={16} style={{ transform: 'scaleX(-1)' }} />
                </button>
                <span className="toolbar-divider" />
                <button
                  className="icon-button"
                  aria-label="Reset design"
                  onClick={() => {
                    replaceDesign({ ...DEFAULT_DESIGN })
                    setActiveId(null)
                  }}
                >
                  <Icon name="sun" size={18} />
                </button>
              </div>
            </div>
            <div
              className={`stage ${design.background === 'transparent' ? 'checkerboard' : ''}`}
              style={{ backgroundColor: design.background }}
            >
              <span className="stage-badge">
                <span className={`status-dot ${design.expression ? 'paused' : ''}`} />
                {design.expression
                  ? `${EXPRESSIONS.find((item) => item.value === design.expression)?.label} expression`
                  : 'LIVE PREVIEW'}
              </span>
              <span className="stage-caption">MADE TO MAKE YOU SMILE</span>
              <div className="artboard">
                <span className="corner top-left">+</span>
                <span className="corner top-right">+</span>
                <span className="corner bottom-left">+</span>
                <span className="corner bottom-right">+</span>
                <div
                  className="mascot-wrapper"
                  style={{
                    width: `${(design.size / 480) * 100}%`,
                    aspectRatio: '1',
                    imageRendering: design.style === 'pixel' ? 'pixelated' : 'auto',
                  }}
                >
                  {assetState === 'ready' && (
                    <Mascot
                      key={`${sources.directions}-${design.tracking}-${design.flip}`}
                      {...sources}
                      size={design.size}
                      label={design.name || displayName}
                      tracking={design.tracking}
                      interactive={design.interactive}
                      expression={design.expression}
                      flip={design.flip}
                      className="studio-mascot"
                    />
                  )}
                </div>
                {assetState !== 'ready' && (
                  <div className="asset-message" role="status">
                    {assetState === 'error'
                      ? 'This character could not load. Select another or reload the page.'
                      : 'Your sidekick is on the way…'}
                  </div>
                )}
              </div>
              <div className="stage-hint">
                <Icon name={design.expression ? 'image' : 'cursor'} size={15} />
                <span>
                  {design.expression
                    ? 'A little mood, a lot of character.'
                    : design.tracking
                      ? 'Move your cursor. Click for a little surprise.'
                      : design.interactive
                        ? 'Give your little sidekick a click.'
                        : 'Just a little moment of stillness.'}
                </span>
              </div>
              <div className="stage-foot">
                <span>480 × 480 canvas</span>
                <button
                  onClick={() => update({ flip: !design.flip })}
                  aria-pressed={design.flip}
                  aria-label="Flip mascot horizontally"
                >
                  <Icon name="flip" size={15} /> Flip
                </button>
              </div>
            </div>
            <div className="expression-panel">
              <div className="expression-title">
                <h3>A mood for every moment</h3>
                <span>Try an expression</span>
              </div>
              <div className="expression-list">
                {EXPRESSIONS.map((item) => (
                  <button
                    key={item.label}
                    aria-pressed={design.expression === item.value}
                    className={`expression ${design.expression === item.value ? 'selected' : ''}`}
                    onClick={() => update({ expression: item.value })}
                    title={item.label}
                  >
                    {item.value ? (
                      <Sprite
                        source={sources.reactions}
                        cell={REACTION_ORDER.indexOf(item.value)}
                      />
                    ) : (
                      <span className="live-icon">
                        <Icon name="cursor" size={19} />
                      </span>
                    )}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="preview-meta">
              <span>
                <span className="status-dot" />
                {storageOK ? 'Draft saved on this device' : 'Draft not saved — export to keep it'}
              </span>
              <button
                className="text-button"
                onClick={() => {
                  const pool = MASCOTS.filter((item) => item !== design.character)
                  pick(pool[Math.floor(Math.random() * pool.length)])
                }}
              >
                <Icon name="shuffle" size={14} /> Surprise me
              </button>
            </div>
          </section>

          <aside className="settings panel" aria-label="Customize mascot">
            <div className="panel-title">
              <h2>Make it yours</h2>
              <span className="step-number">02</span>
            </div>
            <div className="selected-character">
              <div className="selected-avatar">
                <Sprite source={sources.directions} />
              </div>
              <div>
                <h3>{displayName}</h3>
                <span>
                  {design.custom
                    ? 'Your original artwork'
                    : `${categoryOf(design.character)} collection`}
                </span>
              </div>
              <span className="available-dot" />
            </div>
            <section className="setting-section">
              <div className="setting-label">
                <h3>Art style</h3>
                <span>
                  {design.character === 'fox' && !design.custom ? '6 styles' : 'Original'}
                </span>
              </div>
              {design.character === 'fox' && !design.custom ? (
                <div className="style-grid">
                  {STYLES.map((style) => (
                    <button
                      key={style.name}
                      className={`style-card ${design.style === style.name ? 'selected' : ''}`}
                      aria-pressed={design.style === style.name}
                      onClick={() => update({ style: style.name })}
                    >
                      <Sprite source={sheets(style.character).directions} />
                      <span>{style.name === 'colour' ? 'Original' : titleCase(style.name)}</span>
                      {design.style === style.name && (
                        <span className="style-check">
                          <Icon name="check" size={10} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="style-note">
                  <Icon name="image" />
                  <p>
                    This character comes in its original style.
                    <button className="text-button" onClick={() => pick('fox')}>
                      Try 6 styles with Fox <span>↗</span>
                    </button>
                  </p>
                </div>
              )}
            </section>
            <section className="setting-section">
              <div className="setting-label">
                <h3>Background</h3>
                <span>
                  {BACKGROUNDS.find((item) => item.value === design.background)?.label ?? 'Custom'}
                </span>
              </div>
              <div className="swatches">
                {BACKGROUNDS.map((color) => (
                  <button
                    key={color.value}
                    className={`swatch ${color.value === 'transparent' ? 'checkerboard' : ''} ${design.background === color.value ? 'selected' : ''}`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    aria-label={`${color.label} background`}
                    aria-pressed={design.background === color.value}
                    onClick={() => update({ background: color.value })}
                  >
                    {design.background === color.value && <Icon name="check" size={14} />}
                  </button>
                ))}
                <label className="custom-color" title="Custom background color">
                  <Icon name="plus" size={16} />
                  <input
                    aria-label="Custom background color"
                    type="color"
                    value={design.background === 'transparent' ? '#ffffff' : design.background}
                    onChange={(event) => update({ background: event.target.value })}
                  />
                </label>
              </div>
            </section>
            <section className="setting-section size-section">
              <div className="setting-label">
                <label htmlFor="mascot-size">Character size</label>
                <output htmlFor="mascot-size">
                  {design.size}
                  <span> px</span>
                </output>
              </div>
              <input
                id="mascot-size"
                type="range"
                min="120"
                max="360"
                step="4"
                value={design.size}
                onChange={(event) => update({ size: Number(event.target.value) })}
                style={
                  { '--range-progress': `${((design.size - 120) / 240) * 100}%` } as CSSProperties
                }
              />
              <div className="range-labels">
                <span>A little smaller</span>
                <span>A little bigger</span>
              </div>
            </section>
            <section className="setting-section interactions">
              <div className="setting-label">
                <h3>Give it some life</h3>
                <Icon name="cursor" size={16} />
              </div>
              <Toggle
                title="Follow the cursor"
                description="A curious little companion"
                checked={design.tracking}
                disabled={!!design.expression}
                onChange={() => update({ tracking: !design.tracking })}
              />
              <Toggle
                title="React on click"
                description="Go on, give it a boop"
                checked={design.interactive}
                disabled={!!design.expression}
                onChange={() => update({ interactive: !design.interactive })}
              />
              {design.expression && (
                <button
                  className="text-button return-live"
                  onClick={() => update({ expression: null })}
                >
                  Switch to Live to try interactions ↗
                </button>
              )}
            </section>
            <div className="little-tip">
              <span>✧</span>
              <p>
                A little detail goes a long way.
                <br />
                Made for your next big idea.
              </p>
            </div>
          </aside>
        </div>
        <footer className="page-footer">
          <span>
            Made with a little imagination <span className="footer-star">✳</span>
          </span>
          <span>Your characters. Your corner of the internet.</span>
          <button className="text-button" onClick={() => setModal('help')}>
            A little help <Icon name="arrow" size={13} />
          </button>
        </footer>
      </main>

      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void importDesign(file)
          event.target.value = ''
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast('')} aria-label="Dismiss notification">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {modal === 'export' && (
        <ExportModal design={design} onClose={() => setModal(null)} notify={setToast} />
      )}
      {modal === 'upload' && (
        <UploadModal
          onClose={() => setModal(null)}
          onUse={(custom, name) => {
            update({ custom, name, style: 'colour', expression: null })
            setActiveId(null)
            setModal(null)
            setToast('Your original character is ready to play.')
          }}
        />
      )}
      {modal === 'collection' && (
        <Modal
          title="Your little collection"
          subtitle="Saved here, on this browser. Export a design file to take it elsewhere."
          onClose={() => setModal(null)}
          wide
        >
          {!collection.length ? (
            <div className="empty-collection">
              <span className="empty-illustration">
                <Sprite source={sheets('fox').directions} />
              </span>
              <h3>A home for your little ideas.</h3>
              <p>Save your first design and it will be waiting for you here.</p>
              <button
                className="button primary"
                onClick={() => {
                  saveDesign()
                  setModal(null)
                }}
              >
                <Icon name="plus" /> Save this design
              </button>
            </div>
          ) : (
            <div className="collection-grid">
              {collection.map((item) => (
                <article className="saved-card" key={item.id}>
                  <button
                    className={`saved-preview ${item.design.background === 'transparent' ? 'checkerboard' : ''}`}
                    style={{ backgroundColor: item.design.background }}
                    aria-label={`Open ${item.design.name}`}
                    onClick={() => {
                      replaceDesign(item.design)
                      setActiveId(item.id)
                      setModal(null)
                    }}
                  >
                    <Sprite
                      source={
                        item.design.expression
                          ? designSheets(item.design).reactions
                          : designSheets(item.design).directions
                      }
                      cell={
                        item.design.expression ? REACTION_ORDER.indexOf(item.design.expression) : 4
                      }
                      style={{
                        width: `${(item.design.size / 480) * 100}%`,
                        height: 'auto',
                        aspectRatio: '1',
                        transform: `scaleX(${item.design.flip ? -1 : 1})`,
                      }}
                    />
                  </button>
                  <div className="saved-info">
                    <div>
                      <h3>{item.design.name || 'My mascot'}</h3>
                      <small>
                        {new Date(item.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${item.design.name}`}
                      onClick={() => {
                        if (persistCollection(collection.filter((saved) => saved.id !== item.id))) {
                          if (activeId === item.id) setActiveId(null)
                          setToast('Design removed from collection.')
                        }
                      }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}
      {modal === 'help' && (
        <Modal
          title="A little help getting started"
          subtitle="From a blank canvas to your new favorite sidekick."
          onClose={() => setModal(null)}
        >
          <div className="help-steps">
            <div>
              <b>01</b>
              <p>
                <strong>Find a familiar face</strong>Choose from {MASCOTS.length} characters, or
                upload your own pair of 3 × 3 sprite sheets. Six art styles are available for Fox.
              </p>
            </div>
            <div>
              <b>02</b>
              <p>
                <strong>Add a little personality</strong>Choose a background, size, and expression.
                In Live mode, move the cursor or click your mascot. Undo and redo let you
                experiment.
              </p>
            </div>
            <div>
              <b>03</b>
              <p>
                <strong>Send it into the world</strong>Export a PNG for an avatar, or a React kit
                with the interactive component and both sprite sheets. Save a JSON design to
                continue on another device.
              </p>
            </div>
          </div>
          <div className="info-box">
            Your draft and collection stay in this browser. This editor uses existing artwork and
            uploaded sprite sheets; it does not generate new artwork with AI.
          </div>
          <p className="credits">
            Built on{' '}
            <a href="https://github.com/nilbuild/page-mascot" target="_blank" rel="noreferrer">
              page-mascot
            </a>{' '}
            by Kamran Ahmed. Component and built-in artwork used under the MIT license.
          </p>
        </Modal>
      )}
    </div>
  )
}

function ExportModal({
  design,
  onClose,
  notify,
}: {
  design: Design
  onClose: () => void
  notify: (value: string) => void
}) {
  const [tab, setTab] = useState<'image' | 'react'>('image')
  const [resolution, setResolution] = useState(1024)
  const [transparent, setTransparent] = useState(design.background === 'transparent')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sources = designSheets(design)
  async function runExport() {
    setBusy(true)
    setError('')
    try {
      if (tab === 'image') await exportPng(design, resolution, transparent)
      else await exportKit(design)
      notify(tab === 'image' ? 'Your PNG download is ready.' : 'Your React kit download is ready.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Export failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Ready for the world."
      subtitle="A little character for wherever your ideas take you."
      onClose={onClose}
    >
      <div className="export-tabs">
        <button className={tab === 'image' ? 'selected' : ''} onClick={() => setTab('image')}>
          <Icon name="image" /> PNG image
        </button>
        <button className={tab === 'react' ? 'selected' : ''} onClick={() => setTab('react')}>
          <Icon name="code" /> React component
        </button>
      </div>
      {tab === 'image' ? (
        <>
          <div
            className={`export-preview ${transparent || design.background === 'transparent' ? 'checkerboard' : ''}`}
            style={{ backgroundColor: transparent ? 'transparent' : design.background }}
          >
            <Sprite
              source={design.expression ? sources.reactions : sources.directions}
              cell={design.expression ? REACTION_ORDER.indexOf(design.expression) : 4}
              style={{
                width: `${(design.size / 480) * 100}%`,
                height: 'auto',
                aspectRatio: '1',
                transform: `scaleX(${design.flip ? -1 : 1})`,
                imageRendering: design.style === 'pixel' ? 'pixelated' : 'auto',
              }}
            />
          </div>
          <div className="export-settings">
            <label htmlFor="resolution">Image size</label>
            <select
              id="resolution"
              value={resolution}
              onChange={(event) => setResolution(Number(event.target.value))}
            >
              <option value="512">512 × 512 px</option>
              <option value="1024">1024 × 1024 px</option>
              <option value="2048">2048 × 2048 px</option>
            </select>
          </div>
          <Toggle
            title="Transparent background"
            description="Ready to fit in anywhere"
            checked={transparent}
            onChange={() => setTransparent(!transparent)}
          />
          <p className="export-note">
            PNG captures your selected expression. Live mode exports a front-facing pose. Larger
            PNGs upscale the original artwork.
          </p>
        </>
      ) : (
        <>
          <div className="code-top">
            <span>MyMascot.tsx</span>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reactSnippet(design))
                  notify('Component code copied.')
                } catch {
                  setError('Clipboard unavailable. Download the kit to get the code.')
                }
              }}
            >
              <Icon name="copy" size={14} /> Copy code
            </button>
          </div>
          <pre className="code-preview">
            <code>{reactSnippet(design)}</code>
          </pre>
          <div className="info-box">
            <Icon name="check" size={16} /> Includes the React component, both sprite sheets, your
            design file, and setup instructions. Works with React 18+.
          </div>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary export-button"
        disabled={busy}
        onClick={() => void runExport()}
      >
        <Icon name="download" />
        {busy
          ? 'Preparing your download…'
          : tab === 'image'
            ? 'Download PNG'
            : 'Download React kit (.zip)'}
      </button>
      <button
        className="download-design text-button"
        onClick={() => {
          download(
            new Blob([JSON.stringify({ version: 1, ...design }, null, 2)], {
              type: 'application/json',
            }),
            `${fileStem(design)}.mascot.json`,
          )
          notify('Design file downloaded.')
        }}
      >
        <Icon name="save" size={14} /> Save editable design (.json)
      </button>
    </Modal>
  )
}

function UploadModal({
  onClose,
  onUse,
}: {
  onClose: () => void
  onUse: (custom: NonNullable<Design['custom']>, name: string) => void
}) {
  const [name, setName] = useState('My own character')
  const [directions, setDirections] = useState<File | null>(null)
  const [reactions, setReactions] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload() {
    if (!directions || !reactions) return
    setBusy(true)
    setError('')
    try {
      const [d, r] = await Promise.all([readSheet(directions), readSheet(reactions)])
      const [di, ri] = await Promise.all([loadImage(d), loadImage(r)])
      if (di.width !== ri.width)
        throw new Error('Both sprite sheets must have the same dimensions.')
      onUse({ directions: d, reactions: r }, name.trim() || 'My own character')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not import these images.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title="A character of your own."
      subtitle="Bring two matching sprite sheets. We’ll bring them to life."
      onClose={onClose}
    >
      <label className="field-label" htmlFor="custom-name">
        Character name
      </label>
      <input
        className="text-input"
        id="custom-name"
        maxLength={48}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="upload-fields">
        <label className="file-upload">
          <Icon name="cursor" size={26} />
          <strong>Direction sheet</strong>
          <span>{directions?.name ?? 'Choose PNG or WebP'}</span>
          <input
            aria-label="Direction sheet"
            type="file"
            accept="image/png,image/webp"
            onChange={(event) => setDirections(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="file-upload">
          <Icon name="sun" size={26} />
          <strong>Expression sheet</strong>
          <span>{reactions?.name ?? 'Choose PNG or WebP'}</span>
          <input
            aria-label="Expression sheet"
            type="file"
            accept="image/png,image/webp"
            onChange={(event) => setReactions(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <details className="sprite-guide">
        <summary>How should my sheets be arranged?</summary>
        <p>
          Use square, transparent 3 × 3 sheets with matching dimensions (96–4096 px, divisible by
          3), up to 2 MB each. Keep the character aligned in every cell.
        </p>
        <strong>Directions, left to right by row</strong>
        <div className="sheet-grid">
          {['↖', '↑', '↗', '←', 'Center', '→', '↙', '↓', '↘'].map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
        <strong>Expressions, left to right by row</strong>
        <div className="sheet-grid">
          {REACTION_ORDER.map((value) => (
            <span key={value}>{titleCase(value)}</span>
          ))}
        </div>
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary export-button"
        disabled={!directions || !reactions || busy}
        onClick={() => void upload()}
      >
        <Icon name="plus" />
        {busy ? 'Checking your character…' : 'Add to my canvas'}
      </button>
    </Modal>
  )
}

export default App
