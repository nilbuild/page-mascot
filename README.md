# Mascot Studio

A browser-based workspace for customizing and exporting interactive mascots. Built with React, TypeScript, and Vite, using the artwork and sprite component from [page-mascot](https://github.com/nilbuild/page-mascot) by Kamran Ahmed.

## Run locally

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. Use Node.js 20.19+ or 22.12+.

## What you can make

- Choose from **53 characters** across Animals, People, and Robots, with search and category filters.
- Try six original artwork styles for **Fox**: colour, ink, sketch, riso, paper, and pixel. Other built-in characters have their original style.
- Set the name, size, background color, transparency, horizontal flip, and one of nine expressions.
- Use Live mode to follow the pointer and react to clicks. Touch devices support click reactions; reduced-motion preferences disable the bounce.
- Undo and redo edits, reset, or choose a random character.
- Automatically preserve the current draft and save up to 24 designs in My collection.
- Import your own matching direction and reaction sprite sheets (PNG/WebP, up to 2 MB each).

Everything runs locally in the browser. There is no account, server database, cloud sync, or AI image generation. Drafts and collections are specific to the browser and origin. Storage limits can be reached sooner when using custom artwork; the app reports failures and you can export a design file instead.

## Exports

**PNG:** 512, 1024, or 2048 pixels square, with a chosen or transparent background. The selected expression, character scale, and flip are preserved. Live mode exports the neutral front-facing pose. Larger images upscale the existing sprite artwork.

**React kit (.zip):** Includes `Mascot.tsx`, `MyMascot.tsx`, both sprite images, an editable design JSON, setup instructions, and the original MIT license. Copy the two components into a React 18+ application and the images into its `public/mascots` directory. The sample assumes root-relative asset URLs; adjust them for subdirectory deployments.

**Design (.json):** Stores your settings and, for custom characters, embeds both images. Use **Import a saved design** to reopen it on another device.

## Custom artwork

Provide two square, aligned 3 × 3 sprite sheets. Their dimensions must match, be divisible by 3, and be between 96 and 4096 pixels. Use real transparency and keep the character aligned in every cell.

| Row | Directions (left to right)  | Expressions (left to right) |
| --- | --------------------------- | --------------------------- |
| 1   | Up-left, up, up-right       | Blink, heart, sparkle       |
| 2   | Left, center, right         | Surprised, wink, bashful    |
| 3   | Down-left, down, down-right | Sleepy, dizzy, delighted    |

The generation/build tools and agent instructions remain in `skills/page-mascot`. Original source sheets are in `characters/`; ready-to-use atlases are in `public/mascots/`. Artwork generation through the skill is a separate workflow from the browser editor.

## Development

| Command              | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `npm run dev`        | Start the editor                                                  |
| `npm run typecheck`  | Check TypeScript                                                  |
| `npm run lint`       | Run Oxlint                                                        |
| `npm run format`     | Format the app and sync the skill component                       |
| `npm test`           | Validate assets, saved-design boundaries, and generated React kit |
| `npm run build`      | Build the reusable component into `dist/` and sync the skill      |
| `npm run build:site` | Build the editor into `site-build/`                               |
| `npm run preview`    | Preview the production editor                                     |

`src/mascot.tsx` is the component source of truth. Run `npm run sync:skill` after modifying it; `build:site` checks that the distributed skill copy matches.

The app lives in `site/app.tsx`, its validation and persistence model in `site/studio-model.ts`, and downloads in `site/studio-export.ts`. The catalog is defined in `site/mascots.ts`.

## Hosting

Upload `site-build/` to a static host after `npm run build:site`. For a subdirectory deployment, build with `BASE_PATH=/your-path/ npm run build:site`.

`wrangler.jsonc` is configured for an independent Cloudflare Worker called `mascot-studio`; set up your own account and domain before deploying. The original site's domain routes and analytics have been removed. No deployment is performed by the build commands.

## Component API

```tsx
import { Mascot } from './Mascot'

;<Mascot
  directions="/mascots/fox-directions.webp"
  reactions="/mascots/fox-reactions.webp"
  size={280}
  label="My little fox"
  tracking
  interactive
  flip={false}
  expression={null}
/>
```

`tracking` and `interactive` default to `true`; `flip` defaults to `false`. `expression` accepts one of the nine reaction names above, or `null` for live interaction. Existing two-image usage remains compatible. Backgrounds and canvas composition are handled by the editor or by a wrapper around the component.

## License

MIT. Original component and built-in artwork © Kamran Ahmed. See [LICENSE](LICENSE). Imported custom artwork remains subject to its owner's terms.
