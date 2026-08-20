# Install

Two packages: **`@graphysdk/viz-engine`** (the engine — compiles a declarative spec plus data into a
render-ready form, no React dependency) and **`@graphysdk/react-renderer`** (React components that
paint the compiled graph to SVG). Install both.

**`@graphysdk/react`** is a batteries-included wrapper that re-exports the renderer. Reach for `@graphysdk/react-renderer` directly for the
neutral layer, where the badge is off.

Don't stop at "packages installed" — the goal is a graph rendering on screen. If something blocks
rendering, work through **Troubleshooting** below.

## Prerequisites

| Requirement | Why |
|---|---|
| **React 19** | `react@^19.0.0` is a peer of the renderer. React 18 will not resolve. |
| **A bundler that processes CSS imports from `node_modules`** | The renderer's JS entry imports its own stylesheet. Vite, Next.js and webpack + `css-loader` all do. |
| **`@tiptap/*` v3** | The renderer declares 15 tiptap v3 packages as peers (`@tiptap/core`, `@tiptap/react`, `@tiptap/pm` and the extensions). npm 7+ and pnpm install peers automatically; Yarn does not. |
| **`moduleResolution: "bundler"`** (or `node16`/`nodenext`) | The packages ship an `exports` map; the legacy `"node"` resolution misses it. |

The packages are public on npm — no registry configuration or auth token needed.

## Step 1 — install

The packages publish under the `beta` dist-tag:

```bash
pnpm add @graphysdk/viz-engine@beta @graphysdk/react-renderer@beta
# or: npm install / yarn add
```

For the batteries-included wrapper instead:

```bash
pnpm add @graphysdk/react@beta
```

## Step 2 — render a graph

Use the minimal chart in `SKILL.md`. Two things to know when checking the result:

- **There is no stylesheet to import.** Each entry point injects its own CSS. A correct render shows
  axes, grid lines and a coloured bar — not unstyled black-on-white text.
- **Sizing**: `sizing={{ mode: 'responsive' }}` is the default and fills the parent, so the parent
  needs real width and height. Use `sizing={{ mode: 'fixed', width: 640, height: 400 }}` while
  verifying, so the graph renders regardless of page layout.

The editing surface lives behind `@graphysdk/react-renderer/editable` and ships its own stylesheet,
injected the same way.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| **404 during install** | Wrong name or version. The packages publish under the `beta` dist-tag — `npm view @graphysdk/viz-engine@beta version` should print a version. Also check no stale `.npmrc` points the `@graphysdk` scope at a registry that doesn't have them. |
| **`ERESOLVE` / peer error on `react`** | The project is on React 18 or older. Upgrade to React 19; there is no fallback. |
| **Unmet peer `@tiptap/*`** | Yarn does not auto-install peers. Add the 15 `@tiptap/*` packages the renderer lists at `^3.0.0`. |
| **Graph renders unstyled** | The bundler is not processing the CSS import inside `node_modules`. Add `css-loader` on a custom webpack setup; Vite and Next.js need no configuration. |
| **Graph area blank or zero height** | Responsive sizing inside a parent with no height. Give the parent a height, or use fixed sizing. |
| **TypeScript cannot find the module or its types** | Set `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`) in `tsconfig.json`. |
| **`ERR_PACKAGE_PATH_NOT_EXPORTED`** | The package exposes `.` and `@graphysdk/react-renderer/editable`. Import from those entry points only. |

## Next

`SKILL.md` routes the rest: chart recipes, the spec API, styling, and `reference/types.md` for the
exact signature of any exported symbol.
