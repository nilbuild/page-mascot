import { strToU8, zipSync } from 'fflate'
import componentSource from '../src/mascot.tsx?raw'
import license from '../LICENSE?raw'
import { designSheets, fileStem, REACTION_ORDER, type Design } from './studio-model'

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the mascot image. Please try again.'))
    image.src = url
  })
}
export async function readSheet(file: File): Promise<string> {
  if (!['image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a PNG or WebP sprite sheet.')
  if (file.size > 2_000_000) throw new Error('Each sprite sheet must be smaller than 2 MB.')
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.readAsDataURL(file)
  })
  await validateSheet(url)
  return url
}
export async function validateSheet(url: string) {
  const image = await loadImage(url)
  if (
    image.width !== image.height ||
    image.width % 3 !== 0 ||
    image.width < 96 ||
    image.width > 4096
  ) {
    throw new Error('Use a square 3 × 3 sheet, 96–4096 px wide, with a width divisible by 3.')
  }
  return image
}
export async function exportPng(design: Design, resolution: number, transparent: boolean) {
  const sources = designSheets(design)
  const image = await loadImage(design.expression ? sources.reactions : sources.directions)
  const cell = design.expression ? REACTION_ORDER.indexOf(design.expression) : 4
  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image export is not available in this browser.')
  if (!transparent && design.background !== 'transparent') {
    context.fillStyle = design.background
    context.fillRect(0, 0, resolution, resolution)
  }
  const size = (resolution * design.size) / 480
  const padding = (resolution - size) / 2
  if (design.flip) {
    context.translate(resolution, 0)
    context.scale(-1, 1)
  }
  context.imageSmoothingEnabled = design.style !== 'pixel'
  context.drawImage(
    image,
    ((cell % 3) * image.width) / 3,
    (Math.floor(cell / 3) * image.height) / 3,
    image.width / 3,
    image.height / 3,
    padding,
    padding,
    size,
    size,
  )
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Could not create the PNG.'))),
      'image/png',
    ),
  )
  download(blob, `${fileStem(design)}-${resolution}.png`)
}
function extension(url: string) {
  return url.startsWith('data:image/png;') ? 'png' : 'webp'
}
export function reactSnippet(design: Design) {
  const sources = designSheets(design)
  return `import { Mascot } from './Mascot'\n\nexport default function MyMascot() {\n  return (\n    <div style={{\n      width: 480, height: 480, display: 'grid', placeItems: 'center',\n      background: ${JSON.stringify(design.background)},\n    }}>\n      <div style={{ imageRendering: '${design.style === 'pixel' ? 'pixelated' : 'auto'}' }}>\n        <Mascot\n          directions="/mascots/${fileStem(design)}-directions.${extension(sources.directions)}"\n          reactions="/mascots/${fileStem(design)}-reactions.${extension(sources.reactions)}"\n          label={${JSON.stringify(design.name || 'My mascot')}}\n          size={${design.size}}\n          tracking={${design.tracking}}\n          flip={${design.flip}}\n          interactive={${design.interactive}}\n          expression={${JSON.stringify(design.expression)}}\n        />\n      </div>\n    </div>\n  )\n}\n`
}
export async function exportKit(design: Design) {
  const sources = designSheets(design)
  const images = await Promise.all(
    [sources.directions, sources.reactions].map(async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Could not load the sprite sheets. Please try again.')
      return new Uint8Array(await response.arrayBuffer())
    }),
  )
  const name = fileStem(design)
  const files = {
    'Mascot.tsx': strToU8(componentSource),
    'MyMascot.tsx': strToU8(reactSnippet(design)),
    [`public/mascots/${name}-directions.${extension(sources.directions)}`]: images[0],
    [`public/mascots/${name}-reactions.${extension(sources.reactions)}`]: images[1],
    'design.mascot.json': strToU8(JSON.stringify({ version: 1, ...design }, null, 2)),
    LICENSE: strToU8(license),
    'README.md': strToU8(
      `# ${design.name || 'My mascot'}\n\nExported from Mascot Studio.\n\n1. Copy Mascot.tsx and MyMascot.tsx into your React 18+ project.\n2. Copy public/mascots into your public directory.\n3. Render <MyMascot />. No animation or CSS library is needed.\n\nThe snippet assumes your app is served at /. Adjust the two asset paths for subdirectory deployments.\n\nReopen design.mascot.json using Import design in Mascot Studio.\nPNG export uses a front-facing pose in Live mode; interactive tracking and click reactions are preserved in this React kit.\n\nThe component and built-in artwork are based on page-mascot by Kamran Ahmed, MIT licensed. Keep LICENSE with redistributed copies. Custom artwork remains subject to its owner's terms.\n`,
    ),
  }
  const archive = zipSync(files, { level: 0 })
  download(
    new Blob([new Uint8Array(archive)], { type: 'application/zip' }),
    `${name}-react-kit.zip`,
  )
}
