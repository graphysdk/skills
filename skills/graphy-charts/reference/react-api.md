# React API

`@graphysdk/react-renderer` paints a compiled spec with two components: `<GraphProvider>` (owns the
spec, compiles, recompiles on change) wrapping `<GraphRenderer>` (owns layout and DOM). The nesting
is mandatory — the renderer has no standalone mode and throws outside a provider.

Styles ship inside the JS bundle: importing the components is all it takes to paint.

## Minimal component

```tsx
import { createSpec, pipe, mapping, geom, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

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

`data`, `input` and `children` are required; every other prop is optional.

| Prop | Type | Notes |
|---|---|---|
| `data` | `Data` | **Required.** The table to visualize (see `reference/data.md`). Reactive; a new reference re-parses and recompiles. Also an error-boundary reset key. |
| `input` | `SpecInput` | **Required.** The spec from `pipe(createSpec(), …)`. Reactive; a new reference recompiles. Also a reset key. |
| `children` | `ReactNode` | **Required.** Usually one `<GraphRenderer>` or `<EditableGraphRenderer>`. |
| `plugins` | `readonly Plugin[]` | Custom geoms/stats/transforms and their render halves (see `reference/plugins.md`). Default `[]`. **Frozen at mount** — to change the set, remount with a React `key`. |
| `formattingLocale` | `Locale` | Display locale for ticks, tooltips, legends, headline. See "Locales" below. |
| `handleRef` | `Ref<GraphHandle>` | Filled with this graph's imperative handle (`commands`, `subscribe`, `getCompiled`, `undo`, `redo`, selection), for surfaces mounted outside the provider where the hooks can't reach. |
| `onChange` | `(next: SpecInput) => void` | Fires when the live spec changes via commands. Irrelevant for plain chart building. |
| `onError` | `(errors: VizDiagnostic[]) => void` | Compile failures and caught render-throws. |
| `onWarnings` | `(warnings: VizDiagnostic[]) => void` | Advisory diagnostics from a successful compile. |
| `colorScheme` | `ColorScheme` (`'light' \| 'dark'`) | Default `'light'`. Drives both the theme tokens and the stylesheet's light-dark resolution. |
| `themeOverrides` | `ThemeOverrides` | Token-level restyling of the HTML chrome (see `reference/theming.md`). |
| `customPalettes` | `CustomPalettesInput` | Named palettes (`Record<string, CustomPaletteColor[]>`) that specs reference by id. |

`VizDiagnostic` is a plain serializable object: `{ message, severity, kind, code, context?, suggestion? }`.
`suggestion` is a repair hint — surface it when debugging a spec.

## GraphRendererProps

Every prop is optional.

| Prop | Type | Notes |
|---|---|---|
| `sizing` | `GraphSizing` | How the chart claims space. Default `{ mode: 'responsive' }` (fill the parent). |
| `onResize` | `ResizeObserverOnResize` | `(state: ResizeObserverState) => void`, i.e. `{ width, height, isDefault }`. Fires in every sizing mode. |
| `animation` | `GraphAnimation` | `boolean \| { intro?, transitions? }`. Default: everything on. See below. |
| `showTooltips` | `boolean` | Hover tooltips. Default `true`. |
| `mode` | `GraphMode` (`'readonly' \| 'editable'`) | Default `'readonly'`, which is what chart building wants. `'editable'` takes effect only when the `EditorSurface` slot is filled — see "Editing" below. |
| `slots` | `GraphSlots` | Per-region component overrides (header, footer, legend, tooltip, …); unspecified regions render their default. See `reference/slots.md`. |

### GraphSizing

```ts
type GraphSizing =
  | { mode: 'responsive' } // fill the parent container (default)
  | { mode: 'fixed'; width: number; height: number }
  | { mode: 'keepAspectRatio'; intrinsicWidth: number; intrinsicHeight: number }
  | { mode: 'keepAspectRatio'; intrinsicWidth: number; aspectRatio: number }
  | { mode: 'keepAspectRatio'; intrinsicHeight: number; aspectRatio: number };
```

With `'responsive'`, give the parent element a real height — a 0-height parent renders a 0-height
chart. `'keepAspectRatio'` scales to the container width while holding the given ratio.

### GraphAnimation

```ts
type GraphAnimation = boolean | GraphAnimationProps;

interface GraphAnimationProps {
  /** Intro played on first mount and on chart-type change. `false` off, object tunes it. */
  intro?: boolean | Partial<IntroAnimationOptions>;
  /** Whether geoms animate to new positions when the data changes. */
  transitions?: boolean;
}
```

`IntroAnimationOptions` fields: `enabled`, `durationScale`, `stagger`, `staggerOrder`,
`maxAnimatedGeoms`. The two kinds are independent — turning one off leaves the other running. A
viewer's reduced-motion preference disables all animation whatever you pass.

```tsx
<GraphRenderer animation={false} />
<GraphRenderer animation={{ intro: { durationScale: 0.5 }, transitions: true }} />
```

## Locales

`Locale` is exactly `'en-GB' | 'en-US' | 'ar' | 'pt-PT'`. Two fallbacks apply, and they differ:

- **Number/date formatting** — `formattingLocale` falls back to `config.parsingLocale`, whose default
  is `'en-US'`.
- **UI strings** (editor labels, built-in copy) — anything unrecognized normalizes to `'en-GB'`.
  Legacy forms like `EN_GB` are accepted and normalized.

## Editing: the `./editable` entrypoint

Editing lives at `@graphysdk/react-renderer/editable`, which exports `EditableGraphRenderer` (a
`GraphRenderer` with the `EditorSurface` slot pre-filled), `EditorPanel`, its section and control
components, and `IntlProvider`.

```tsx
import { EditableGraphRenderer } from '@graphysdk/react-renderer/editable';
```

The `EditorSurface` slot defaults to a no-op, so a read-only embed importing only from the package
root bundles no editing code — keep it that way. Chart *building*, the subject of this skill, needs
nothing from `./editable`; this file documents the read-only surface. Embedding the editor, the
panel, commands/undo and programmatic editing are the **`graphy-editor`** skill.

## Related packages

`@graphysdk/react` is the batteries-included wrapper around this one: the same surface, with a
`GraphProvider` whose "Made with Graphy" provenance badge is on by default (its editing half sits at
`@graphysdk/react/editable`). `@graphysdk/react-renderer` — this package — leaves the badge off, for
embedders and advanced integrators. The badge reaches Header/Footer slot overrides as
`brandMark: BrandMarkVisual`; see `reference/slots.md`.

## Beyond rendering

Exported and out of scope here, but worth knowing they exist: `GraphHandle` / `useGraphHandle` /
`useHandleCompiled`, `useGraphCommands`, `useGraphHistory`, `useGraphHistoryShortcuts`,
`useCompiledSelector`, `useGraphSelection`, `DevToolsPanel`, `TextMeasurerProvider` /
`CanvasTextMeasurer` / `useTextMeasurer`, `HoverProvider` / `useHoverState`. Full signatures in
`reference/types.md`. The handle, commands, history and selection hooks are the editing surface —
documented in the `graphy-editor` skill.

## Error handling

The provider wraps its children in a `GraphErrorBoundary` automatically. Both failure modes converge
on the same in-place `GraphErrorPanel` (which shows `code` / `message` / `suggestion`), so the page
never blanks:

- **Compile failures** (bad spec, bad mapping) are handed to the boundary as forced errors; the
  compile path reports them through `onError` itself.
- **Render throws** from any renderer component are caught by the boundary, logged, and passed to
  `onError`.

The boundary resets when the `input` or `data` reference changes, so passing a fixed spec recovers
the chart without a remount. Both `GraphErrorBoundary` and `GraphErrorPanel` are exported, though you
rarely mount either yourself; use `onError`/`onWarnings` to observe diagnostics programmatically, and
validate specs headlessly with `scripts/validate-spec.mjs` before rendering.
