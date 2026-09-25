# Setup

Contents

- Install
- Which package to use
- First graph
- Mental model
- Hiding the brand mark
- Editable graphs
- CDN without a bundler
- Pitfalls

## Install

```bash
npm install @graphysdk/react
# or
pnpm add @graphysdk/react
yarn add @graphysdk/react
bun add @graphysdk/react
```

Requires React 19 (`react` is a peer dependency). There is no stylesheet to import. `@graphysdk/react-renderer`, which this package re-exports, imports its own CSS file, so the bundler must handle CSS imports, which Vite, Next.js, and webpack with a CSS loader all do. The CDN build injects its styles at runtime instead. The components run in the browser; in the Next.js app router put `'use client'` at the top of the file that renders them.

`@graphysdk/react` depends on `@graphysdk/viz-engine` and `@graphysdk/react-renderer` and re-exports what an app needs from both. You do not install them separately unless you import from them directly.

## Which package to use

- `@graphysdk/react`: the default choice. Spec builders, `GraphProvider`, `GraphRenderer`, hooks, slots, and plugin authoring from one import. The "Made with Graphy" mark is on by default.
- `@graphysdk/react-renderer`: the same React components and hooks, but no spec builders and the mark off by default. Pair it with `@graphysdk/viz-engine` for the builders.
- `@graphysdk/viz-engine`: the engine alone. Build a spec, compile it with `createCompiler`, and read the scene. No React, no DOM.

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

An explicit setting always wins over a package default, so a spec moves between packages without changes.

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

`GraphRenderer` fills its container by default, so give the container a height.

## Mental model

Two inputs go into `GraphProvider`: `data` (a table of columns and rows, see data.md) and `spec` (what to draw, see spec.md). The provider compiles both into a scene. `GraphRenderer` paints that scene and handles hover, tooltips, and resizing.

A spec is built with `pipe`. `createSpec({ x, y, color, ... })` maps columns to aesthetics. Each further call adds one thing: `geom.bar()` adds a layer, `scale.x()` and `scale.y()` declare the position scales, `config({...})` sets titles and axes, `styles({...})` sets paint. Position scales are never added for you: every mapped `x` and `y` needs a `scale.x()` or `scale.y()` call.

Build a spec once, outside render, or memoize it. A new spec object recompiles the graph.

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

`@graphysdk/react` only turns the mark on when the spec says nothing about it. `brandMark.enabled` also takes `placement` and `variant` next to it (`BrandMarkConfig` in types.md § Supporting types).

## Editable graphs

`@graphysdk/react/editable` adds `EditableGraphRenderer`, the editor panel and its controls. That surface is covered by the graphy-editor skill, not this one. Its TipTap peer dependencies (`@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/extensions`, and the `@tiptap/extension-*` packages) are optional and only needed when you import from `/editable`. The main entry needs none of them.

## CDN without a bundler

The package ships a single-file browser build at `dist/index.browser.mjs` (the package's `jsdelivr` entry). It bundles viz-engine, react-renderer, and all styles. Only `react`, `react-dom`, and `react/jsx-runtime` stay external, so the page supplies them through an import map and every module shares one React.

```html
<!doctype html>
<meta charset="utf-8" />
<div id="graph" style="height: 320px"></div>
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.2.0",
      "react/jsx-runtime": "https://esm.sh/react@19.2.0/jsx-runtime",
      "react-dom": "https://esm.sh/react-dom@19.2.0",
      "react-dom/client": "https://esm.sh/react-dom@19.2.0/client",
      "@graphysdk/react": "https://cdn.jsdelivr.net/npm/@graphysdk/react@1/dist/index.browser.mjs"
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
```

Pin the same React version in every import map entry. The editing surface has its own file, `dist/editable.browser.mjs`, which is a superset of the read-only one. A page imports one of the two, never both.

## Pitfalls

- Forgetting `scale.x()` and `scale.y()`. Position scales are declared, not inferred from the mapping. Without them nothing is placed.
- A container with no height. `GraphRenderer` is responsive by default and needs a sized parent (see react.md § Sizing).
- Building the spec inside render without `useMemo`. Every render then recompiles the graph.
- Mixing `@graphysdk/react` and `@graphysdk/react-renderer` providers in one app is fine, but the mark default differs between them.
- Installing TipTap for a read-only graph. Those peers are only for `/editable`.
