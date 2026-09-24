# Plugins

Contents

- What a plugin is
- Kit or provider
- Repaint a built-in geom
- Define a custom geom
- Render a custom geom
- Read the stylesheet in a plugin
- Hover, tooltip, and legend
- Layout geoms in unit space
- Live geoms in an overlay
- Custom stats and transforms
- Types and recipes
- Registration warnings
- Position and styling pitfalls

A plugin adds a geom, stat, or transform the built-in set does not have, or repaints a built-in geom. It is plain TypeScript: a class or object on the compile side, a render contract on the React side.

Exact declarations: [types.md](types.md), Plugins sections. Complete implementations: [plugin recipes](../recipes/plugins/).

## What a plugin is

The `plugins` array on `GraphProvider` takes three shapes:

- A compile definition on its own: a `Geom` instance, a `Stat` instance, or a transform strategy object. It compiles but paints nothing, so a geom given this way must be paired with a render half somewhere in the array.
- A render half that carries its definition, from `defineGeomRenderer(new MyGeom(), contract)`. One entry registers both sides.
- A render-only override, from `defineGeomRenderer('bar', contract)`. It repaints a built-in geom and leaves its compile half alone.

The engine reads the array once, when the provider mounts. Later entries win when two register the same name. To change the set, remount the provider with a new React `key`.

## Kit or provider

`createGraphyKit({ plugins })` returns the builder namespaces with one typed method per custom definition, plus a `GraphProvider` already bound to the same array.

Create the kit once at module scope and use its builders and provider together:

```tsx
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';
import { lollipop } from './lollipop-geom'; // Implementation in the lollipop recipe.

const kit = createGraphyKit({ plugins: [lollipop] });
const spec = kit.pipe(kit.createSpec({ x: 'month', y: 'revenue' }), kit.geom.lollipop(), kit.scale.x(), kit.scale.y());
export const Graph = ({ data }: { data: Data }) => (
  <kit.GraphProvider data={data} spec={spec}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

The kit exposes `geom`, `stat`, `transform`, `scale`, `coord`, `createSpec`, `pipe`, and `plugins`. Custom methods are typed from each definition. `kit.GraphProvider` uses the renderer package's provider, whose brand mark defaults off.

For existing provider wiring, pass the same array to `<GraphProvider plugins={plugins}>`. For headless compilation, use `createSpecBuilder({ plugins })` and `createCompiler({ plugins })` from `@graphysdk/viz-engine`.

## Repaint a built-in geom

`defineGeomRenderer(name, contract)` with a built-in name replaces only the paint and returns a `ResolvedGeomRenderer`. With a `Geom` instance it returns a `GeomRendererDefinition`, which also carries `.definition`. Compile, scales, hover indexing, and data labels keep running as before. The name is checked against the built-in set.

```tsx
import { createGraphyKit, defineGeomRenderer, getBarRectBounds, toPaintColor, toPercent } from '@graphysdk/react';

const roundedBars = defineGeomRenderer('bar', {
  coord: 'cartesian',
  swatchShape: 'square',
  guideMode: 'band',
  render: ({ layer, coordSystem, styleReaders }) => {
    const mainAxis = coordSystem.type === 'cartesian' ? coordSystem.mainAxis : 'x';
    return (
      <>
        {[...layer.data].map((observation, index) => {
          const rect = getBarRectBounds(mainAxis, observation);
          if (rect === null) return null;
          return (
            <rect
              key={index}
              x={toPercent(rect.x)}
              y={toPercent(rect.y)}
              width={toPercent(rect.width)}
              height={toPercent(rect.height)}
              rx={6}
              fill={toPaintColor(styleReaders.get('fill', observation) ?? '#4e79a7')}
            />
          );
        })}
      </>
    );
  },
  renderHover: () => null,
  renderHoverCompanions: () => null,
});

export const kit = createGraphyKit({ plugins: [roundedBars] });
```

One contract paints one coordinate system. Bind a second contract with `coord: 'polar'` for pies and polar bars, or leave it out and the built-in polar paint stays.

## Define a custom geom

Subclass `Geom` and implement `type`, `defaultParams`, and `compile`. Everything else has a default and is overridden only when the geom differs.

```ts
import { Geom, POSITION_VARIABLES } from '@graphysdk/react';
import type { GeomCompileResult, GeomCompilerInput } from '@graphysdk/react';

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

  compile({ data }: GeomCompilerInput): GeomCompileResult {
    const withBaseline = data.hasVariable(POSITION_VARIABLES.yMin)
      ? data
      : data.addConstantVariable(POSITION_VARIABLES.yMin, 'numeric', 0);
    return { data: withBaseline, mapping: {} };
  }
}
```

Write `positionRoles` and `aesthetics` with `as const`. The kit reads their literal types to build the typed `kit.geom.lollipop({ aes, params })` method. Without `as const` on `positionRoles`, the method accepts the built-in aesthetic names and rejects custom ones. Without `as const` on `aesthetics`, that list adds nothing to the accepted names.

### Position roles

A position role is one column the engine writes for each observation, scaled to `[0, 1]`. The render half reads it back with a value reader.

- `{ axis: 'x', role: 'point' }` is the observation's x. It comes from the `x` mapping. Same for `y`.
- `{ axis: 'y', role: 'min', aes: 'start' }` and `{ axis: 'y', role: 'max', aes: 'end' }` describe an interval. The engine trains the y scale on both ends and writes `yMin` and `yMax`.
- `{ axis: 'y', role: 'scalar', aes: 'open' }` scales one more value on the y axis into its own column, read with `getScaledAesthetic(observation, 'open')`. The raw value stays in the mapped column for the tooltip.
- A `min` or `max` role without `aes` is written by `compile`, as the lollipop writes `yMin = 0`.
- A `point` role makes its axis required, and a `min` or `max` role with `aes` makes that aesthetic required. A missing one fails compile with `MISSING_AESTHETIC`. A `scalar` role's aesthetic is optional unless `validateMapping` says otherwise.

The `aes` name can be anything. That is how a candlestick declares `open`, `high`, `low`, and `close` and the author maps them like any aesthetic: `kit.geom.candlestick({ aes: { open: 'open', high: 'high', low: 'low', close: 'close' } })`.

### Aesthetics

`aesthetics` lists the non-position channels the geom reads.

- `{ kind: 'visual', name: 'color' }` is a scaled channel. `color`, `size`, `alpha`, `strokeWidth`, and `lineType` go through their scales and the legend.
- `{ kind: 'data', name: 'weight' }` is read straight from the mapped column with no scale. Use it for layout inputs such as a sankey's `source` and `target`.
- Add `required: true` to fail compile when the mapping lacks it.

### Other declarations

| Field | Default | Meaning |
| --- | --- | --- |
| `identityKey` | `'x-group'` | What makes the same observation across recompiles. `'index'` for row order, `'x-y'` for grids, `{ variable: 'id' }` for a column the geom owns. |
| `spatialKind` | `'points'` | The hit-test shape built from the position columns: `'points'`, `'buckets'`, `'filled-buckets'`, `'rects'`, `'cells'`, `'noop'`, or `'render-hit-test'`. |
| `highlightStrategy` | `'overlay-anchor'` | `'overlay-anchor'` draws a marker through `getOverlayAnchor` when the contract has one. `'observation-rerender'` repaints matched observations through `render`. `null` opts out. |
| `supportedCoordTypes` | `['cartesian', 'flip']` | Add `'polar'` only with a polar render contract. |
| `defaultPosition` | `'identity'` | `'stack'`, `'dodge'`, `'fill'`, or `'identity'` when the layer sets none. |
| `scaleConstraints` | none | `discreteMainAxis`, `discreteCrossAxis`, `zeroBaseline`, `bandPadding`, `inferredColor`. |
| `tooltip` | `[]` | Rows to show: `[{ key: 'Open', aes: 'open' }]`. |
| `legend` | `{}` | `suppressWhenSingleItem`, `sidePlacement`, `directLabelSupport`. |
| `summaries` | `{}` | `grandTotal`, `stackTotals`, `perGroupHeadline`. |
| `derivedVariables` | `[]` | Columns `compile` creates that an author may map. |
| `supportedPositions` | all | Position adjustments the layer may set. |
| `defaultInteractive` | `true` | Whether layers take part in hover by default. |
| `grid` | `{}` | Per coord: `hideGridX`, `hideGridY`, `hideBorder`. |
| `dataLabels`, `dataLabelCoordTypes` | none, `[]` | Data label defaults per coord, and the coords where labels can be placed. |
| `isComposite` | `false` | One shape per group, as a line, instead of one per observation. |

Optional hooks, each implemented only when the geom needs it: `resolveParams` to validate params beyond the default merge, `validateMapping` for a mapping rule a role cannot express, `resolveAnchorPosition(observation, context: AnchorContext): AnchorPosition | null` so annotations can pin to an observation (the context carries the coord system, position adjustment, purpose, and align; the result is `{ x, y }` in `[0, 1]`), `resolveBandFraction` for the band share a shape covers, `resolveValueSource` when the value is not `y`, and `resolveDataLabelDefaults` per position adjustment. A geom without `resolveAnchorPosition` cannot carry per-observation annotations.

### The compile method

`compile` receives the layer's dataset after stats and transforms, the effective mapping, the resolved params, and the coord type. It returns a dataset and mapping overrides. Most geoms pass the data through. Common reasons to do more:

- Write a baseline or another position column in data units, so the scale maps it. Never hard-code a rendered position.
- Point `mapping.y` at a representative column when the geom has no `y` aesthetic, so hover and the tooltip have a value. A dumbbell returns `{ data, mapping: { y: mapping.end } }`.
- Precompute a layout that needs no pixel size, such as a treemap, and store it in columns the render half reads.

The internal column names are exported as `POSITION_VARIABLES` (`x`, `y`, `xMin`, `xMax`, `yMin`, `yMax`, `yRaw`), `VISUAL_VARIABLES` (`color`, `size`, `alpha`, `strokeWidth`, `lineType`), and `GROUP_VARIABLES`.

`Dataset` is immutable. Useful methods: `hasVariable`, `addConstantVariable`, `renameVariable`, `selectVariables`, `getValues`, `filter`, `orderBy`, `groupBy(...).rollup(...)`, `getFirst`, `size`, and iteration with `for...of` or `[...data]`.

## Render a custom geom

`defineGeomRenderer(new LollipopGeom(), contract)` pairs the compile definition with its paint. The render contract:

| Field | Required | What it does |
| --- | --- | --- |
| `coord` | yes | `'cartesian'` or `'polar'`. One contract per coord. |
| `render` | yes | Paints the layer into the panel SVG. Or `{ fn, options: { overlay: true } }` for a live geom. |
| `renderHover` | yes | Paints the hovered observation on top. Receives `layer`, `primary`, `group`, `related`, `coordSystem`, `panelRect`, `styleReaders`, and `colorScheme`. Return `null` to skip. |
| `renderHoverCompanions` | yes | Paints companions in this layer at the hovered position. Receives `layer`, `primary`, `related`, `styleReaders`, and `colorScheme`, with no `coordSystem` or `panelRect`. Usually `null`. |
| `renderHighlight` | no | Repaints only matched observations when a highlight is active. Falls back to `render`. |
| `swatchShape` | no | `'square'`, `'line'`, `'circle'`, `'area'`, or `'slice'` for legend and tooltip swatches. |
| `guideMode` | no | `'band'` or `'crosshair'` hover guide. Omit or pass `null` for none. |
| `getOverlayAnchor` | no | Returns `{ x, y }` in `[0, 1]`, y up, for the highlight marker under `'overlay-anchor'`. Omit it and highlights draw no marker. |
| `hitTest` | for `'render-hit-test'` geoms | Returns a cursor tester. See Layout geoms. |
| `getEditOutlineShapes` | no | Shapes the editor outlines, of kind `'region'`, `'stroke'`, or `'dots'` (`EditOutlineRegion`, `EditOutlineStroke`, `EditOutlineDots`). Omit and it uses bounding boxes. |

Each handler's input type is exported, for a handler written outside the contract: `GeomRendererInput` for `render`, `GeomHoverRendererInput` for `renderHover`, `GeomHoverCompanionsRendererInput`, `GeomOverlayAnchorRendererInput`, and `GeomEditOutlineShapesRendererInput`. `GeomRenderInputBase` is the `styleReaders` and `colorScheme` part they share. `GeomRenderFn` types a plain render function and `GeomRender` the whole `render` field.

`render` receives `layer`, `coordSystem`, `panelRect`, `styleReaders`, `colorScheme`, `formattingLocale`, `shouldAnimateTransitions`, and `intro`. The panel SVG's user units are pixels; `panelRect.width` and `panelRect.height` give its size. Its offset is already applied, so paint in local panel coordinates.

Scaled positions use `[0, 1]` with y pointing up. For SVG attributes, use `toPercent(x)` and `toPercent(toViewBoxY(y))`, or multiply by the panel dimensions. Keep radii, text sizes, and stroke widths in pixels. The [lollipop recipe](../recipes/plugins/lollipop.md) shows the full compile/render pair, stylesheet reads, and hover paint.

### Value readers

Every reader takes an observation from `layer.data`. Position readers, `getSize`, `getAlpha`, and `getStrokeWidth` return a number or `null`. `getColor` and `getLineType` return `undefined` when the channel is not mapped. `getGroup` returns the group value.

| Reader | Returns |
| --- | --- |
| `getX`, `getY` | The point position in `[0, 1]`. |
| `getXMin`, `getXMax`, `getYMin`, `getYMax` | Interval ends, written for `min` and `max` roles. |
| `getScaledAesthetic(observation, 'open')` | A `scalar` role's scaled position. |
| `getYRaw` | The segment value before stacking. |
| `getBarRectBounds(mainAxis, observation)` | A rect in `[0, 1]²` with top-left origin. |
| `getTileRectBounds(observation)` | The same for a tile, from its interval columns. |
| `getAngleExtent`, `getRadiusExtent` | Polar extents. |
| `getColor`, `getSize`, `getAlpha`, `getStrokeWidth`, `getLineType` | Scaled visual channels from the data. |
| `getGroup` | The observation's group value. |

`getColor` sees only the colour scale. Read paint through `styleReaders` so stylesheet overrides reach the geom.

## Read the stylesheet in a plugin

`styleReaders` on the render input is the cascade for this layer: overrides, then data-driven values, then defaults. Read one property per observation with `get`. A custom geom has the shared geom vocabulary: `fill`, `stroke`, `alpha`, `fillAlpha`, `strokeAlpha`, `saturation`, `blur`, `brightness`, `contrast`, `shadow`, and `blendMode`.

```ts
import { toPaintColor } from '@graphysdk/react';
import type { GeomStyleReaders, Observation } from '@graphysdk/react';

export const readFill = (styleReaders: GeomStyleReaders, observation: Observation): string =>
  toPaintColor(styleReaders.get('fill', observation) ?? '#888888');
```

`fill` can be a gradient, pattern, or image. `toPaintColor` reduces any paint to one colour for places that need a plain string.

Authors style a custom geom with the bare `style.geom` builder. There is no `style.geom.lollipop` builder for a custom kind. The kit's custom method takes no `id` option, so a custom layer is scoped with a `where` predicate, or left unscoped when it is the only layer. The example below assigns an ID to a built-in layer; custom builder options currently have no `id` field.

```ts
import { createGraphyKit, style, styles } from '@graphysdk/react';

const kit = createGraphyKit({ plugins: [] });

export const spec = kit.pipe(
  kit.createSpec({ x: 'month', y: 'revenue' }),
  kit.geom.point({ id: 'points' }),
  styles({
    overrides: [
      style.geom({ fill: '#e5484d' }, { layer: 'points' }),
      style.geom({ alpha: 0.4 }, { where: { variable: 'revenue', lt: 100 } }),
      style.geom({ stroke: '#111111' }, { state: 'hovered' }),
    ],
  }),
  kit.scale.x(),
  kit.scale.y()
);
```

Related hooks: `useStyleReaderTree()` returns the whole tree including chrome targets, `useGeomReaderTree()` the geom subtree, `useStyleResolver()` the provider's resolver, and `useResolvedStyle(read, ...args)` memoizes a module-level style read. Outside React, `createStyleResolver({ colorScheme }).readers(scene)` builds the same tree from a compiled scene.

`get(property, observation?, state?)` takes an optional observation and an optional state, `'hovered'` or `'dimmed'`. Without an observation it answers for the layer as a whole. Geom entries take `where`, `state`, and `layer` options. Inside a component that is not the render function, `useStyleReaders(layer)` returns the same readers.

## Hover, tooltip, and legend

Hover comes free when the geom declares a `spatialKind` built from position columns. The engine indexes the layer, finds the observation under the cursor, shows the tooltip, and calls `renderHover` with `primary.observation`. The default tooltip lists the mapped values. A non-empty `tooltip` contract on the geom replaces those rows with one row per listed aesthetic.

- `'buckets'` snaps to the nearest position along the main axis. Good for lollipops, dumbbells, and candlesticks.
- `'rects'` tests the rect between the interval ends. Good for bar-like geoms.
- `'points'` uses nearest-point distance in two dimensions.
- `'noop'` disables hover for the layer.

A `HoverHit` carries `layerId`, `pointIndex`, and `observation`. It is discriminated on `anchored`. A hit from a position-based shape has `x` and `y` in `[0, 1]`, y up. A hit from a `'render-hit-test'` geom has no `x` or `y`, so narrow on `anchored` before reading them.

`guideMode: 'band'` draws a band behind the hovered position, `'crosshair'` a line through it. `swatchShape` chooses the legend and tooltip swatch. The legend itself is driven by the `color` scale, so a geom that declares `{ kind: 'visual', name: 'color' }` gets legend items for free.

Highlights use `highlightStrategy`. With `'observation-rerender'` the matched observations are drawn again through `render` above dimmed siblings, and nothing else is needed. With `'overlay-anchor'` the renderer asks `getOverlayAnchor` for an `OverlayAnchor`, the marker position. It is optional for a custom contract. Without it, a highlight dims the rest and draws no marker. Return y as the data-up value; the overlay flips it.

```ts
import { getX, getYMax } from '@graphysdk/react';
import type { GeomRenderContract } from '@graphysdk/react';

export const getOverlayAnchor: GeomRenderContract['getOverlayAnchor'] = ({ observation }) => {
  const x = getX(observation);
  const y = getYMax(observation);
  return x === null || y === null ? null : { x, y };
};
```

## Layout geoms in unit space

For geometry that does not fit the built-in spatial indices, such as treemaps or Sankey diagrams:

- Declare `spatialKind = 'render-hit-test'` and `identityKey = 'index'` or `{ variable: 'markId' }`. Emit that identity column from `compile` when using a variable.
- Store geometry in your own columns and keep it separate from scaled positions. If `compile` replaces the dataset, preserve mapped inputs or return mapping overrides pointing at the new columns; otherwise color, grouping, or tooltip values can disappear.
- Provide a `hitTest` factory on the render contract. It returns a `RenderHitTester`: `(cursor) => ({ key: string } | null)`. The cursor is normalized to `[0, 1]` with a top-left origin. Match the observation's identity exactly; dates use ISO strings.
- The renderer rebuilds the tester when its inputs change. Use the same geometry for paint and hit-testing.

`UnitSpaceSvg` stretches a `viewBox="0 0 1 1"` over the panel. Paths and rectangles can use unit coordinates directly. Use `vectorEffect="non-scaling-stroke"` for pixel-width strokes. Circles and text stretch too: put those in the outer panel SVG or in `UnitBoxSvg`, which places a nested SVG over a unit-space box (`x0`, `y0`, `x1`, `y1`) with pixel units inside. `UnitBoxSvg` clips its children to the box. Both helpers use a top-left origin; convert scaled data-up y positions with `toViewBoxY`.

For complete examples, see [treemap](../recipes/plugins/treemap.md), [Sankey](../recipes/plugins/sankey.md), [Voronoi](../recipes/plugins/voronoi.md), and [unit-box](../recipes/plugins/unit-box.md).

For a pixel-dependent layout, compute geometry in a component using `panelRect`, or measure on-screen dimensions with `useElementScreenRect` when needed. Register a component-owned tester with `useGeomHitTest(layer.id, tester)` and read the active hit with `useHoverState`. The [beeswarm recipe](../recipes/plugins/beeswarm.md) demonstrates this path. Current diagnostics only recognize contract-level `hitTest` or overlay hosting, so a component-registered tester can still produce `MISSING_RENDER_HIT_TEST`.

## Live geoms in an overlay

A moving or draggable geom can own its pointer events by declaring:

```tsx
import type { GeomRenderContract } from '@graphysdk/react';

const render: GeomRenderContract['render'] = {
  fn: ({ overlay }) => <svg width={overlay.panelRect.width} height={overlay.panelRect.height} />,
  options: { overlay: true },
};
```

Add the marks and pointer handlers inside this overlay SVG. The renderer hosts its output in a screen-aligned portal above the hover capture layer. `overlay` is an `InteractiveOverlayApi`:

- `panelRect` is the panel's on-screen rect in client pixels, distinct from the regular render input's layout pixels.
- `pushHover(key, { clientX, clientY })` resolves an observation by `identityKey` and anchors its tooltip at the cursor.
- `pushHover(null)` clears this layer's hover. Other layers' hover survives, and unmounting clears the overlay's own hover.

Use `spatialKind = 'render-hit-test'` and an explicit identity here too. Choose either overlay push events or the contract's `hitTest` factory, since overlay hosting takes precedence when both are supplied. `useGeomHover(layer.id)` exposes the same push function to other components. The [force-directed recipe](../recipes/plugins/force-directed.md) includes a complete simulation with dragging and cleanup.

## Custom stats and transforms

A stat is a `Stat` subclass. `computeStat` receives the layer's dataset, its mapping, the resolved stat `spec`, and `xScaleIsDiscrete`, and returns a dataset plus mapping overrides. An empty dataset skips `computeStat`. `computedVariables` names the aesthetics it produces, so the author may leave them unmapped. The kit exposes it as `kit.stat.<type>()`.

```ts
import { createGraphyKit } from '@graphysdk/react';
import { Stat } from '@graphysdk/viz-engine';
import type { AestheticKey, StatCompileResult, StatCompilerInput } from '@graphysdk/viz-engine';

class UseRawYStat extends Stat {
  readonly type = 'useRawY' as const;
  readonly computedVariables = new Set<AestheticKey>(['y']);

  protected computeStat({ data }: StatCompilerInput): StatCompileResult {
    return { data, mapping: { y: 'rawY' } };
  }
}

const kit = createGraphyKit({ plugins: [new UseRawYStat()] });

export const spec = kit.pipe(
  kit.createSpec({ x: 'month' }),
  kit.geom.point({ stat: kit.stat.useRawY() }),
  kit.scale.x(),
  kit.scale.y()
);
```

A transform is a plain object with `transformType` and `apply(dataset, transformSpec)`. It runs before stats. Options arrive on the spec's `options` field. An optional `getIntroducedVariables(transformSpec)` names the columns it adds. The kit exposes it as `kit.transform.<type>({ options })`.

```ts
import { createGraphyKit } from '@graphysdk/react';
import type { TransformStrategy } from '@graphysdk/viz-engine';

const topN: TransformStrategy = {
  transformType: 'topN',
  apply: (dataset, transformSpec) => {
    const options = (transformSpec as { options?: Record<string, unknown> }).options;
    const limit = Number(options?.['limit'] ?? 5);
    return dataset.take(Array.from({ length: Math.min(limit, dataset.size()) }, (_, index) => index));
  },
};

const kit = createGraphyKit({ plugins: [topN] });

export const spec = kit.pipe(
  kit.createSpec({ x: 'month', y: 'revenue' }),
  kit.transform.topN({ options: { limit: 5 } }),
  kit.geom.bar(),
  kit.scale.x(),
  kit.scale.y()
);
```

`Stat`, `StatCompilerInput`, `StatCompileResult`, `AestheticKey`, and `TransformStrategy` are not exported from `@graphysdk/react`. Import them from `@graphysdk/viz-engine`.

## Types and recipes

Core geom authoring, render types, value readers, SVG helpers, and interaction hooks are exported by `@graphysdk/react`. Import engine-only APIs such as `Stat`, `TransformStrategy`, `IdentityKey`, `PositionRole`, `SpatialKind`, `createSpecBuilder`, and `createCompiler` from `@graphysdk/viz-engine`. See [types.md](types.md) for full declarations.

Read the recipes from small to large. [panel-rect](../recipes/plugins/panel-rect.md) and [unit-box](../recipes/plugins/unit-box.md) are the smallest. Then [lollipop](../recipes/plugins/lollipop.md), [dumbbell](../recipes/plugins/dumbbell.md), [candlestick](../recipes/plugins/candlestick.md), and [sketchy-bar](../recipes/plugins/sketchy-bar.md). Then [beeswarm](../recipes/plugins/beeswarm.md), [voronoi](../recipes/plugins/voronoi.md), [treemap](../recipes/plugins/treemap.md), [sankey](../recipes/plugins/sankey.md), [force-directed](../recipes/plugins/force-directed.md), and [Mexico 68](../recipes/plugins/mexico-68.md). The stylesheet for Mexico 68 lives in [the theme file](../recipes/themes/mexico-68.md).

## Registration warnings

Plugin problems surface as diagnostics. Errors go to the provider's `onError` and the error panel, and block the graph. Warnings go to `onWarnings`.

- `MISSING_GEOM_RENDERER` is an error at registration when a custom geom's compile half has no render half at all, and a warning at scene time when none is bound for the active coord, so that layer is not painted.
- `DUPLICATE_REGISTERED_TYPE` is a warning when two definitions share a name, or two render-only overrides share a `(geom, coord)` pair. The last in the array wins.
- `RENDER_HIT_TEST_IDENTITY` is a warning for a layout geom left on a position-derived identity, or whose `{ variable }` identity names a column `compile` did not emit.
- `MISSING_RENDER_HIT_TEST` when a `'render-hit-test'` geom has neither `hitTest` nor an overlay render; `CONFLICTING_RENDER_HIT_TEST` when it has both, and the overlay is used; `OVERLAY_REQUIRES_RENDER_HIT_TEST` when an overlay render sits on another spatial kind.
- `SPATIAL_KIND_COORD_UNSUPPORTED` for `'cells'` under polar, and `MISSING_ANCHOR_CAPABILITY` for a `'render-hit-test'` geom without `resolveAnchorPosition`. All warnings.

## Position and styling pitfalls

Write data-space baselines and interval ends in `compile` so scales can transform them. Unit-space layouts and pixel-dependent offsets belong to their respective layout paths; they do not need to masquerade as scaled data positions.

`getColor` reads only the color scale. Use `styleReaders.get('fill', observation)` when paint should honor stylesheet overrides and theme tokens. Some visual recipes intentionally use a fixed palette or scale-only color; adapt their paint reads when adding stylesheet support.
