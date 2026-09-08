# Install

One package: **`@graphysdk/react`** — the spec builders, `<GraphProvider>`/`<GraphRenderer>`, and
the hooks. Advanced mode installs the two packages it composes directly: **`@graphysdk/viz-engine`**
(compiles a spec plus data into a render-ready form; no React dependency) and
**`@graphysdk/react-renderer`** (paints the compiled graph to SVG, "Made with Graphy" badge off).

The goal is a graph rendering on screen, not packages installed — work through **Troubleshooting**
if anything blocks that.

## Prerequisites

| Requirement | Why |
|---|---|
| **React 19** — `react` and `react-dom` at `^19` | `react` is a required peer; `react-dom` is imported by the renderer but not declared, so install both. React 18 will not resolve. |
| **A bundler that resolves CSS imports from `node_modules`** | The renderer's JS entry imports its stylesheets (`@graphysdk/react-renderer/dist/*.css`), reached transitively from `@graphysdk/react`. Vite, Next.js and webpack + `css-loader` all do. |
| **`moduleResolution: "bundler"`** (or `node16`/`nodenext`) | The packages ship an `exports` map with no `main` fallback; the legacy `"node"` resolution finds nothing. |
| **`@tiptap/*` v3** — only for `/editable` | The renderer lists 15 `@tiptap/*` packages as **optional** peers. A read-only install needs none of them; importing the editing entry point does. |

The packages are public on npm — no registry configuration or token.

## Step 1 — install

```bash
pnpm add @graphysdk/react
# or: npm install / yarn add
```

Advanced mode:

```bash
pnpm add @graphysdk/viz-engine @graphysdk/react-renderer
```

Entry points per package:

| Package | Entry points |
|---|---|
| `@graphysdk/react` | `.`, `./editable` |
| `@graphysdk/react-renderer` | `.`, `./editable`, `./graph-config` |
| `@graphysdk/viz-engine` | `.`, `./graph-config` |

## Step 2 — render a graph

Use the minimal chart in `SKILL.md`. When checking the result:

- **You never import a stylesheet.** The JS entry imports it. A correct render shows axes, grid lines
  and a colored bar — not unstyled black-on-white text.
- **Sizing.** The default `sizing={{ mode: 'responsive' }}` fills the parent, so the parent needs real
  width and height. Use `sizing={{ mode: 'fixed', width: 640, height: 400 }}` while verifying.

The editing surface lives at `@graphysdk/react/editable` (advanced mode:
`@graphysdk/react-renderer/editable`) and imports its own stylesheet the same way.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| **404 during install** | Wrong name or version — `npm view @graphysdk/react version` should print one. Check no stale `.npmrc` points the `@graphysdk` scope elsewhere. |
| **`ERESOLVE` / peer error on `react`** | The project is on React 18 or older. Upgrade to React 19; there is no fallback. |
| **`Cannot find module '@tiptap/…'` at runtime** | Only happens when importing `/editable`. Add the 15 `@tiptap/*` packages the renderer lists, at `^3.0.0`. |
| **Graph renders unstyled** | The bundler is not resolving the CSS import inside `node_modules`. Add `css-loader` on a custom webpack setup; Vite and Next.js need nothing. |
| **Graph area blank; console shows `[graphy] ZERO_SIZE_CONTAINER`** | Responsive sizing inside a parent with no width or height. Give the parent a size, or use fixed sizing. |
| **TypeScript cannot find the module or its types** | Set `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`) in `tsconfig.json`. |
| **`ERR_PACKAGE_PATH_NOT_EXPORTED`** | Import only from the entry points in the table above — `@graphysdk/react` has no `./graph-config`; that lives on the two lower packages. |

## Next

`SKILL.md` routes the rest: chart recipes, the spec API, styling, and `reference/types.md` for the
exact signature of any exported symbol.
