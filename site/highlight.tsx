import type { ReactNode } from 'react'

export type Lang = 'bash' | 'tsx' | 'prompt'

const COLOR = {
  keyword: 'text-[#f2a0bd]',
  string: 'text-[#a9d97f]',
  tag: 'text-[#7cc1e6]',
  attr: 'text-[#f0c274]',
  command: 'text-[#f0c274]',
  flag: 'text-[#7cc1e6]',
  punct: 'text-on-code/45',
  muted: 'text-on-code/60',
}

type Token = {
  text: string
  className?: string
}

const KEYWORDS = new Set(['import', 'from', 'export', 'const', 'default', 'return'])

// One pass, so the alternatives stay in priority order: strings first, then names,
// then anything that is left.
const TSX = /("[^"]*"|'[^']*'|`[^`]*`)|([A-Za-z_$][\w$]*)|(\s+)|([^\s])/g

function tsxTokens(code: string): Token[] {
  const tokens: Token[] = []
  let match: RegExpExecArray | null
  let tag = false

  TSX.lastIndex = 0

  while ((match = TSX.exec(code))) {
    const [text, string, word, space, other] = match

    if (string) {
      tokens.push({ text, className: COLOR.string })
      continue
    }

    if (space) {
      tokens.push({ text })
      continue
    }

    if (word) {
      if (KEYWORDS.has(word)) {
        tokens.push({ text, className: COLOR.keyword })
        continue
      }

      if (tag) {
        const opener = code[match.index - 1] === '<'
        tokens.push({ text, className: opener ? COLOR.tag : COLOR.attr })
        continue
      }

      tokens.push({ text })
      continue
    }

    if (other === '<') {
      tag = true
    }

    if (other === '>') {
      tag = false
    }

    tokens.push({ text, className: COLOR.punct })
  }

  return tokens
}

function bashTokens(code: string): Token[] {
  const tokens: Token[] = []

  for (const [index, line] of code.split('\n').entries()) {
    if (index > 0) {
      tokens.push({ text: '\n' })
    }

    let first = true

    for (const word of line.split(/(\s+)/)) {
      if (!word || /^\s+$/.test(word)) {
        tokens.push({ text: word })
        continue
      }

      if (first) {
        first = false
        tokens.push({ text: word, className: COLOR.command })
        continue
      }

      if (word.startsWith('-')) {
        tokens.push({ text: word, className: COLOR.flag })
        continue
      }

      tokens.push({ text: word, className: COLOR.muted })
    }
  }

  return tokens
}

function promptTokens(code: string): Token[] {
  const match = code.match(/^(\/[\w-]+)(.*)$/s)

  if (!match) {
    return [{ text: code }]
  }

  return [
    { text: match[1], className: COLOR.command },
    { text: match[2], className: COLOR.muted },
  ]
}

export function highlight(code: string, lang: Lang): ReactNode {
  if (lang === 'prompt') {
    return render(promptTokens(code))
  }

  if (lang === 'bash') {
    return render(bashTokens(code))
  }

  return render(tsxTokens(code))
}

function render(tokens: Token[]): ReactNode {
  return tokens.map((token, index) => {
    if (!token.className) {
      return token.text
    }

    return (
      <span key={index} className={token.className}>
        {token.text}
      </span>
    )
  })
}
