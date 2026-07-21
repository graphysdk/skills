# React API

`@graphysdk/react-renderer` paints a compiled spec with two components: `<GraphProvider>` (owns the spec, compiles, recompiles on change) wrapping `<GraphRenderer>` (owns layout and DOM). The nesting is mandatory — the renderer has no standalone mode and throws outside a provider.

**Import the stylesheet once per app** or nothing paints correctly:

```ts
import '@graphysdk/react-renderer/styles.css';
```

## Minimal component

```tsx
import { createSpec, pipe, mapping, geom, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: 1850 },
  ],
};

const input = pipe(createSpec(), mapping({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export function RevenueChart() {
  return (
    <div style={{ width: 640, height: 400 }}>
      <GraphProvider data={data} input={input}>
        <GraphRenderer />
      </GraphProvider>
    </div>
  );
}
```

Default sizing is responsive, so the chart fills whatever sized container you give it.

## GraphProviderProps

| Prop | Type | Notes |
|---|---|---|
| `data` | `Data` | The table to visualize (see `reference/data.md`). Reactive; a new reference re-parses and recompiles. |
| `input` | `CompilerInput` | The spec from `pipe(createSpec(), …)`. Reactive; a new reference recompiles. |
| `plugins` | `readonly Plugin[]?` | Custom geoms/stats/transforms and renderer overrides (see `reference/plugins.md`). **Frozen at mount** — to change the set, remount with a React `key`. |
| `formattingLocale` | `Locale?` | Display locale for axis ticks, tooltips, legends, headline. Falls back to `config.parsingLocale` (default `'en-US'`). |
| `onChange` | `(next: CompilerInput) => void` | Fires when the live spec changes (commands). Irrelevant for plain chart building. |
| `onError` | `(errors: VizDiagnostic[]) => void` | Fires with the failure diagnostics whenever a compile or a render throw produces errors. |
| `onWarnings` | `(warnings: VizDiagnostic[]) => void` | Fires with advisory diagnostics from a successful compile. |
| `theme` | `'light' \| 'dark'` | Base theme. Default `'light'`. |
| `themeOverrides` | `ThemeOverrides?` | Token-level restyling of colors, fonts, and chrome (see `reference/theming.md`). |
| `customPalettes` | `CustomPalettesInput?` | Named palettes (`Record<string, CustomPaletteColor[]>`) that specs can reference by name. |
| `fontList` | `Array<{ id: string; fontFamily: string }>?` | Inert for spec-builder input — leave unset. Custom fonts come from `themeOverrides` font tokens plus a stylesheet on the host page (see `reference/theming.md`). |
| `children` | `ReactNode` | Usually one `<GraphRenderer>`. |

`VizDiagnostic` is a plain serializable object: `{ message, severity, kind, code, context?, suggestion? }`. `suggestion` is a repair hint — surface it when debugging a spec.

## GraphRendererProps

| Prop | Type | Notes |
|---|---|---|
| `sizing` | `GraphSizing?` | How the chart claims space. Default `{ mode: 'responsive' }` (fill the parent). |
| `onResize` | `(state: { width, height, isDefault }) => void` | Fires on container resize, in every sizing mode. |
| `isAnimated` | `boolean?` | Entry/update animation. Default: animate unless the OS requests reduced motion. |
| `showTooltips` | `boolean?` | Hover tooltips. Default `true`. |
| `mode` | `'readonly' \| 'editable'` | The default `'readonly'` is correct for chart building. |
| `slots` | `GraphSlots?` | Per-region component overrides (header, footer, legend, tooltip, …); unspecified regions render their default. See `reference/slots.md`. |

### GraphSizing

```ts
type GraphSizing =
  | { mode: 'responsive' } // fill the parent container (default)
  | { mode: 'fixed'; width: number; height: number }
  | { mode: 'keepAspectRatio'; intrinsicWidth: number; intrinsicHeight: number }
  | { mode: 'keepAspectRatio'; intrinsicWidth: number; aspectRatio: number }
  | { mode: 'keepAspectRatio'; intrinsicHeight: number; aspectRatio: number };
```

With `'responsive'`, give the parent element a real height — a 0-height parent renders a 0-height chart. `'keepAspectRatio'` scales to the container width while holding the given ratio.

## Error handling

The provider wraps its children in a `GraphErrorBoundary` automatically. Both failure modes converge there:

- **Compile failures** (bad spec, bad mapping) render an in-place error panel showing the diagnostics — the page never blanks.
- **Render throws** from any renderer component are caught and shown in the same panel; the diagnostic is also logged and passed to `onError`.

The boundary resets when the `input` or `data` reference changes, so passing a fixed spec recovers the chart without a remount. You rarely mount `GraphErrorBoundary` yourself; use `onError`/`onWarnings` to observe diagnostics programmatically, and validate specs headlessly with `scripts/validate-spec.mjs` before rendering.
