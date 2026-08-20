# CDN (no bundler)

`@graphysdk/react` ships browser-ready bundles that load straight from jsDelivr in a
`<script type="module">` — no bundler, no npm install, no registry auth. One URL carries the whole
SDK: engine, renderer, spec builders, styles included. Only public versions work; jsDelivr cannot
serve private packages.

## Pick one bundle

| Bundle | URL |
|---|---|
| **Read-only** — render charts | `https://cdn.jsdelivr.net/npm/@graphysdk/react@<version>/dist/index.browser.mjs` |
| **Editable** — read-only plus the editing components (`EditableGraphRenderer`, `EditorPanel`, …) | `https://cdn.jsdelivr.net/npm/@graphysdk/react@<version>/dist/editable.browser.mjs` |

Import exactly one. The editable bundle includes everything the read-only one has, so a page that
edits loads only it — loading both puts two copies of the renderer on the page, and a provider
from one copy is invisible to components from the other. The editable bundle is roughly twice the
download, with its text-editing dependencies included; it needs nothing beyond the import map
below. How to use the editing components is the `graphy-editor` skill.

The bare package URL `https://cdn.jsdelivr.net/npm/@graphysdk/react` resolves to the read-only
bundle at the latest published version — handy for a first try. Pin `@<version>` in anything that
ships, so a new release can't change your page underneath you.

## Supply React through an import map

React is not included in the bundles — the page provides it, so the SDK and your own code share
one copy. The import map needs all four entries:

```html
<!doctype html>
<html>
  <body>
    <div id="chart"></div>
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@19.2.0",
          "react/": "https://esm.sh/react@19.2.0/",
          "react-dom": "https://esm.sh/react-dom@19.2.0",
          "react-dom/": "https://esm.sh/react-dom@19.2.0/"
        }
      }
    </script>
    <script type="module">
      import { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import {
        GraphProvider,
        GraphRenderer,
        createSpec,
        pipe,
        mapping,
        geom,
        scale,
      } from 'https://cdn.jsdelivr.net/npm/@graphysdk/react';

      const data = {
        columns: [{ key: 'month' }, { key: 'revenue' }],
        rows: [
          { month: 'Jan', revenue: 1200 },
          { month: 'Feb', revenue: 1850 },
          { month: 'Mar', revenue: 1600 },
        ],
      };

      const input = pipe(createSpec(), mapping({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

      createRoot(document.getElementById('chart')).render(
        createElement(
          GraphProvider,
          { data, input },
          createElement(GraphRenderer, { sizing: { mode: 'fixed', width: 640, height: 400 } })
        )
      );
    </script>
  </body>
</html>
```

The editable bundle uses this same import map — no extra entries.

There is no build step, so there is no JSX — compose with `createElement`, or bring
[htm](https://github.com/developit/htm) for JSX-like syntax. Everything else in this skill applies
unchanged; only the import URL differs.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Failed to resolve module specifier "react"` | The import map is missing or placed after the module script. It must come first, with all four entries. |
| Editor components never see the chart | The page imports both bundles. Import only `editable.browser.mjs`; it includes the read-only components too. |
| 404 from jsDelivr | The version in the URL is not public, or predates the browser bundles. Check `https://cdn.jsdelivr.net/npm/@graphysdk/react/` for available files. |
| Page broke without any change on your side | The import URL is unpinned, and a new SDK version was published. Pin `@<version>`. |
| Graph area blank or zero height | Responsive sizing inside a parent with no height. Give the parent a height, or use fixed sizing as above. |
