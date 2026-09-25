import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { highlight, type Lang } from './highlight'

export type GuideKind = 'use' | 'make'

type Step = {
  title: string
  body: ReactNode
}

type GuideProps = {
  kind: GuideKind | null
  character: string
  onClose: () => void
}

function Snippet(props: { children: string; lang?: Lang }) {
  const { children, lang } = props
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = window.setTimeout(() => setCopied(false), 1600)

    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative mt-3">
      <pre className="rounded-xl bg-code py-3 pr-12 pl-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-on-code">
        <code>{highlight(children, lang ?? 'bash')}</code>
      </pre>

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy'}
        className="absolute top-2 right-2 rounded-lg px-2 py-1 font-mono text-[11px] text-on-code/40 transition-colors hover:bg-on-code/10 hover:text-on-code"
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  )
}

function stepsToUse(character: string): Step[] {
  return [
    {
      title: 'Install the component',
      body: <Snippet>npm i page-mascot</Snippet>,
    },
    {
      title: 'Download the two sheets',
      body: (
        <>
          <p className="mt-1 text-ink/55">
            A character is two files. Put both in{' '}
            <span className="font-mono text-ink/75">public/mascots</span>.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {['directions', 'reactions'].map((sheet) => (
              <a
                key={sheet}
                href={`${import.meta.env.BASE_URL}mascots/${character}-${sheet}.webp`}
                download
                className="rounded-xl border border-ink/15 px-4 py-2.5 font-mono text-[13px] text-ink/75 transition-colors hover:border-ink/40 hover:text-ink"
              >
                ↓ {character}-{sheet}.webp
              </a>
            ))}
          </div>
        </>
      ),
    },
    {
      title: 'Point the component at them',
      body: (
        <>
          <Snippet lang="tsx">{`import { Mascot } from 'page-mascot'

<Mascot
  directions="/mascots/${character}-directions.webp"
  reactions="/mascots/${character}-reactions.webp"
/>`}</Snippet>
          <p className="mt-3 text-sm text-ink/40">
            Any two paths work. Put the files wherever you like, or import them and pass
            the imported urls.
          </p>
        </>
      ),
    },
  ]
}

const MAKE_STEPS: Step[] = [
  {
    title: 'Install the skill',
    body: (
      <>
        <Snippet>npx skills add nilbuild/page-mascot --skill page-mascot --global --yes</Snippet>
      </>
    ),
  },
  {
    title: 'Ask for a character',
    body: (
      <>
        <Snippet lang="prompt">/page-mascot a chibi otter with chocolate-brown fur</Snippet>
        <p className="mt-4 text-ink/55">Attach a photo and it draws you instead.</p>
        <Snippet lang="prompt">/page-mascot make one that looks like me</Snippet>
        <p className="mt-4 text-ink/55">Name a style and it draws in that one.</p>
        <Snippet lang="prompt">/page-mascot a chibi fox, in the riso style</Snippet>
      </>
    ),
  },
  {
    title: 'Let it check itself',
    body: (
      <p className="mt-1 text-ink/55">
        It draws nine head directions and nine expressions, builds them into two aligned
        sheets, and measures whether the character jumps or drifts between them. If it
        does, it draws again.
      </p>
    ),
  },
  {
    title: 'Put it on the page',
    body: (
      <>
        <Snippet lang="tsx">{`import { Mascot } from 'page-mascot'

<Mascot
  directions="/mascots/otter-directions.webp"
  reactions="/mascots/otter-reactions.webp"
/>`}</Snippet>
        <p className="mt-3 text-sm text-ink/40">
          Drawing needs an image tool. Codex has one. Claude Code goes through the OpenAI
          images API, so set <span className="font-mono">OPENAI_API_KEY</span> first.
        </p>
      </>
    ),
  },
]

export function Guide(props: GuideProps) {
  const { kind, character, onClose } = props
  const steps = stepsToUse(character)

  useEffect(() => {
    if (!kind) {
      return
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [kind, onClose])

  if (!kind) {
    return null
  }

  const useThisOne = kind === 'use'

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/25 dark:bg-black/60"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={useThisOne ? `How to use ${character}` : 'How to make your own'}
        className="absolute inset-y-0 right-0 flex w-full max-w-[620px] animate-[slide-in_220ms_cubic-bezier(0.22,1,0.36,1)] flex-col overflow-y-auto border-l border-ink/10 bg-paper px-7 py-8 shadow-[0_0_50px_rgb(18_16_14/0.12)] dark:shadow-[0_0_60px_rgb(0_0_0/0.45)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-mono text-2xl font-bold tracking-tight">
              {useThisOne ? character : 'your own'}
            </h2>
            <p className="mt-1 text-ink/50">
              {useThisOne ? 'Three steps.' : 'An agent draws it for you.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 rounded-lg px-2 py-1 text-2xl leading-none text-ink/40 transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>

        <ol className="mt-8 flex flex-col gap-8">
          {(useThisOne ? steps : MAKE_STEPS).map((step, index) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-paper">
                  {index + 1}
                </span>
                <h3 className="font-medium">{step.title}</h3>
              </div>
              <div className="mt-2 pl-9 text-[15px] leading-snug">{step.body}</div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
