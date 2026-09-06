# Plugins

Plugins extend the engine with new paint (tier 1) or entirely new geoms, stats, and transforms (tier 2). One `plugins` array seeds both the compiler and the renderer, so what can be authored, what can compile, and what can paint derive from a single list and cannot diverge.

## What a Plugin is

`Plugin` (from `@graphysdk/viz-engine`) is a union of three shapes:

| Shape | Produced by | Contributes |
|---|---|---|
| Bare `CompileDefinition` — a `Geom` subclass instance, a `Stat` subclass instance, or a `TransformStrategy` object | `new MyGeom()`, `new MyStat()`, `{ transformType, apply }` | Compile half only (headless; no custom paint) |
| Paired definition — a render contract carrying its compile definition at `.definition` | `defineGeomRenderer(definition, contract)` from `@graphysdk/react-renderer` | Both halves. The geom name is read off `definition.type`, so compile and paint are one declaration consumed twice — they cannot drift |
| `RenderOnlyPlugin` — a render contract keyed by a built-in geom name, no `.definition` | `defineGeomRenderer('bar', contract)` | Render half only. The built-in compile half keeps running; only the paint is replaced |

Wiring:

- `<GraphProvider plugins={[...]}>` — the provider seeds the compiler with the compile halves and the render registry with the render halves. **Frozen at mount**: the render resolver is captured once; remount with a React `key` to change the array.
- `createGraphyKit({ plugins })` (react-renderer) — returns the typed builder plus a `GraphProvider` pre-bound to the same array. Preferred for tier 2.
- `createGraphyBuilder({ plugins })` (viz-engine) — the headless primitive `createGraphyKit` wraps; use for server-side compiles.

Later entries win: renderers are applied in array order onto the built-in registry, keyed on `(geom, coord)`.

## Tier 1 — render-only paint override

Replace how a built-in geom is painted without touching its compile half. Positions, stacking, scales, axes, tooltip, and hover indexing all keep working — you only redraw the marks. The paint is yours in full, including the parts the style cascade resolves for the built-in renderer (see Paint and the style cascade).

```tsx
import { defineGeomRenderer, GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import { getBarRectBounds, getColor, getAlpha } from '@graphysdk/viz-engine';

const sketchyBar = defineGeomRenderer('bar', {
  coord: 'cartesian',
  guideMode: 'band',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <MyBars layer={layer} mainAxis={coordSystem.mainAxis} />;
  },
  renderHover: ({ primary, coordSystem }) => <MyBarHighlight observation={primary.observation} />,
  renderHoverCompanions: () => null,
});

<GraphProvider data={data} input={spec} plugins={[sketchyBar]}>
  <GraphRenderer />
</GraphProvider>;
```

The first argument is constrained to the built-in `GeomName` union (`'point' | 'line' | 'area' | 'bar' | 'rule' | 'tile'`) — overriding an unknown name is a compile-time error. To restyle a *custom* geom, rebind its definition (which you hold) via `defineGeomRenderer(definition, contract)`.

### The `GeomRenderContract` fields

Registry key is the `(geom, coord)` pair — one contract per coordinate system a geom paints under. A polar restyle is a second `defineGeomRenderer('bar', { coord: 'polar', ... })` entry.

| Field | Required | Purpose |
|---|---|---|
| `coord` | yes | `'cartesian'` or `'polar'`. The coord system this contract paints under; handlers receive the matching `CoordSystem` |
| `render` | yes | The paint: `(input) => ReactNode`, or `{ fn, options: { overlay: true } }` for overlay hosting (see Hover wiring). Input (`GeomRenderInput`): `{ layer, coordSystem, panelRect, colorScheme, styleReaders, shouldAnimateTransitions, formattingLocale, intro? }` |
| `renderHover` | yes | Paint for the hovered observation. Input (`HoverRenderInput`, a separate shape): `{ layer, coordSystem, primary, group, related: HoverHit[], panelRect, colorScheme, styleReaders }`. Return `null` for no hover paint |
| `renderHoverCompanions` | yes | Companion marks for hover-related observations (e.g. dots on sibling lines). Input: `{ layer, primary, related, colorScheme, styleReaders }`. Usually `() => null` |
| `renderHighlight` | no | Repaint of the highlight-matched subset; omit to fall back to `render`. Input (`HighlightRenderInput`) is `GeomRenderInput` plus `sourceLayer` (the full layer `layer` was filtered from — context the subset cannot see, like a stack's silhouette). Override when the plain render would misgroup an isolated subset (a bar repainting a lone mid-stack segment) |
| `swatchShape` | no | Legend/tooltip/headline mark: `'square' \| 'line' \| 'circle' \| 'area' \| 'slice'` |
| `guideMode` | no | Hover guide this layer draws when hovered: `'band'` (category rectangle — bars), `'crosshair'` (rule at the value — line/area), omit/`null` for none (scatter) |
| `hitTest` | no | Factory `(input) => RenderHitTester` for `'render-hit-test'` geoms with precomputed geometry (tier 2 only; see Hover wiring) |
| `getOverlayAnchor` | no | `({ layer, coordSystem, observation }) => { x, y } \| null` in `[0,1]` panel space; type-enforced for built-in renderers whose highlight strategy is `'overlay-anchor'` (line, area, point). On a custom geom it is never called today (see dimming below) |

### Drawing in unit space

All compiled positions are normalized `[0,1]`. `input.panelRect` is the panel's layout-pixel `Rect` — its `x`/`y` are already applied by the enclosing SVG, so pixel paint lands in local `0…width` / `0…height`. The idiomatic path is still unit space.

`UnitSpaceSvg` stretches the `[0, 1]` square onto the panel (`preserveAspectRatio="none"`) so paint and hit-test share one frame. Paths belong there. A `<circle>` in that frame becomes an ellipse on a non-square panel.

Round geometries and pixel-sized symbols go in `UnitBoxSvg`: a nested SVG over a unit-space box with no viewBox. Children live in an unscaled local space — `50%` is the box centre, a pixel radius stays a pixel.

```tsx
import { UnitBoxSvg, UnitSpaceSvg } from '@graphysdk/react-renderer';

<UnitSpaceSvg>
  <path d={cellPath} />
</UnitSpaceSvg>
<UnitBoxSvg box={{ x0, y0, x1, y1 }}>
  <circle cx="50%" cy="50%" r={4} />
</UnitBoxSvg>
```

`UnitSpaceSvg` is `viewBox="0 0 1 1"` + `preserveAspectRatio="none"` + `width/height="100%"` + `pointerEvents="none"` (set before `{...rest}`, so a geom that wants its own pointer handling without going overlay-hosted overrides it; `viewBox` and `preserveAspectRatio` are omitted from its props and cannot be). Use `vectorEffect="non-scaling-stroke"` on paths so stroke widths survive the non-uniform stretch. A point circle can also sit as a sibling of `UnitSpaceSvg` with percent positions and a pixel radius, the same way the built-in point geom paints. Alternative for percentage positioning: `toPercent(value)` produces `"42.5%"` strings. Helpers `toViewBoxX` (identity) and `toViewBoxY` (`1 - y`; data y grows up, SVG y grows down) convert scaled positions to top-left-origin unit coords. All three are exported by `@graphysdk/viz-engine`.

### Reading compiled observations — value readers only

`layer.data` is an iterable `Dataset` of observations — **not an array**. `layer.data.map(...)` fails; iterate with `for (const observation of layer.data)` or spread first (`[...layer.data].map(...)`).

Never index into an observation's columns by name — read every value through the readers exported by `@graphysdk/viz-engine`. They return scaled `[0,1]` positions (or resolved visual values), or `null` when absent:

| Readers | Return |
|---|---|
| `getX`, `getY` | Point position, scaled `[0,1]` |
| `getXMin`, `getXMax`, `getYMin`, `getYMax` | Interval ends, scaled `[0,1]` (a bar's band edges / stack segment) |
| `getYRaw` | The unscaled data value (labels, tooltips) |
| `getColor`, `getAlpha`, `getSize`, `getStrokeWidth`, `getLineType` | Resolved visual channel values |
| `getGroup`, `getStackRole` | Grouping / stack-role keys |
| `getAngleExtent`, `getRadiusExtent` | Polar arc extents |
| `getBarRectBounds(mainAxis, observation)` | Convenience: a bar's full `Rect` in `[0,1]`, flip-aware |

Layer params arrive at `layer.params` (typed loosely; cast to your geom's param shape).

### Paint and the style cascade

Every stylable property resolves through a three-tier cascade, first answer winning:

1. **Override** — the last matching `styles.overrides` entry declaring the property. Beats the encoding.
2. **Data** — the derived visual variable the encoding produced.
3. **Default** — the last matching `styles.defaults` entry. The built-in stylesheet sits at the front, so user defaults win over it and an unstyled spec resolves to the house look.

The visual readers (`getColor`, `getAlpha`, `getSize`, `getStrokeWidth`, `getLineType`) expose **tier 2 only** — a plugin painting from `getColor(observation) ?? MY_FALLBACK` misses every `overrides` entry, the built-in `style.geom({ color: token('geom') })` default, and dark-scheme colors. Read paint through the cascade instead: every render input (`GeomPaintInput`, the base of `render`, `renderHover`, `renderHoverCompanions`, `renderHighlight` and the overlay form) carries

- `styleReaders: GeomStyleReaders` — this layer's cascade, resolved for the chart's active scheme. `styleReaders.get(property, observation?, state?)`; omit the observation to read the layer-wide value.
- `colorScheme: ColorScheme` — the provider's scheme, for `createStyleResolver({ colorScheme }).geomReaders(otherLayer)` when a plugin reads a *different* layer.

```tsx
render: ({ layer, styleReaders }) => (
  <UnitSpaceSvg>
    {[...layer.data].map((observation, index) => (
      <circle key={index} cx={getX(observation) ?? 0} cy={1 - (getY(observation) ?? 0)} r={0.02}
        fill={styleReaders.get('color', observation)} fillOpacity={styleReaders.get('alpha', observation)} />
    ))}
  </UnitSpaceSvg>
);
```

`color` and `alpha` are built-in-backed on every layer, so they resolve non-null; a kind-specific reader (`useStyleReaders(layer)` on a `CompiledLayerFor<'bar'>` returns `BarStyleReaders`, and so on) also guarantees that kind's defaults. `useStyleReaders(layer)` is the exported hook form for components rendered inside the provider.

**Dimming.** `layer.highlight` is populated by a lookup keyed on the **built-in geom name**, so a custom geom's layer carries `null` there and the renderer never dims it (`Geom.highlightStrategy` is declarable but not yet read). A custom geom that should recede while another layer is highlighted paints its own de-emphasis: `styleReaders.get('alpha', observation, 'dimmed')` resolves the built-in `dimmed` entry (`alpha: 0.4`) or whatever the stylesheet declares for that state.

### Entrance animations

`input.intro` is a `LayerIntroPlan | null` — the engine's plan for how this layer should enter on first mount (and on a coord change). The plan is **offered, never imposed**: nothing gates the paint, and a geom that ignores it simply appears at once.

- Plans are keyed on the layer's **`spatialKind`**: `'rects'` → a `grow` plan, `'buckets'` under cartesian → a `wipe` plan, `'cells'` → a `fade` plan, `'points'` → a point `grow` plan, everything else → `null`. So a custom geom declaring `spatialKind: 'buckets'` **does** receive a wipe plan and must consume it or it pops in while every built-in layer animates. A `'render-hit-test'` geom always receives `null` — it never animates in, by design.
- `LayerIntroPlan` is discriminated on `type`, every member carrying `layerId` and `durationSeconds`: `{ type: 'grow', baseline, growAxis: 'x' | 'y' | 'angle' | 'radius' | 'size', delayByKey }`, `{ type: 'wipe', axis: 'x' | 'y' }`, or `{ type: 'fade' }`. Timings are already in seconds.
- Chart chrome (data labels) is held until the longest layer plan comes to rest, measured from the chart's mount — a geom that ignores its plan still appears before the chrome.
- The layer counts toward the intro's `maxAnimatedGeoms` budget (`countLayerGeoms`: the group count for `'buckets'`, the row count otherwise; default 1500), so a large custom layer can suppress the whole chart's intro.
- The engine side is exported (`LayerIntroPlan`, `buildLayerIntroPlan`, `countLayerGeoms`); the react-renderer helpers the built-ins use (`useLayerAnimation`, `useGeomTransition`, `resolveGrowIntroTransition`) are **not**, so a plugin implements the entrance from the plan by hand.

`shouldAnimateTransitions` is the separate, ongoing flag on the same input: whether *data changes* should tween.

### Authoring diagnostics

Plugin mistakes surface as `VizDiagnostic` entries rather than throws. Most are warnings, and several are the only signal that an otherwise-silent plugin is broken:

| Code | Severity | Fires when |
|---|---|---|
| `MISSING_GEOM_RENDERER` | error | A compile definition is in `plugins` with no render half registered for its `type` |
| `MISSING_GEOM_RENDERER` | warning | A compiled layer's `(geom, coord)` pair resolves to no renderer under the chart's coord system — the layer paints nothing |
| `DUPLICATE_REGISTERED_TYPE` | warning | Two render-only overrides register the same `(geom, coord)`; the last in the array wins |
| `MISSING_RENDER_HIT_TEST` | warning | A `'render-hit-test'` layer whose renderer declares neither a `hitTest` factory nor an overlay render — the layer has no hover. Also fires for the `useGeomHitTest` hook form, which registers at runtime and so is invisible to the check |
| `RENDER_HIT_TEST_IDENTITY` | warning | A `'render-hit-test'` geom left on a position-derived identity (`'x-group'` or `'x-y'`), or keyed on `{ variable }` naming a column its `compile()` never emits — either way the hover lookup is empty and every hit resolves to nothing |
| `CONFLICTING_RENDER_HIT_TEST` | warning | A renderer declares both a `hitTest` factory and an overlay render; only the overlay is used |
| `MISSING_ANCHOR_CAPABILITY` | warning | A `'render-hit-test'` geom implements no `resolveAnchorPosition`, so annotations cannot anchor to its observations and the editor overlay paints no creation trigger on them |
| `OVERLAY_REQUIRES_RENDER_HIT_TEST` | warning | A renderer is overlay-hosted but its layer's `spatialKind` is not `'render-hit-test'`, so `pushHover` resolves against no index |
| `SPATIAL_KIND_COORD_UNSUPPORTED` | warning | A geom declares `spatialKind: 'cells'` and lists `'polar'` in `supportedCoordTypes`; the layer paints under polar but has no hover |

## Tier 2 — fully custom geom

A new mark kind: subclass `Geom` (compile half), write a `GeomRenderContract` (paint half), pair them with `defineGeomRenderer(definition, contract)`, and hand the result to `createGraphyKit`.

### The `Geom` subclass

`Geom<TParams>` from `@graphysdk/viz-engine` is declaration-driven: the pipeline reads fields off the instance instead of branching on names, so a custom geom is a first-class participant. Override only what differs from the defaults.

```ts
import { Geom, POSITION_VARIABLES } from '@graphysdk/viz-engine';
import type { CompiledGeom, GeomCompilerInput } from '@graphysdk/viz-engine';

class LollipopGeom extends Geom<{ stemWidth: number }> {
  readonly type = 'lollipop' as const;
  override readonly defaultParams = { stemWidth: 2 };
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' },
    { axis: 'y', role: 'min', valueKind: 'value' },
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'y' },
  ] as const;
  override readonly aesthetics = [{ kind: 'visual', name: 'color' }] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly spatialKind = 'buckets';

  compile({ data }: GeomCompilerInput): CompiledGeom {
    // Baseline written in DATA units — the shared y-scale maps it, so it stays correct under any domain.
    const withBaseline = data.hasVariable(POSITION_VARIABLES.yMin)
      ? data
      : data.addConstantVariable(POSITION_VARIABLES.yMin, 'numeric', 0);
    return { data: withBaseline, mapping: {} };
  }
}
```

Declare tuple fields (`positionRoles`, `aesthetics`, `supportedCoordTypes`) **`as const`** — the typed builder derives each geom method's `aes` keys from these literals; a widened array falls back to a loose surface.

Key declarations:

| Field / hook | Default | Meaning |
|---|---|---|
| `type` (abstract) | — | The geom's name; any string outside the built-in union. Becomes `kit.geom.<type>` |
| `defaultParams` (abstract) | — | Param defaults; also carries the params type. `resolveParams({ params, diagnostics })` merges user params over them — override to enforce invariants (clamping, normalizing), reporting substitutions via `reportIssue` |
| `compile(input)` (abstract) | — | `{ data, mapping, params } → { data, mapping }`. Add computed position/layout columns to the dataset; return mapping overrides |
| `positionRoles` | `[]` | The position columns the compile half injects and the render half reads — the cross-half contract. Roles: `point` (sources its axis aesthetic), `min`/`max` (interval ends), `scalar` (scaled in place). A role's `aes` is a plain string, so a geom can bind **custom positional aesthetics** (`'open'`, `'low'`, `'close'`) the engine trains and scales like built-in channels; a `min`/`max` role without `aes` is compile-written |
| `aesthetics` | `[]` | Non-positional channels: `{ kind: 'visual', name }` (scaled — `color`, `size`; built-in vocabulary) or `{ kind: 'data', name }` (read raw from the mapped column, no scale — a sankey's `source`/`target`/`value`; free-form name). `required: true` enforces presence |
| `derivedVariables` | `[]` | Names the geom computes in its own output that authors may map to (exempt from unknown-variable checks) |
| `scaleConstraints` | unset | `{ discreteMainAxis?, discreteCrossAxis?, zeroBaseline?, bandPadding?, inferredColor? }` — demands the geom imposes on its scales. `discreteMainAxis`/`zeroBaseline` only steer bare inferred scales; `discreteCrossAxis` is a hard band demand that coerces a declared continuous scale back (`UNSUPPORTED_SCALE_TYPE`); `inferredColor` infers the colour scale from the mapped column instead of the palette |
| `supportedCoordTypes` | `['cartesian', 'flip']` | Coords the geom renders under |
| `spatialKind` | `'points'` | Hover hit-test shape: `'points' \| 'rects' \| 'cells' \| 'buckets' \| 'noop' \| 'render-hit-test'`. Use `'render-hit-test'` when geometry comes from a layout algorithm rather than position scales |
| `identityKey` | `'x-group'` | What makes "the same observation" across recompiles: `'x-group'`, `'index'`, `'x-y'` (both position columns), or `{ variable: 'nodeId' }` for a geom keyed by its own id column |
| `isComposite` | `false` | `true` when the geom draws one geometry per group (a line's path) rather than one mark per observation |
| `highlightStrategy` | `'overlay-anchor'` | `'overlay-anchor'` (contract must supply `getOverlayAnchor`) \| `'observation-rerender'` \| `null` (opt out) |
| `defaultPosition`, `defaultInteractive` | `'identity'`, `true` | Layer-resolution defaults |
| `supportedPositions` | all four | Position adjusters the geom accepts; others are rejected |
| `grid`, `legend`, `tooltip`, `summaries` | `{}` / `[]` | Guide policies the pipeline reads; `dataLabels` is a further optional policy |
| `dataLabelCoordTypes` | `[]` | Coords the built-in placement pipeline can place this geom's data labels under |
| `resolveAnchorPosition` | optional | `(observation, context: AnchorContext) => AnchorPosition \| null` — where an annotation on that observation sits, in normalized `[0,1]` panel space. `AnchorContext` carries `{ coordSystem, position, purpose: 'pin' \| 'value', align? }`. A geom without it is skipped by the annotation stage; on a `'render-hit-test'` geom the omission also raises `MISSING_ANCHOR_CAPABILITY` |
| `validateMapping`, `resolveBandFraction`, `resolveValueSource`, `resolveDataLabelDefaults` | optional | Further opt-in hooks. `resolveValueSource(mapping, purpose: 'label' \| 'measurement')` names the aesthetic a label or measurement reads when the value does not ride on `y` (a tile's `color`) |

### Custom stats and transforms

Both are bare `CompileDefinition` plugins — add the instance to the `plugins` array and a typed builder method appears (`kit.stat.<type>()`, `kit.transform.<transformType>({ options })`):

```ts
import { Stat } from '@graphysdk/viz-engine';
import type { TransformStrategy } from '@graphysdk/viz-engine';

class MedianStat extends Stat {
  readonly type = 'median' as const;
  readonly computedVariables = new Set(['y' as const]);
  protected computeStat(input) { /* StatCompilerInput in, { data, mapping } out */ }
}

const jitterTransform: TransformStrategy = {
  transformType: 'jitter',
  apply: (data, transform) => /* Dataset → Dataset */,
  getIntroducedVariables: () => ['jittered'],
};
```

### Pairing and the kit

```tsx
import { createGraphyKit, defineGeomRenderer, GraphRenderer } from '@graphysdk/react-renderer';

const lollipop = defineGeomRenderer(new LollipopGeom(), {
  coord: 'cartesian',
  render: ({ layer }) => <LollipopMarks layer={layer} />,
  renderHover: ({ layer, primary }) => <LollipopMark layer={layer} observation={primary.observation} isHovered />,
  renderHoverCompanions: () => null,
});

const kit = createGraphyKit({ plugins: [lollipop, jitterTransform] });

const spec = kit.pipe(
  kit.createSpec({ x: 'category', y: 'revenue' }),
  kit.geom.lollipop({ aes: { color: 'category' }, params: { stemWidth: 3 } }),
  kit.scale.x(),
  kit.scale.y(),
  kit.scale.color.palette()
);

const Chart = () => (
  <kit.GraphProvider input={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

`createGraphyKit` (and headless `createGraphyBuilder`) uses a `const` type parameter to capture the plugins tuple literally: `kit.geom.lollipop` exists and is typed — `aes` constrained to the declared aesthetics plus the position-role keys (including custom positional aesthetics), `params` to `Partial<TParams>` — with no casts. Render-only overrides contribute no builder method (they have no compile definition). `kit.GraphProvider` already carries the plugins, so authoring and rendering cannot use different arrays.

A custom render half receives the base `CompiledLayer` (not a name-narrowed one) — it sits downstream of serialization and reads its columns dynamically through the value readers.

## Hover wiring

Three paths, keyed by whether the geometry is knowable and when:

| Path | When | Mechanism |
|---|---|---|
| Compiled index (default) | Positions come from scales (`spatialKind: 'points' \| 'rects' \| 'buckets'`) | Nothing to write — the runtime builds the hover index from compiled data |
| Pull — `hitTest` / `useGeomHitTest` | `spatialKind: 'render-hit-test'`, geometry fixed once drawn (treemap tiles, voronoi cells, sankey ribbons, a settled beeswarm) | A registered spatial query; the central capture layer calls it per cursor move |
| Push — `useGeomHover` / overlay hosting | Geometry keeps changing after drawing, or the geom must own pointer events (live simulation, dragging) | The geom's own handlers push the hovered identity key |

### Pull: register a hit tester

`RenderHitTester` is `(cursor: { x, y }) => { key: string } | null` — cursor in panel-local `[0,1]`, top-left origin (the same frame the geom paints in); the returned `key` is the observation's declared `identityKey` value. The geom inherits central hover, `renderHover`, and the built-in tooltip.

Declarative form — the `hitTest` factory on the contract. The renderer memoizes it on `layer.data` and the panel pixel rect (so a resize rebuilds it) and registers the tester on your behalf; you write no hook:

```tsx
const treemap = defineGeomRenderer(new TreemapGeom(), {
  coord: 'cartesian',
  render: ({ layer }) => <TreemapTiles layer={layer} />,
  hitTest: ({ layer }) => buildTileTester(readTiles(layer.data)),
  renderHover: ({ layer, primary }) => <TileHighlight layer={layer} observation={primary.observation} />,
  renderHoverCompanions: () => null,
});
```

Hook form — when the geometry lives in render-side component state (a simulation that settles), register from inside your render component:

```tsx
import { useGeomHitTest } from '@graphysdk/react-renderer';

useGeomHitTest(layer.id, (cursor) => findNodeAt(settledNodes, cursor));
```

### Push: overlay-hosted rendering

A geom that must own its pointer events (drag, live simulation) declares its `render` as overlay-hosted. The renderer mounts the output in a screen-aligned portal above the central capture layer and hands the wiring on `input.overlay` (`InteractiveOverlayApi`):

```tsx
const forceDirected = defineGeomRenderer(new ForceDirectedGeom(), {
  coord: 'cartesian',
  render: {
    fn: ({ layer, overlay }) => (
      <ForceOverlay layer={layer} rect={overlay.panelRect} pushHover={overlay.pushHover} />
    ),
    options: { overlay: true },
  },
  renderHover: () => null,
  renderHoverCompanions: () => null,
});
```

- `overlay.pushHover(key, { clientX, clientY })` feeds the hovered observation's identity key into the unified hover store and anchors the tooltip at the supplied cursor (the overlay intercepts the pointer events the cursor-follow tooltip would otherwise read); `pushHover(null)` clears this layer's hover only.
- `overlay.panelRect` is the panel's on-screen rect in client pixels (`ScreenRect`), for placing marks — distinct from `input.panelRect`, which is in layout pixels. `useElementScreenRect` is the exported measurement primitive behind it.
- `useGeomHover(layerId)` is the standalone escape hatch returning the same push function — reach for it only when the overlay-hosted `render` form is not enough.

## Recipe index

Full worked implementations, one technique each:

| Technique | Recipe |
|---|---|
| Render-only paint override of a built-in geom | `recipes/plugins/sketchy-bar.md` |
| Minimal full custom geom (compile + paint) | `recipes/plugins/lollipop.md` |
| Two marks per observation | `recipes/plugins/dumbbell.md` |
| Custom positional aesthetics (open/high/low/close) | `recipes/plugins/candlestick.md` |
| Custom compile logic + custom hit-testing | `recipes/plugins/treemap.md` |
| Computed-geometry hit regions | `recipes/plugins/voronoi.md` |
| Simulation-driven layout | `recipes/plugins/beeswarm.md` |
| Complex multi-part geometry | `recipes/plugins/sankey.md` |
| Overlay-hosted rendering + push hover | `recipes/plugins/force-directed.md` |
