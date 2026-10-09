# Setup

Contents

- Install
- Which package to use
- First graph
- Mental model
- Hiding the brand mark
- Editable graphs
- CDN without a bundler
- When the CDN is blocked
- Pitfalls

## Install

```bash
npm install @graphysdk/react
# or
pnpm add @graphysdk/react
yarn add @graphysdk/react
bun add @graphysdk/react
```

What the package needs:

- React 19. `react@^19.0.0` is the only required peer.
- `moduleResolution: "bundler"` (or `node16` / `nodenext`) in `tsconfig.json`. The packages ship an `exports` map.
- A bundler that handles CSS imports from `node_modules`. Vite, Next.js, and webpack with `css-loader` all do. There is no stylesheet to import: each entry imports its own CSS. The CDN build injects its styles at runtime instead.
- A client component. In the Next.js app router put `'use client'` at the top of the file that renders a graph.

`@graphysdk/react` depends on `@graphysdk/viz-engine` and `@graphysdk/react-renderer` and re-exports what an app needs from both. Install them only to import from them directly.

Built-in themes are separate `@graphysdk/theme-<name>` packages. See [themes](themes.md).

## Which package to use

- `@graphysdk/react`: the default. Spec builders, `GraphProvider`, `GraphRenderer`, hooks, slots, and plugin authoring from one import. The "Made with Graphy" mark is on by default.
- `@graphysdk/react-renderer`: the same components and hooks, no spec builders, mark off by default. Pair it with `@graphysdk/viz-engine` for the builders.
- `@graphysdk/viz-engine`: the engine alone. Build a spec, compile it with `createCompiler`, read the scene. No React, no DOM. Ships ESM and CommonJS.

```ts
import { createCompiler, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 120 },
    { month: 'Feb', revenue: 150 },
  ],
};
const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());
const result = createCompiler().compile({ spec, data });
if (result.ok) console.log(result.scene.layers.length);
```

A setting written in the spec is kept by every package. Only the defaults differ, so a spec moves between packages unchanged.

## First graph

```tsx
import { GraphProvider, GraphRenderer, createSpec, geom, pipe, scale } from '@graphysdk/react';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 120 },
    { month: 'Feb', revenue: 150 },
    { month: 'Mar', revenue: 90 },
  ],
};

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export function RevenueGraph() {
  return (
    <div style={{ height: 320 }}>
      <GraphProvider data={data} spec={spec}>
        <GraphRenderer />
      </GraphProvider>
    </div>
  );
}
```

`GraphRenderer` fills its container. Give the container a height.

## Mental model

`GraphProvider` takes two inputs: `data` (a table of columns and rows, see data.md) and `spec` (what to draw, see spec.md). It compiles both into a scene. `GraphRenderer` paints the scene and handles hover, tooltips, and resizing.

A spec is built with `pipe`. `createSpec({ x, y, color, ... })` maps columns to aesthetics. Each further call adds one thing: `geom.bar()` adds a layer, `scale.x()` and `scale.y()` declare the position scales, `config({...})` sets titles and axes, `styles({...})` sets paint. Position scales are never added for you. Every mapped `x` and `y` needs its `scale.x()` or `scale.y()`.

Build the spec once, outside render, or memoize it. A new spec object recompiles the graph.

## Hiding the brand mark

```ts
import { config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  config({ content: { brandMark: { enabled: false } } })
);
```

`@graphysdk/react` turns the mark on only when the spec says nothing about it. `brandMark` also takes `placement` and `variant` (`BrandMarkConfig` in types.md § Supporting types). See react.md § The brand mark.

## Editable graphs

`@graphysdk/react/editable` adds `EditableGraphRenderer`, the editor panel and its controls. The graphy-editor skill covers it. Its TipTap peers (`@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/extensions`, and the `@tiptap/extension-*` packages, all `^3`) are optional. Install them only when you import from `/editable`. The main entry needs none of them.

## CDN without a bundler

Use this for HTML artifacts and any page with no bundler. Those hosts cannot install npm packages, so a bare `import` from `@graphysdk/react` fails.

Some artifact sandboxes allow `cdn.jsdelivr.net`. Others set a CSP that blocks every external host except Google Fonts. Start with this CDN page. If the chart panel stays blank, or the console says it refused `cdn.jsdelivr.net` (CSP, failed fetch, or 404), stop retrying the CDN and use [When the CDN is blocked](#when-the-cdn-is-blocked).

The package ships a single-file browser build at `dist/index.browser.mjs` (its `jsdelivr` entry). It bundles viz-engine, react-renderer, and all styles. Only `react`, `react-dom`, and `react/jsx-runtime` stay external. The page supplies them through an import map, so every module shares one React.

React's npm files are not browser ESM, so load them with jsDelivr `/+esm` and a pinned version. Load Graphy from `dist/index.browser.mjs`, not from `/+esm`.

There is no `@graphysdk/react@1` on jsDelivr. That URL 404s. Use `@latest` (today a `1.9.0-beta` on the `latest` dist-tag) or pin an exact published version.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Chart</title>
  </head>
  <body>
    <div id="graph" style="height: 320px"></div>
    <script type="importmap">
      {
        "imports": {
          "react": "https://cdn.jsdelivr.net/npm/react@19.2.0/+esm",
          "react/jsx-runtime": "https://cdn.jsdelivr.net/npm/react@19.2.0/jsx-runtime/+esm",
          "react-dom": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/+esm",
          "react-dom/client": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/client/+esm",
          "@graphysdk/react": "https://cdn.jsdelivr.net/npm/@graphysdk/react@latest/dist/index.browser.mjs"
        }
      }
    </script>
    <script type="module">
      import { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import { GraphProvider, GraphRenderer, createSpec, geom, pipe, scale } from '@graphysdk/react';

      const data = {
        columns: [{ key: 'month' }, { key: 'revenue' }],
        rows: [
          { month: 'Jan', revenue: 120 },
          { month: 'Feb', revenue: 150 },
        ],
      };
      const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

      createRoot(document.getElementById('graph')).render(
        createElement(GraphProvider, { data, spec }, createElement(GraphRenderer))
      );
    </script>
  </body>
</html>
```

Pin the same React version in every import map entry. The editing surface has its own file, `dist/editable.browser.mjs`, a superset of the read-only one. A page imports one of the two, never both.

To add a theme, extend the import map and load its fonts as shown in [themes: without a bundler](themes.md#without-a-bundler).

## When the CDN is blocked

jsDelivr `/+esm` files import with root paths such as `from"/npm/react@19.2.0/+esm"` and `from"/npm/scheduler@0.27.0/+esm"`. Served unchanged from your origin, those paths miss and the graph never loads.

Vendor the files next to the HTML, then rewrite those imports to relative filenames:

1. Save these jsDelivr URLs as local files (React 19.2.0, Graphy `@latest` or an exact version):
   - `vendor/react.mjs` from `https://cdn.jsdelivr.net/npm/react@19.2.0/+esm`
   - `vendor/jsx-runtime.mjs` from `https://cdn.jsdelivr.net/npm/react@19.2.0/jsx-runtime/+esm`
   - `vendor/react-dom.mjs` from `https://cdn.jsdelivr.net/npm/react-dom@19.2.0/+esm`
   - `vendor/react-dom-client.mjs` from `https://cdn.jsdelivr.net/npm/react-dom@19.2.0/client/+esm`
   - `vendor/scheduler.mjs` from `https://cdn.jsdelivr.net/npm/scheduler@0.27.0/+esm`
   - `vendor/graphy.mjs` from `https://cdn.jsdelivr.net/npm/@graphysdk/react@latest/dist/index.browser.mjs`
2. In the React files, replace every `from"/npm/<package>@<version>/+esm"` (and any `/npm/<package>@<version>/<path>/+esm`) with a relative path to the matching local file. `graphy.mjs` imports `react`, `react-dom`, and `react/jsx-runtime` as bare specifiers, so leave it alone.
3. Point the import map at the local files:

```html
<script type="importmap">
  {
    "imports": {
      "react": "./vendor/react.mjs",
      "react/jsx-runtime": "./vendor/jsx-runtime.mjs",
      "react-dom": "./vendor/react-dom.mjs",
      "react-dom/client": "./vendor/react-dom-client.mjs",
      "@graphysdk/react": "./vendor/graphy.mjs"
    }
  }
</script>
```

Serve the folder as files (a local static server, or an artifact host that allows same-origin scripts). Keep `<meta charset="utf-8" />` in `<head>` so quotes and degree signs render.

If the host accepts one HTML file only and also blocks the network, Graphy cannot load there. Say so and stop. Do not keep swapping CDN URLs.

## Pitfalls

- Forgetting `scale.x()` and `scale.y()`. Position scales are declared, never inferred from the mapping. Without them nothing is placed.
- A container with no height. `GraphRenderer` is responsive by default and needs a sized parent (react.md § Sizing).
- Building the spec inside render without `useMemo`. Every render then recompiles the graph.
- Mixing `@graphysdk/react` and `@graphysdk/react-renderer` providers in one app works, but the mark default differs.
- Installing TipTap for a read-only graph. Those peers are only for `/editable`.
- Loading React or Graphy from esm.sh. jsDelivr only.
- Loading Graphy with `/+esm` instead of `dist/index.browser.mjs`.
- `@graphysdk/react@1` on jsDelivr. That tag 404s. Use `@latest` or an exact version.
- Saving `/+esm` files and serving them without rewriting `from"/npm/.../+esm"` to relative paths.
- An HTML artifact with a React component file and a bare `@graphysdk/react` import. That package is not on the artifact allow-list.
- Skipping `<meta charset="utf-8" />` in `<head>`. Curly quotes and degree signs then break on some hosts.
