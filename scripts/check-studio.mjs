import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'
import { unzipSync, strFromU8 } from 'fflate'
import ts from 'typescript'

// Use Vite's own module loader so tests exercise the app's actual TS and raw imports.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
})
let temporaryDirectory
try {
  const model = await server.ssrLoadModule('/site/studio-model.ts')
  const catalog = await server.ssrLoadModule('/site/mascots.ts')
  const exports = await server.ssrLoadModule('/site/studio-export.ts')

  assert.equal(new Set(catalog.MASCOTS).size, catalog.MASCOTS.length)
  for (const character of new Set([
    ...catalog.MASCOTS,
    ...catalog.STYLES.map((style) => style.character),
  ])) {
    for (const suffix of ['directions', 'reactions']) {
      const asset = await stat(`public/mascots/${character}-${suffix}.webp`)
      assert.ok(asset.size > 100, `Missing or empty artwork: ${character}-${suffix}`)
    }
  }
  console.log('✓ All catalog characters and styles have both sprite sheets.')

  assert.throws(() => model.normalizeDesign({ character: '../../bad' }))
  assert.throws(() =>
    model.normalizeDesign({
      ...model.DEFAULT_DESIGN,
      custom: { directions: 'https://example.com/image.png', reactions: 'javascript:alert(1)' },
    }),
  )
  const normalized = model.normalizeDesign({
    ...model.DEFAULT_DESIGN,
    size: 99999,
    background: 'url(https://example.com)',
    expression: 'unknown',
  })
  assert.equal(normalized.size, 360)
  assert.equal(normalized.background, model.DEFAULT_DESIGN.background)
  assert.equal(normalized.expression, null)
  assert.equal(
    model.normalizeDesign({ ...model.DEFAULT_DESIGN, character: 'cat', style: 'riso' }).style,
    'colour',
  )
  globalThis.localStorage = { getItem: () => '{corrupt' }
  assert.deepEqual(model.loadDraft(), model.DEFAULT_DESIGN)
  assert.deepEqual(model.loadCollection(), [])
  console.log('✓ Corrupt storage and untrusted imports recover safely.')

  const design = {
    ...model.DEFAULT_DESIGN,
    name: 'A "quoted" <mascot> & friend',
    style: 'riso',
    expression: 'heart',
    flip: true,
    tracking: false,
    size: 320,
    background: '#e6e2f1',
  }
  assert.deepEqual(model.normalizeDesign(JSON.parse(JSON.stringify(design))), design)
  let downloadedBlob
  let downloadedName
  const anchor = {
    click() {
      downloadedName = this.download
    },
    remove() {},
  }
  globalThis.document = { createElement: () => anchor, body: { append() {} } }
  globalThis.window = {
    setTimeout: (callback) => {
      callback()
      return 1
    },
  }
  URL.createObjectURL = (blob) => {
    downloadedBlob = blob
    return 'blob:test-download'
  }
  URL.revokeObjectURL = () => {}
  globalThis.fetch = async (url) =>
    new Response(await readFile(path.join('public', url.replace(/^\//, ''))))
  await exports.exportKit(design)
  const files = unzipSync(new Uint8Array(await downloadedBlob.arrayBuffer()))
  assert.equal(downloadedName, 'a-quoted-mascot-friend-react-kit.zip')
  assert.equal(Object.keys(files).length, 7)
  assert.deepEqual(
    model.normalizeDesign(JSON.parse(strFromU8(files['design.mascot.json']))),
    design,
  )
  assert.deepEqual(
    Buffer.from(files['public/mascots/a-quoted-mascot-friend-directions.webp']),
    await readFile('public/mascots/fox-riso-directions.webp'),
  )
  assert.match(strFromU8(files.LICENSE), /Kamran Ahmed/)

  // Compile the actual downloadable source with a name that requires escaping.
  temporaryDirectory = await mkdtemp(path.resolve('node_modules/.studio-kit-test-'))
  for (const name of ['Mascot.tsx', 'MyMascot.tsx'])
    await writeFile(path.join(temporaryDirectory, name), files[name])
  const program = ts.createProgram(
    ['Mascot.tsx', 'MyMascot.tsx'].map((name) => path.join(temporaryDirectory, name)),
    {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
    },
  )
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
      getCanonicalFileName: (name) => name,
    }),
  )
  console.log(
    '✓ Exported React ZIP preserves settings/assets/license and compiles with escaped names.',
  )
} finally {
  await server.close()
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
}
