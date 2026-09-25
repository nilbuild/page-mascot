import { useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { Cast } from './cast'
import { Guide, type GuideKind } from './guide'
import { Hero } from './hero'
import { Styles } from './styles'
import { ThemeToggleButton } from '@/components/ui/skiper-ui/skiper26'
import { MASCOT } from './mascots'

function App() {
  const [picked, setPicked] = useState<string>(MASCOT)
  const [guide, setGuide] = useState<GuideKind | null>(null)

  const openUse = (character: string) => {
    setPicked(character)
    setGuide('use')
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggleButton
        variant="circle"
        start="top-right"
        className="fixed top-5 right-5 z-40 sm:top-7 sm:right-7"
      />
      <div className="mx-auto w-full max-w-[960px] px-6 pt-20 pb-28 sm:px-10 sm:pt-28">
        <Hero character={picked} onMakeYourOwn={() => setGuide('make')} />
        <Styles onUse={openUse} />
        <Cast
          picked={picked}
          onPick={setPicked}
          onUse={openUse}
          onMakeYourOwn={() => setGuide('make')}
        />
      </div>

      <Guide kind={guide} character={picked} onClose={() => setGuide(null)} />
    </ThemeProvider>
  )
}

export default App
