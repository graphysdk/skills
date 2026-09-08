# React API

`@graphysdk/react-renderer` paints a compiled spec with two components: `<GraphProvider>` (owns the
spec, compiles, recompiles on change) wrapping `<GraphRenderer>` (owns layout and DOM). The nesting
is mandatory — the renderer has no standalone mode and throws outside a provider.

The JS entry imports its own stylesheet; you never import one yourself (`reference/install.md`).

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
| `handleRef` | `Ref<GraphHandle>` | Filled with this graph's imperative handle (`commands`, `subscribe`, `getCompiled`, `undo`, `redo`, `getSelection`/`setSelection`/`subscribeSelection`), for surfaces mounted outside the provider where the hooks can't reach. |
| `onChange` | `(next: SpecInput) => void` | Fires when the live spec changes via commands. Irrelevant for plain chart building. |
| `onError` | `(errors: VizDiagnostic[]) => void` | Compile failures and caught render-throws. |
| `onWarnings` | `(warnings: VizDiagnostic[]) => void` | Advisory diagnostics from a successful compile. |
| `colorScheme` | `ColorScheme` (`'light' \| 'dark'`) | Default `'light'`. Resolves the stylesheet's `{ light, dark }` colors and picks the base theme tokens. |
| `themeOverrides` | `ThemeOverrides` | Theme tokens for the few HTML-chrome details the stylesheet has no target for (see `reference/styling.md`). |
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
| `mode` | `GraphMode` (`'readonly' \| 'editable'`) | Default `'readonly'`, which is what chart building wants. `'editable'` only does anything under `EditableGraphRenderer` — see "Editing" below. |
| `slots` | `GraphSlots` | Per-region overrides: bare components for `Header`, `Footer`, `Tooltip`, `Grid`, `Swatch`, `EditorSurface`; `{ render, measure }` for `Legend`, `Headline`, `AxisTicks`, `AxisLabel`. Unspecified regions render their default. See `reference/slots.md`. |

### GraphSizing

```ts
type GraphSizing =
  | { mode: 'responsive' } // fill the parent container (default)
  | { mode: 'fixed'; width: number; height: number }
  | { mode: 'keepAspectRatio'; intrinsicWidth: number; intrinsicHeight: number }
  | { mode: 'keepAspectRatio'; intrinsicWidth: number; aspectRatio: number }
  | { mode: 'keepAspectRatio'; intrinsicHeight: number; aspectRatio: number };
```

`'fixed'` paints immediately. `'responsive'` and `'keepAspectRatio'` paint only once the container
measures a positive width and height; a zero-size parent logs `[graphy] ZERO_SIZE_CONTAINER` and waits. `'keepAspectRatio'` reserves space
with CSS `aspect-ratio`, then scales the intrinsic box to the container width with a CSS transform.

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

`IntroAnimationOptions` (not exported; reachable structurally) and defaults: `enabled: true`,
`durationScale: 1`, `stagger: true`, `staggerOrder: 'main-axis'`, `maxAnimatedGeoms: 1500` — the
geom count across all layers above which the intro is skipped (transitions are not gated by it).
The two kinds are independent — turning one off leaves the other running. A viewer's reduced-motion
preference disables all animation whatever you pass.

Live data: push new `data` and keep `input` the same object, since a new `input` reference forces a
full compile. Pass `{ transitions: false }` when pushes come faster than a spring settles.

```tsx
<GraphRenderer animation={false} />
<GraphRenderer animation={{ intro: { durationScale: 0.5, maxAnimatedGeoms: 3000 }, transitions: true }} />
```

## Locales

`Locale` is exactly `'en-GB' | 'en-US' | 'ar' | 'pt-PT'`. Two fallbacks apply, and they differ:

- **Number/date formatting** — `formattingLocale` falls back to `config.parsingLocale`, whose default
  is `'en-US'`.
- **UI strings** (editor labels, built-in copy) — anything unrecognized normalizes to `'en-GB'`.
  Legacy forms like `EN_GB` are accepted and normalized.

## Editing: the `./editable` entrypoint

Editing lives at `@graphysdk/react-renderer/editable`, which exports `EditableGraphRenderer` (the
renderer body wrapped in the editor providers, taking the same `GraphRendererProps`; a caller-supplied
`EditorSurface` slot replaces the editor's own layer), `EditorPanel`,
its section, layout and control components, the panel hooks, and `IntlProvider`.

```tsx
import { EditableGraphRenderer } from '@graphysdk/react-renderer/editable';
```

The `EditorSurface` slot defaults to a no-op, so a read-only embed importing only from the package
root bundles no editing code — keep it that way. Chart *building*, the subject of this skill, needs
nothing from `./editable`; this file documents the read-only surface. Embedding the editor, the
panel, commands/undo and programmatic editing are the **`graphy-editor`** skill.

## Related packages

`@graphysdk/react` is the standard install and wraps this package: the same surface plus the spec
builders re-exported, with a `GraphProvider` whose "Made with Graphy" provenance badge is on by
default — it seeds `config.content.brandMark.enabled` (and `isBrandMarkVisible`) beneath your
`input`, so either key set explicitly wins. Its editing half sits at `@graphysdk/react/editable`.
`@graphysdk/react-renderer` — this package — is the advanced mode: the badge is off, for embedders
and advanced integrators. Everything this file documents applies to both; only the import specifier
differs. The badge reaches Header/Footer slot overrides as `brandMark: BrandMarkVisual`; see
`reference/slots.md`.

## Beyond rendering

Exported and out of scope here, but worth knowing they exist: `GraphHandle` / `useGraphHandle` /
`useHandleCompiled`, `useGraphCommands`, `useGraphHistory`, `useGraphHistoryShortcuts`,
`useCompiledSelector`, `useGraphSelection`, `DevToolsPanel`, `TextMeasurerProvider` /
`CanvasTextMeasurer` / `useTextMeasurer`, `HoverProvider` / `useHoverState`, `pruneSelection`, `lightenCss`, the theme exports
`vars` / `ThemeProvider` / `lightTheme` / `darkTheme`, and the plugin surface (`createGraphyKit`,
`defineGeomRenderer`, `UnitSpaceSvg`, `useStyleReaders`, `useGeomHitTest`, `useGeomHover`,
`useElementScreenRect`, `DefaultSwatch` — `reference/plugins.md`). Full signatures in
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
