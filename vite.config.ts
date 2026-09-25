import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const GA_MEASUREMENT_ID = 'G-F39XL66190'

// Same GA property as the other koboyo.com sites. Injected only on build so a dev
// server never sends hits.
function analytics(): Plugin {
  return {
    name: 'analytics',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}` },
          injectTo: 'head',
        },
        {
          tag: 'script',
          children: [
            'window.dataLayer = window.dataLayer || [];',
            'function gtag(){dataLayer.push(arguments);}',
            "gtag('js', new Date());",
            `gtag('config', '${GA_MEASUREMENT_ID}');`,
          ].join('\n'),
          injectTo: 'head',
        },
      ]
    },
  }
}

export default defineConfig({
  // The demo is served from koboyo.com/page-mascot.
  base: '/page-mascot/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'site'),
    },
  },
  plugins: [react(), tailwindcss(), analytics()],
  // dist/ is the published component, so the demo builds somewhere else.
  build: { outDir: 'site-build/page-mascot' },
})
