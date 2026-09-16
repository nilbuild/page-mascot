import type { Reaction } from '../src/mascot'
import { MASCOTS, STYLES, sheets, type MascotName } from './mascots'

export type Category = 'All' | 'Animals' | 'People' | 'Robots'
export type Design = {
  name: string
  character: MascotName
  style: string
  size: number
  background: string
  tracking: boolean
  interactive: boolean
  flip: boolean
  expression: Reaction | null
  custom?: { directions: string; reactions: string }
}
export type SavedDesign = { id: string; updatedAt: number; design: Design }
export const STORAGE_KEY = 'mascot-studio:draft:v1'
export const COLLECTION_KEY = 'mascot-studio:collection:v1'
export const DEFAULT_DESIGN: Design = {
  name: 'My little fox',
  character: 'fox',
  style: 'colour',
  size: 280,
  background: '#f1f2e9',
  tracking: true,
  interactive: true,
  flip: false,
  expression: null,
}
export const BACKGROUNDS = [
  { value: '#f1f2e9', label: 'Oat' },
  { value: '#e2ecdf', label: 'Sage' },
  { value: '#f6e1d6', label: 'Peach' },
  { value: '#e6e2f1', label: 'Lilac' },
  { value: '#dfeaf3', label: 'Sky' },
  { value: 'transparent', label: 'Transparent' },
]
export const EXPRESSIONS: { value: Reaction | null; label: string; symbol: string }[] = [
  { value: null, label: 'Live', symbol: '↗' },
  { value: 'heart', label: 'Love', symbol: '♡' },
  { value: 'sparkle', label: 'Starry', symbol: '✧' },
  { value: 'wink', label: 'Wink', symbol: '◡' },
  { value: 'delighted', label: 'Happy', symbol: '☺' },
  { value: 'bashful', label: 'Shy', symbol: '◠' },
  { value: 'surprised', label: 'Surprise', symbol: '!' },
  { value: 'sleepy', label: 'Sleepy', symbol: 'z' },
  { value: 'dizzy', label: 'Dizzy', symbol: '◎' },
  { value: 'blink', label: 'Blink', symbol: '−' },
]
export const REACTION_ORDER: Reaction[] = [
  'blink',
  'heart',
  'sparkle',
  'surprised',
  'wink',
  'bashful',
  'sleepy',
  'dizzy',
  'delighted',
]
export function titleCase(value: string) {
  const names: Record<string, string> = {
    redpanda: 'Red panda',
    gearbot: 'Gear bot',
    postbot: 'Post bot',
    crt: 'CRT bot',
    tv: 'TV bot',
  }
  return names[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}
export function categoryOf(character: MascotName): Category {
  const index = MASCOTS.indexOf(character)
  return index < 21 ? 'Animals' : index < 40 ? 'People' : 'Robots'
}
export function assetCharacter(design: Design) {
  return design.character === 'fox'
    ? (STYLES.find((style) => style.name === design.style)?.character ?? 'fox')
    : design.character
}
export function designSheets(design: Design) {
  return design.custom ?? sheets(assetCharacter(design))
}
export function fileStem(design: Design) {
  return (
    design.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'my-mascot'
  )
}
export function normalizeDesign(value: unknown): Design {
  if (!value || typeof value !== 'object')
    throw new Error('This file does not contain a mascot design.')
  const data = value as Record<string, unknown>
  if (!MASCOTS.includes(data.character as MascotName)) throw new Error('Unknown mascot character.')
  const character = data.character as MascotName
  const custom = data.custom as Record<string, unknown> | undefined
  if (
    custom &&
    !['directions', 'reactions'].every(
      (key) =>
        typeof custom[key] === 'string' &&
        custom[key].length <= 2_800_000 &&
        /^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(custom[key]),
    )
  ) {
    throw new Error('Custom sheets must be PNG or WebP images, up to 2 MB each.')
  }
  return {
    name: typeof data.name === 'string' ? data.name.slice(0, 48) : 'My mascot',
    character,
    style:
      character === 'fox' && STYLES.some((style) => style.name === data.style)
        ? String(data.style)
        : 'colour',
    size:
      typeof data.size === 'number' && Number.isFinite(data.size)
        ? Math.min(360, Math.max(120, Math.round(data.size)))
        : 280,
    background:
      typeof data.background === 'string' && /^(#[0-9a-fA-F]{6}|transparent)$/.test(data.background)
        ? data.background
        : DEFAULT_DESIGN.background,
    tracking: typeof data.tracking === 'boolean' ? data.tracking : true,
    interactive: typeof data.interactive === 'boolean' ? data.interactive : true,
    flip: data.flip === true,
    expression: REACTION_ORDER.includes(data.expression as Reaction)
      ? (data.expression as Reaction)
      : null,
    ...(custom
      ? { custom: { directions: String(custom.directions), reactions: String(custom.reactions) } }
      : {}),
  }
}
export function loadDraft(): Design {
  try {
    return normalizeDesign(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return { ...DEFAULT_DESIGN }
  }
}
export function loadCollection(): SavedDesign[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(COLLECTION_KEY) ?? '[]')
    if (!Array.isArray(items)) return []
    return items.slice(0, 24).flatMap((item) => {
      try {
        if (!item || typeof item.id !== 'string' || typeof item.updatedAt !== 'number') return []
        return [{ id: item.id, updatedAt: item.updatedAt, design: normalizeDesign(item.design) }]
      } catch {
        return []
      }
    })
  } catch {
    return []
  }
}
