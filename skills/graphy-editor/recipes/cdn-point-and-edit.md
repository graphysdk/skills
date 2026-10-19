# Point and edit on a CDN page

This HTML page runs without a bundler, as an artifact or a standalone file. The `dist/editable.browser.mjs` bundle includes the read-only renderer, editor and commands. Point `@graphysdk/react` to that bundle in the import map and import everything from it. See the graphy-charts setup reference for the import map, pinned React version and steps to use when the CDN is blocked.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Chart editor</title>
  </head>
  <body>
    <div style="display: flex; gap: 8px; margin-bottom: 8px">
      <button id="undo">Undo</button>
      <button id="redo">Redo</button>
      <button id="save">Copy spec</button>
    </div>
    <div id="graph" style="height: 400px"></div>
    <script type="importmap">
      {
        "imports": {
          "react": "https://cdn.jsdelivr.net/npm/react@19.2.0/+esm",
          "react/jsx-runtime": "https://cdn.jsdelivr.net/npm/react@19.2.0/jsx-runtime/+esm",
          "react-dom": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/+esm",
          "react-dom/client": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/client/+esm",
          "@graphysdk/react": "https://cdn.jsdelivr.net/npm/@graphysdk/react@1.9.0-beta.1792419363022/dist/editable.browser.mjs"
        }
      }
    </script>
    <script type="module">
      import { createElement, useRef, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import {
        EditableGraphRenderer,
        GraphProvider,
        config,
        createSpec,
        geom,
        pipe,
        scale,
        useGraphHistoryShortcuts,
      } from '@graphysdk/react';

      const data = {
        columns: [{ key: 'quarter' }, { key: 'region' }, { key: 'sales' }],
        rows: [
          { quarter: 'Q1', region: 'EU', sales: 1200 },
          { quarter: 'Q1', region: 'US', sales: 1500 },
          { quarter: 'Q2', region: 'EU', sales: 1800 },
          { quarter: 'Q2', region: 'US', sales: 1600 },
        ],
      };

      const initialSpec = pipe(
        createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
        geom.bar({ position: 'dodge' }),
        scale.x(),
        scale.y(),
        config({ content: { title: 'Sales by quarter' } })
      );

      const palettePresets = { Warm: ['#E03030', '#E08A30', '#E0C030'], Cool: ['#2060E0', '#30A0E0', '#30D0C0'] };
      const query = matchMedia('(prefers-color-scheme: dark)');

      // A small component, so the hooks work without JSX: the handle for the buttons and the shortcuts.
      function Editor() {
        const [spec, setSpec] = useState(initialSpec);
        const handleRef = useRef(null);
        useGraphHistoryShortcuts(handleRef);
        document.getElementById('undo').onclick = () => handleRef.current?.undo();
        document.getElementById('redo').onclick = () => handleRef.current?.redo();
        document.getElementById('save').onclick = () => navigator.clipboard.writeText(JSON.stringify(spec, null, 2));

        return createElement(
          GraphProvider,
          { spec, data, handleRef, onSpecChange: setSpec, colorScheme: query.matches ? 'dark' : 'light' },
          createElement(EditableGraphRenderer, { mode: 'point-and-edit', palettePresets })
        );
      }

      const root = createRoot(document.getElementById('graph'));
      const render = () => root.render(createElement(Editor));
      render();
      query.addEventListener('change', render);
    </script>
  </body>
</html>
```

Details:

- Load only the editing bundle; it includes the read-only renderer. Pages that only display charts can use `index.browser.mjs`.
- `createElement` builds the React tree without JSX. A small `Editor` component keeps the spec in state, so `onSpecChange` feeds it straight back, the same loop-safe round trip as in React code.
- The buttons use the handle. `useGraphHistoryShortcuts` binds the keyboard the same way it does in a React app, because it runs inside the component.
- Copy spec writes the edited chart to the clipboard as JSON. Pass it back as `spec` to restore the chart.
- The color scheme follows the system and renders again when it changes. For themes and offline setup, follow the graphy-charts setup reference and vendor `editable.browser.mjs`.
