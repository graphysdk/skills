# React API

The two components every graph needs, their props, and the hooks around them.

Contents

- GraphProvider
- GraphRenderer
- Sizing
- Animation
- Live data
- Colour scheme and theme
- Formatting locale
- Custom palettes
- Errors and warnings
- The graph handle
- Hooks inside the tree
- Text measurement and server rendering
- The brand mark
- Pitfalls

Exact types: types.md § Provider & renderer, § Animation, § Diagnostics.

## GraphProvider

`GraphProvider` compiles `data` against `spec` and holds the result. `GraphRenderer` paints it. The provider must wrap the renderer.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const data: Data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 120 },
    { month: 'Feb', revenue: 150 },
    { month: 'Mar', revenue: 90 },
  ],
};

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export const RevenueGraph = () => (
  <GraphProvider data={data} spec={spec}>
    <GraphRenderer />
  </GraphProvider>
);
```

Props:

- `data`: the table to draw. See data.md.
- `spec`: what to draw. See spec.md.
- `plugins`: custom geoms, stats and transforms. Read once at mount. See plugins.md.
- `formattingLocale`: how displayed values are formatted. See below.
- `colorScheme`: `'light'` (default) or `'dark'`.
- `customPalettes`: named colour lists a spec can pick with `scale.color.palette`.
- `handleRef`: filled with a `GraphHandle` for code outside the tree.
- `onSpecChange`: fires with the new spec after a committed command, an undo or a redo. See "Commands and onSpecChange".
- `onError`: fires with the diagnostics of a failed compile, a render crash, or a command, undo or redo the compiler refused.
- `onWarnings`: fires with the warnings of a successful compile.
- `children`: usually one `GraphRenderer`.

Exported types: `GraphProviderProps` for the props, `ColorScheme`, `Scene` and `ResolvedSpec` for what the hooks return.

`@graphysdk/react` and `@graphysdk/react-renderer` export a `GraphProvider` with the same props. The one from `@graphysdk/react` turns the brand mark on by default. See "The brand mark".

## GraphRenderer

`GraphRenderer` paints the scene the surrounding provider holds. It has no data or spec props.

```tsx
import { GraphRenderer } from '@graphysdk/react';

export const Renderer = () => (
  <GraphRenderer sizing={{ mode: 'fixed', width: 640, height: 400 }} animation={false} showTooltips={true} />
);
```

Props:

- `sizing`: how the graph claims space. Default `{ mode: 'responsive' }`.
- `onResize`: called with `{ width, height, isDefault }` whenever the container changes size.
- `animation`: `true`, `false`, or an object. See "Animation".
- `showTooltips`: default `true`.
- `mode`: `'readonly'` (default), `'editable'` or `'point-and-edit'`. A string that names no mode resolves to `'readonly'`. Both editing modes turn tooltips off and need `EditableGraphRenderer` from `@graphysdk/react/editable`. Editing is covered by the graphy-editor skill.
- `slots`: replace how a region paints. See slots.md.

Exported types: `GraphRendererProps`, `GraphMode`, and the `GRAPH_MODES` constant with `readonly`, `editable` and `pointAndEdit` keys.

## Sizing

Three modes. The container is the element around the renderer.

```tsx
import { GraphRenderer } from '@graphysdk/react';

// Fill the parent. The parent must have a height.
const responsive = <GraphRenderer sizing={{ mode: 'responsive' }} />;

// Exact pixels.
const fixed = <GraphRenderer sizing={{ mode: 'fixed', width: 800, height: 500 }} />;

// Fill the width and keep a ratio. Give two of intrinsicWidth, intrinsicHeight and aspectRatio.
const ratio = <GraphRenderer sizing={{ mode: 'keepAspectRatio', intrinsicWidth: 800, intrinsicHeight: 500 }} />;
const ratioFromWidth = <GraphRenderer sizing={{ mode: 'keepAspectRatio', intrinsicWidth: 800, aspectRatio: 16 / 9 }} />;
```

`onResize` fires in every mode and reports the container, not the plot panel. Sizes are rounded to integers and a repeat of the same size is skipped. `keepAspectRatio` paints the graph at its intrinsic size inside a wrapper scaled with a CSS transform, and reserves the box with CSS `aspect-ratio` before the first measurement.

Exported types: `GraphSizing` for the prop, `ResizeObserverOnResize` for the callback and `ResizeObserverState` for what it receives.

A responsive graph in a container with zero width or height paints nothing and logs `[graphy] ZERO_SIZE_CONTAINER` once. A fixed graph paints straight away. `keepAspectRatio` throws when a dimension is not a positive number.

## Animation

`animation` is a boolean or an object with three optional keys.

```tsx
import { GraphRenderer } from '@graphysdk/react';

// Turn everything off.
const still = <GraphRenderer animation={false} />;

// Keep the entrance, stop geoms from moving when data changes.
const introOnly = <GraphRenderer animation={{ transitions: false }} />;

// Tune the entrance.
const slowIntro = (
  <GraphRenderer animation={{ intro: { durationScale: 2, stagger: true, staggerOrder: 'value-ascending' } }} />
);

// Animate only small graphs.
const capped = <GraphRenderer animation={{ maxAnimatedGeoms: 300 }} />;
```

- `intro`: the entrance played once, when the graph mounts. A later change of coordinate system swaps the geom layers in without an entrance. `false` or `{ enabled, durationScale, stagger, staggerOrder }`. `staggerOrder` is `'main-axis'`, `'value-ascending'` or `'value-descending'`.
- `transitions`: whether geoms move to their new place when the data changes. Default on.
- `maxAnimatedGeoms`: above this many geoms nothing animates. Default 1500. A line or an area counts as one geom.

A viewer who prefers reduced motion gets no animation whatever the prop says.

Exported types: `GraphAnimation` for the prop and `GraphAnimationProps` for the object form.

## Live data

The provider recompiles when `data`, `spec`, `customPalettes` or `colorScheme` change by reference. Pass a new `data` object and the graph updates, with transitions if they are on.

```tsx
import { useEffect, useMemo, useState } from 'react';

import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

export const LiveGraph = ({ initial }: { initial: Data }) => {
  const [data, setData] = useState(initial);

  useEffect(() => {
    const timer = setInterval(() => setData((current) => ({ ...current, rows: [...current.rows, nextRow()] })), 1000);
    return () => clearInterval(timer);
  }, []);

  // Build the spec once. A new spec object on every render recompiles on every render.
  const spec = useMemo(() => pipe(createSpec({ x: 'time', y: 'value' }), geom.line(), scale.x(), scale.y()), []);

  return (
    <GraphProvider data={data} spec={spec}>
      <GraphRenderer animation={{ transitions: false }} />
    </GraphProvider>
  );
};

const nextRow = () => ({ time: new Date(), value: Math.random() * 100 });
```

A new `spec` prop replaces the graph: uncommitted edits are dropped, and the undo history is cleared once the new spec compiles. A spec that fails to compile leaves the history in place. A new `data`, `customPalettes` or `colorScheme` recompiles the spec as edited and keeps the history. Passing the spec received from `onSpecChange` back into the `spec` prop is recognised as an echo: no recompile, no history clear.

`plugins` is the one prop that is not live. It is read once at mount. To change the plugin set, remount the provider with a new `key`.

## Colour scheme and theme

`colorScheme` picks the light or dark side of every style token and the tones of the default palette. Stylesheet colours written as `{ light, dark }` follow it too. See styling.md.

```tsx
import { GraphProvider, GraphRenderer } from '@graphysdk/react';
import type { Data, Spec } from '@graphysdk/react';

export const DarkGraph = ({ data, spec }: { data: Data; spec: Spec }) => (
  <GraphProvider data={data} spec={spec} colorScheme="dark">
    <GraphRenderer />
  </GraphProvider>
);
```

The renderer mounts its own `ThemeProvider`. `ThemeProvider`, `vars`, `lightTheme` and `darkTheme` are exported for UI you build beside the graph that wants the same tokens. `ThemeProvider` takes `colorScheme` and optional `textScale`, `graphBackground`, `graphFontFamily` and `headingFontFamily`. A graph never needs them. The token types are `ThemeValues`, `ThemeKey` for one token name, and `ThemeOverrides` for a partial set.

## Formatting locale

`formattingLocale` sets how numbers and dates are displayed in ticks, tooltips, legends and headlines. It is one of `'en-GB'`, `'en-US'`, `'pt-PT'` or `'ar'`, and defaults to `config({ parsingLocale })` from the spec, which itself defaults to `'en-US'`.

```tsx
import { GraphProvider, GraphRenderer } from '@graphysdk/react';
import type { Data, Spec } from '@graphysdk/react';

export const PortugueseGraph = ({ data, spec }: { data: Data; spec: Spec }) => (
  <GraphProvider data={data} spec={spec} formattingLocale="pt-PT">
    <GraphRenderer />
  </GraphProvider>
);
```

Parsing and formatting are separate. `config({ parsingLocale })` in the spec says how to read the strings in the rows. `formattingLocale` says how to print the values. See data.md.

## Custom palettes

Register named palettes on the provider, then pick one in the spec.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const customPalettes = {
  brand: [
    { id: 'primary', hex: '#1d4ed8' },
    { id: 'secondary', hex: '#9333ea' },
    { id: 'warning', hex: '#dc2626' },
  ],
};

const spec = pipe(
  createSpec({ x: 'month', y: 'sales', color: 'region' }),
  geom.bar({ position: 'stack' }),
  scale.x(),
  scale.y(),
  scale.color.palette({ palette: { type: 'custom', id: 'brand' } })
);

export const BrandGraph = ({ data }: { data: Data }) => (
  <GraphProvider data={data} spec={spec} customPalettes={customPalettes}>
    <GraphRenderer />
  </GraphProvider>
);
```

Colours are assigned to groups in order. The `CustomPalettes` type is not exported from `@graphysdk/react`, so leave the object untyped. An id that is not registered gives a `PALETTE_NOT_FOUND` warning and the default palette.

`overrides` pins a group to a colour. Keys are group numbers counted from 1. A value is `{ hex }` or `{ id }` naming a colour of the active custom palette. `hex` wins when both are set. An id the palette does not have keeps the palette colour and logs a `PALETTE_NOT_FOUND` warning. A key below 1 is ignored.

```ts
import { scale } from '@graphysdk/react';

const pinned = scale.color.palette({
  palette: { type: 'custom', id: 'brand' },
  overrides: { 2: { id: 'warning' }, 3: { hex: '#0f766e' } },
});
```

## Errors and warnings

A spec that does not compile does not blank the page. The provider paints a panel in place that says "This chart could not be rendered." and lists each diagnostic's code, message and suggestion. It also logs to the console and calls `onError`. A later spec or data that compiles replaces the panel with the graph.

```tsx
import { useState } from 'react';

import { GraphProvider, GraphRenderer } from '@graphysdk/react';
import type { Data, Spec, VizDiagnostic } from '@graphysdk/react';

export const ReportingGraph = ({ data, spec }: { data: Data; spec: Spec }) => {
  const [errors, setErrors] = useState<VizDiagnostic[]>([]);
  const [warnings, setWarnings] = useState<VizDiagnostic[]>([]);

  return (
    <>
      <GraphProvider data={data} spec={spec} onError={setErrors} onWarnings={setWarnings}>
        <GraphRenderer />
      </GraphProvider>
      {errors.map((diagnostic) => (
        <p key={diagnostic.code}>
          {diagnostic.code}: {diagnostic.message} {diagnostic.suggestion}
        </p>
      ))}
      {warnings.length > 0 && <p>{warnings.length} warning(s)</p>}
    </>
  );
};
```

A `VizDiagnostic` has `severity` (`'error'` or `'warning'`), `kind`, `code`, `message`, and optional `suggestion` and `context`. `onWarnings` carries the compiler's warnings plus render-side ones, such as a plugin geom that has no renderer registered, and once at mount the plugin registration warnings. `onError` fires at mount with any plugin registration errors. A render crash inside the tree lands in the same panel and the same `onError`, and that panel clears when `spec` or `data` changes by reference. A plugin registration error stays on the panel across every later compile. A command, undo or redo the compiler refuses also reaches `onError`, and the graph keeps showing its last good state.

`GraphErrorBoundary` and `GraphErrorPanel` are exported. The boundary takes `forcedErrors`, `resetKeys` and `onError` and can wrap UI of your own. The panel takes `errors` and paints the same in-place message.

## The graph handle

Code mounted above or beside the provider cannot use the hooks. Give the provider a `handleRef` and read the `GraphHandle` it fills.

```tsx
import { useRef } from 'react';

import { GraphProvider, GraphRenderer, useGraphHistoryShortcuts, useHandleScene } from '@graphysdk/react';
import type { Data, GraphHandle, Spec } from '@graphysdk/react';

export const GraphWithToolbar = ({ data, spec }: { data: Data; spec: Spec }) => {
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  return (
    <>
      <button onClick={() => handleRef.current?.undo()}>Undo</button>
      <button onClick={() => handleRef.current?.redo()}>Redo</button>
      <GraphProvider data={data} spec={spec} handleRef={handleRef}>
        <GraphRenderer />
      </GraphProvider>
    </>
  );
};

const LayerCount = ({ handle }: { handle: GraphHandle }) => {
  const scene = useHandleScene(handle);
  return <span>{scene ? scene.layers.length : 0} layers</span>;
};
```

The handle has `commands` (`dispatch` and `commit`), `undo`, `redo`, `subscribe`, `getScene`, `getSelection`, `setSelection` and `subscribeSelection`. `getScene` returns `null` until the first successful compile. `undo` and `redo` return whether the graph took the step. A refused step reports through `onError`.

`useGraphHistoryShortcuts(handleRef, options)` binds Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z and Ctrl+Y to the handle while the caller is mounted. `options.target` is the element to listen on, a ref holding one, or `null` to bind nothing. Default `window`. `options.enabled` turns it off without unmounting. The options type is `GraphHistoryShortcutsOptions`. A chord typed into a text input, a textarea or a contenteditable element is left alone, and so is one with Alt held or one another handler already prevented. A range, checkbox, radio or button input passes the chord through to the graph.

Commands and editing are covered by the graphy-editor skill.

## Hooks inside the tree

Any component under the provider can read the scene.

```tsx
import { useGraphHistory, useSceneSelector } from '@graphysdk/react';

export const AxisTitle = () => {
  const axes = useSceneSelector((scene) => scene.guides.axes);
  return <span>{axes.map((axis) => axis.label ?? '').join(' / ')}</span>;
};

export const UndoButton = () => {
  const { undo, canUndo, undoDescription } = useGraphHistory();
  return (
    <button disabled={!canUndo} title={undoDescription ?? undefined} onClick={undo}>
      Undo
    </button>
  );
};
```

- `useSceneSelector(selector)`: a slice of the scene. Re-renders only when the slice changes by reference, so return existing objects rather than building new ones.
- `useGraphHandle(handle?)`: a handle built from the surrounding provider, or the explicit `handle` when one is given. Returns `null` outside a provider.
- `useGraphCommands()`: `{ dispatch, commit }` for applying commands. See below.
- `useGraphHistory()`: `undo`, `redo`, `canUndo`, `canRedo`, `undoDescription`, `redoDescription`, `undoStack`, `redoStack`. Its return type is `GraphHistory`.
- `useGraphSelection()`: what the graph holds selected, in editing modes.

The scene has `spec`, `coordSystem`, `layers`, `scales`, `guides`, `config`, `annotations` and `chrome`. `scene.spec` is the resolved spec with every default filled in.

`DevToolsPanel`, rendered inside the provider, shows which compile stages ran or hit the cache after each change. Its props type is `DevToolsPanelProps` with `width`, `style` and `className`. `HoverProvider` hosts the hover state the renderer mounts on its own. A custom renderer built from the parts needs it, a graph does not.

## Commands and onSpecChange

`dispatch(command)` applies a command and fires `onSpecChange` with the resulting spec. `dispatch(command, { transient: true })` paints the frame and fires nothing. The run of transient dispatches reports one `onSpecChange` when `commit()` is called, or when the next committed dispatch or a change to `data`, `customPalettes` or `colorScheme` closes it. An undo or redo during an open run reverts the whole run in one step and fires `onSpecChange` with the stepped spec. A new `spec` prop discards the run instead. `onSpecChange` never fires for a new `spec` prop itself.

```tsx
import { useGraphCommands } from '@graphysdk/react';
import type { GraphCommands } from '@graphysdk/react';

export const SliderCommit = ({ apply }: { apply: (commands: GraphCommands, value: number) => void }) => {
  const commands = useGraphCommands();
  return (
    <input
      type="range"
      onChange={(event) => apply(commands, event.target.valueAsNumber)}
      onPointerUp={() => commands.commit()}
    />
  );
};
```

The commands themselves are covered by the graphy-editor skill.

## Text measurement and server rendering

The renderer measures text with a canvas so ticks, legends and labels get exactly the space they take. It waits for `document.fonts.ready` before the first paint, up to three seconds, then logs `[graphy] FONT_READY_TIMEOUT` and paints with the fonts it has. The measurer is rebuilt when more fonts finish loading. Load web fonts through `@font-face` or a stylesheet link before or alongside the graph. Where `OffscreenCanvas` is missing it falls back to estimated metrics.

`TextMeasurerProvider`, `useTextMeasurer` and `CanvasTextMeasurer` are exported. The renderer mounts the provider itself. Pass `measurer` to the provider to supply your own, for example a synchronous one in tests.

There is no server rendering test. What the code shows: the provider runs its first compile inside a `useState` initializer, the text measurer provider renders nothing until its effect has run, and responsive sizing waits for the first container measurement. A server-rendered page therefore carries no graph markup, and the graph appears on the client after mount.

## The brand mark

The "Made with Graphy" badge is a spec setting, `config.content.brandMark`. `@graphysdk/react` seeds it to on when the spec says nothing. `@graphysdk/react-renderer` leaves it off. An explicit `brandMark.enabled` or `content.isBrandMarkVisible` wins in both packages.

```tsx
import { config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  config({ content: { brandMark: { enabled: false } } })
);
```

The badge hides itself below 120 by 80 pixels and shrinks to a circle below 200 pixels wide. `brandMark.placement` is `'footer'` (default) or `'header'`. `brandMark.variant` is `'full'` (default) or `'mini'`, and `'mini'` forces the circle at any size.

## Pitfalls

- A `spec` built inline in the component body is a new object every render, and every render recompiles. Build it at module scope or in `useMemo`.
- The parent of a responsive graph needs a height. With no height the graph is zero pixels tall.
- `plugins` is frozen at mount. Passing a different array later does nothing until the provider remounts.
- `mode="editable"` on the plain `GraphRenderer` gives no editing UI. Use `EditableGraphRenderer` from `@graphysdk/react/editable`.
- `onSpecChange` fires for committed commands, undo and redo, not when you pass a new `spec` prop. A transient dispatch fires nothing until `commit()`, the next committed dispatch, or a data, palette or scheme change closes the run.
- The provider from `@graphysdk/react-renderer` shows no brand mark. Import `GraphProvider` from one package consistently.
