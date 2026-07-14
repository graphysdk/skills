---
name: graphy-sdk-install
description: Install the Graphy SDK (@graphysdk/viz-engine + @graphysdk/react-renderer) in a React codebase and render a first graph. Use this skill when the user asks to install Graphy, set up the Graphy SDK, add Graphy to their project, or when a Graphy install fails (npm auth, 404/403, peer dependency, or CSS errors). Covers private-registry auth, installing the alpha versions, and verifying the install with a simple bar graph.
---

# Install the Graphy SDK

The Graphy SDK is two npm packages that work together:

- **`@graphysdk/viz-engine`** — the graph engine. You describe a graph as a declarative spec; it compiles the spec plus your data into a render-ready form. No React dependency.
- **`@graphysdk/react-renderer`** — React components that paint the compiled graph to SVG. Depends on viz-engine.

You install both. The end goal of this skill is a bar graph rendering on the user's screen.

## Goal: a rendered graph, not just installed packages

Don't stop at "packages installed." Walk all the way through: auth, install, the example component, and then run the dev server so the user can see the graph. If something blocks rendering — a missing token, wrong React version, a CSS build error — solve it using the troubleshooting section before moving on.

## Prerequisites

Check these before installing — they are the most common reasons an install fails:

- **React 19.** `@graphysdk/react-renderer` has a peer dependency on `react@^19.0.0`. React 18 or older will not work.
- **Node >= 20.**
- **A bundler that handles CSS imports from `node_modules`.** The renderer's JavaScript imports its own stylesheet (`import './index.css'`). Vite, Next.js, and webpack with `css-loader` all handle this out of the box.
- **An npm auth token.** Both packages are currently private on npm, so installs fail with 404/403 until auth is set up (next section).

## Step 1: npm auth

Both packages are private, so the npm registry needs an auth token even just to download them.

Create an `.npmrc` in the repository root (or in the home directory for user-level auth):

```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
@graphysdk:registry=https://registry.npmjs.org/
```

Then make sure `NPM_TOKEN` is set in the environment where installs run:

```bash
export NPM_TOKEN=npm_xxxxxxxxxxxx
```

Notes:

- The token must belong to an npm account with read access to the `@graphysdk` packages. The user gets one from the Graphy team.
- If the `.npmrc` is committed, keep the `${NPM_TOKEN}` variable form — never commit a literal token.
- CI needs the same variable set (for example as a repository secret).
- **Yarn Berry (v2+) ignores `.npmrc`.** Put the equivalent in `.yarnrc.yml` instead:

  ```yaml
  npmScopes:
    graphysdk:
      npmRegistryServer: 'https://registry.npmjs.org'
      npmAuthToken: '${NPM_TOKEN}'
  ```

Verify auth works before installing:

```bash
npm view @graphysdk/viz-engine@alpha version
```

If this prints a version, auth is good. A 404 or 403 means the token is missing, not exported, or lacks access.

## Step 2: install

The packages are currently published under the `alpha` dist-tag (this is temporary — once stable releases exist, drop the `@alpha` suffix).

```bash
# pnpm
pnpm add @graphysdk/viz-engine@alpha @graphysdk/react-renderer@alpha

# npm
npm install @graphysdk/viz-engine@alpha @graphysdk/react-renderer@alpha

# yarn
yarn add @graphysdk/viz-engine@alpha @graphysdk/react-renderer@alpha
```

## Step 3: render a first graph

Two components do the work: `<GraphProvider>` holds the spec and data, `<GraphRenderer>` paints the graph.

Drop this into any page or route:

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

Run the dev server and open the page. You should see a bar graph with four labeled bars, axes, and gridlines.

The example uses fixed sizing so it renders no matter how the page is laid out. The default is `sizing={{ mode: 'responsive' }}`, which fills the parent element — that only works if the parent has a real width and height, so switch to responsive once the graph lives in a sized container.

## Verify checklist

- `npm view @graphysdk/viz-engine@alpha version` prints a version (auth works)
- Both packages appear in `package.json` with an alpha version
- The app builds with no module-resolution or CSS-import errors
- The bar graph renders with visible bars, axis labels, and styling (not unstyled black-on-white text)

## Troubleshooting

**404 / 403 during install.** Auth problem. Check that `.npmrc` exists with both lines from Step 1 (`.yarnrc.yml` for Yarn Berry), `NPM_TOKEN` is exported in the shell running the install, and the token has read access to `@graphysdk` packages. In CI, check the secret is actually passed to the install step.

**`ERESOLVE` / peer dependency error on react.** The project is on React 18 or older. The renderer requires React 19 — upgrade React, there is no compatibility fallback.

**Unmet peer `@tiptap/*` warnings or errors.** The renderer declares its `@tiptap/*` packages (v3) as peer dependencies. npm 7+ and pnpm install peers automatically, so most setups need nothing. Yarn does not — install the packages it lists as unmet, all at `^3.0.0`.

**Build error like "Unexpected token" pointing at a `.css` file.** The bundler doesn't process CSS imports from `node_modules`. Vite and Next.js work out of the box; for custom webpack, add `css-loader`. The stylesheet is also exported directly as `@graphysdk/react-renderer/styles.css` if you'd rather wire it up yourself.

**Graph renders but looks unstyled.** The stylesheet didn't load. Same cause as above — make sure the CSS import isn't stripped by the build, or import `@graphysdk/react-renderer/styles.css` manually once at the app's entry point.

**Graph area is blank / zero height.** Responsive sizing inside a parent with no height. Give the parent element an explicit height, or use `sizing={{ mode: 'fixed', width, height }}` like the example.

**TypeScript can't find the module or its types.** Both packages ship ESM + CJS with bundled `.d.ts` files. Use `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`) in `tsconfig.json` — the legacy `"node"` resolution can miss the `exports` map.

## Next steps

Once the first graph renders, the install is done. The full API — graph types (line, area, scatter, pie, combo), multi-series data, stacking and grouping, highlights, annotations, theming, and sizing modes — is documented in the packages' TypeScript types: hover any exported symbol or open `dist/index.d.ts` in either package; the JSDoc is included.
