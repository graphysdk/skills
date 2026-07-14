---
name: graphy-sdk-install
description: Install the Graphy SDK (@graphysdk/viz-engine + @graphysdk/react-renderer) in a React codebase and render a first graph. Use this skill when the user asks to install Graphy, set up the Graphy SDK, add Graphy to their project, or when a Graphy install fails (npm auth, 404/403, peer dependency, or CSS errors). Covers private-registry auth, installing the alpha versions, and verifying the install with a simple bar graph.
---

# Install the Graphy SDK

Two packages: **`@graphysdk/viz-engine`** (the graph engine — compiles a declarative spec plus data into a render-ready form, no React dependency) and **`@graphysdk/react-renderer`** (React components that paint the compiled graph to SVG). Install both.

Don't stop at "packages installed" — the goal is a bar graph rendering on the user's screen. If something blocks rendering, solve it with the troubleshooting section before moving on.

## Prerequisites

- **React 19** — the renderer's peer dependency is `react@^19.0.0`; React 18 will not work.
- **Node >= 20.**
- **A bundler that handles CSS imports from `node_modules`** (Vite, Next.js, webpack + `css-loader` all do) — the renderer's JavaScript imports its own stylesheet.
- **An npm auth token** — both packages are private; installs fail with 404/403 without one.

## Step 1: npm auth

Create an `.npmrc` in the repository root (or home directory):

```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
@graphysdk:registry=https://registry.npmjs.org/
```

Set `NPM_TOKEN` wherever installs run (locally and in CI). The token needs read access to `@graphysdk` packages — the Graphy team provides one. Never commit a literal token; keep the `${NPM_TOKEN}` form.

Yarn Berry (v2+) ignores `.npmrc` — use `.yarnrc.yml` instead:

```yaml
npmScopes:
  graphysdk:
    npmRegistryServer: 'https://registry.npmjs.org'
    npmAuthToken: '${NPM_TOKEN}'
```

Verify before installing — this should print a version; a 404/403 means the token is missing, not exported, or lacks access:

```bash
npm view @graphysdk/viz-engine@alpha version
```

## Step 2: install

The packages are published under the `alpha` dist-tag for now (drop `@alpha` once stable releases exist):

```bash
pnpm add @graphysdk/viz-engine@alpha @graphysdk/react-renderer@alpha
# or: npm install / yarn add
```

## Step 3: render a first graph

`<GraphProvider>` holds the spec and data; `<GraphRenderer>` paints the graph. Drop this into any page:

```tsx
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import type { Data } from '@graphysdk/viz-engine';
import { createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';

const data: Data = {
  columns: [{ key: 'category' }, { key: 'revenue' }],
  rows: [
    { category: 'Product A', revenue: 1200 },
    { category: 'Product B', revenue: 1800 },
    { category: 'Product C', revenue: 2400 },
    { category: 'Product D', revenue: 1600 },
  ],
};

const spec = pipe(
  createSpec(),
  mapping({ x: 'category', y: 'revenue' }), // bind data columns to graph axes
  geom.bar(),
  scale.x(),
  scale.y()
);

export const FirstGraph = () => (
  <GraphProvider input={spec} data={data} theme="light">
    <GraphRenderer sizing={{ mode: 'fixed', width: 640, height: 400 }} />
  </GraphProvider>
);
```

Run the dev server and open the page: you should see a bar graph with four labeled bars, axes, gridlines, and styling (not unstyled black-on-white text).

The example uses fixed sizing so it renders regardless of page layout. The default `sizing={{ mode: 'responsive' }}` fills the parent element — switch to it once the graph lives in a container with real width and height.

## Troubleshooting

- **404 / 403 during install** — auth. Check the `.npmrc` from Step 1 exists (`.yarnrc.yml` for Yarn Berry), `NPM_TOKEN` is exported in the installing shell, and the token has read access. In CI, check the secret reaches the install step.
- **`ERESOLVE` / peer error on react** — the project is on React 18 or older. Upgrade to React 19; there is no fallback.
- **Unmet peer `@tiptap/*`** — the renderer declares tiptap v3 packages as peers. npm 7+ and pnpm auto-install them; yarn doesn't — install the listed packages at `^3.0.0`.
- **Build error pointing at a `.css` file, or graph renders unstyled** — the bundler isn't processing CSS imports from `node_modules`. Add `css-loader` (custom webpack), or import `@graphysdk/react-renderer/styles.css` once at the app entry point.
- **Graph area blank / zero height** — responsive sizing inside a parent with no height. Size the parent, or use fixed sizing like the example.
- **TypeScript can't find the module or its types** — use `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`); the legacy `"node"` resolution can miss the `exports` map.

## Next steps

The full API (graph types, multi-series data, stacking, highlights, annotations, theming, sizing) is documented in each package's bundled TypeScript types — hover any exported symbol or open `dist/index.d.ts`.
