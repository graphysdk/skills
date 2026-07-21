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

Replace how a built-in geom is painted without touching its compile half. Positions, stacking, scales, axes, tooltip, and hover indexing all keep working — you only redraw the marks.

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

The first argument is constrained to the built-in `GeomName` union (`'point' | 'line' | 'area' | 'bar' | 'rule'`) — overriding an unknown name is a compile-time error. To restyle a *custom* geom, rebind its definition (which you hold) via `defineGeomRenderer(definition, contract)`.

### The `GeomRenderContract` fields

Registry key is the `(geom, coord)` pair — one contract per coordinate system a geom paints under. A polar restyle is a second `defineGeomRenderer('bar', { coord: 'polar', ... })` entry.

| Field | Required | Purpose |
|---|---|---|
| `coord` | yes | `'cartesian'` or `'polar'`. The coord system this contract paints under; handlers receive the matching `CoordSystem` |
| `render` | yes | The paint: `(input) => ReactNode`, or `{ fn, options: { overlay: true } }` for overlay hosting (see Hover wiring). Input: `{ layer, coordSystem, isAnimated, formattingLocale }` |
| `renderHover` | yes | Paint for the hovered observation. Input adds `primary`, `group`, `related` (`HoverHit[]`), and `panelRect`. Return `null` for no hover paint |
| `renderHoverCompanions` | yes | Companion marks for hover-related observations (e.g. dots on sibling lines). Usually `() => null` |
| `renderHighlight` | no | Repaint of the highlight-matched subset; omit to fall back to `render`. Override when the plain render would misgroup an isolated subset (a bar repainting a lone mid-stack segment) |
| `swatchShape` | no | Legend/tooltip/headline mark: `'square' \| 'line' \| 'circle' \| 'area' \| 'slice'` |
| `guideMode` | no | Hover guide this layer draws when hovered: `'band'` (category rectangle — bars), `'crosshair'` (rule at the value — line/area), omit/`null` for none (scatter) |
| `hitTest` | no | Factory `(input) => RenderHitTester` for `'render-hit-test'` geoms with precomputed geometry (tier 2 only; see Hover wiring) |
| `getOverlayAnchor` | no | `({ layer, coordSystem, observation }) => { x, y } \| null` in `[0,1]` panel space; required when the geom's highlight strategy is `'overlay-anchor'` (built-in line/point) |

### Drawing in unit space

Render handlers receive **no pixel sizes**. All compiled positions are normalized `[0,1]`. Paint into a nested SVG that stretches the unit square onto the panel:

```tsx
import { UnitSpaceSvg } from '@graphysdk/react-renderer';

render: ({ layer }) => (
  <UnitSpaceSvg>{/* children use raw [0,1] coordinates, top-left origin */}</UnitSpaceSvg>
);
```

`UnitSpaceSvg` is `viewBox="0 0 1 1"` + `preserveAspectRatio="none"` + `width/height="100%"`. Use `vectorEffect="non-scaling-stroke"` on paths so stroke widths survive the non-uniform stretch. Alternative for percentage positioning: `toPercent(value)` produces `"42.5%"` strings. Helpers `toViewBoxX` (identity) and `toViewBoxY` (`1 - y`; data y grows up, SVG y grows down) convert scaled positions to top-left-origin unit coords. All three are exported by `@graphysdk/viz-engine`.

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
| `scaleConstraints` | unset | `{ discreteMainAxis?, zeroBaseline? }` — domain constraints the geom imposes on inferred scales |
| `supportedCoordTypes` | `['cartesian', 'flip']` | Coords the geom renders under |
| `spatialKind` | `'points'` | Hover hit-test shape: `'points' \| 'rects' \| 'buckets' \| 'noop' \| 'render-hit-test'`. Use `'render-hit-test'` when geometry comes from a layout algorithm rather than position scales |
| `identityKey` | `'x-group'` | What makes "the same observation" across recompiles: `'x-group'`, `'index'`, or `{ variable: 'nodeId' }` for a geom keyed by its own id column |
| `isComposite` | `false` | `true` when the geom draws one geometry per group (a line's path) rather than one mark per observation |
| `highlightStrategy` | `'overlay-anchor'` | `'overlay-anchor'` (contract must supply `getOverlayAnchor`) \| `'observation-rerender'` \| `null` (opt out) |
| `defaultPosition`, `defaultInteractive` | `'identity'`, `true` | Layer-resolution defaults |
| `grid`, `legend`, `dataLabels`, `tooltip`, `summaries` | `{}` / `[]` | Guide policies the pipeline reads |
| `validateMapping`, `resolveAnchorPosition`, … | optional | Opt-in behaviour hooks |

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

Declarative form — the `hitTest` factory on the contract. The renderer memoizes it on `layer.data` and registers the tester on your behalf; you write no hook:

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
- `overlay.panelRect` is the panel's on-screen rect in client pixels, for placing marks.
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
