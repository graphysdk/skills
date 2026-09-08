# Dumbbell

Technique: custom geom composing two geometries per observation.

Reach for this when one observation carries two comparable values (before/after, min/max, group A/group B) that should render as paired geometries — here two points joined by a connector per category. The pattern shows custom-named positional aesthetics: `start` and `end` are declared as a y `min`/`max` interval, so the engine fills and scales them into `yMin`/`yMax` and trains the cross axis over both; it also shows a custom `tooltip` declaration and a representative `y` for hover hit-testing.

```tsx
import { useMemo } from 'react';

import { createGraphyKit, defineGeomRenderer } from '@graphysdk/react-renderer';
import type { CompiledGeom, CompiledLayer, GeomCompilerInput, GeomStyleReaders, Observation } from '@graphysdk/viz-engine';
import { Geom, getX, getYMax, getYMin, toPercent, toViewBoxX, toViewBoxY } from '@graphysdk/viz-engine';

interface DumbbellParams {
  /** Endpoint point radius, in pixels. */
  pointRadius: number;
  /** Connector stroke width, in pixels. */
  connectorWidth: number;
  /** Fill of the start point. */
  startColor: string;
  /** Fill of the end point. */
  endColor: string;
}

/**
 * Compares two values per category. `start` and `end` are custom y aesthetics declared as a
 * `min`/`max` interval, so the engine fills and scales them into yMin/yMax and trains the value
 * axis over both. `compile()` injects a representative `y` that serves both the hover index and the
 * y-scale domain; the paint half just draws a connector and two points.
 */
class DumbbellGeom extends Geom<DumbbellParams> {
  readonly type = 'dumbbell' as const;
  override readonly defaultParams: DumbbellParams = {
    pointRadius: 5,
    connectorWidth: 2,
    startColor: '#a0a8c0',
    endColor: '#4e79a7',
  };
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' }, // the category band, from the root `x` mapping
    { axis: 'y', role: 'min', valueKind: 'value', aes: 'start' }, // → yMin (must be numeric)
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'end' }, // → yMax (must be numeric)
  ] as const;
  // Cartesian only: opts out of `coord.flip()`.
  override readonly supportedCoordTypes = ['cartesian'] as const;
  // Declared but not read for a custom geom: `layer.highlight` is looked up by built-in geom name, so a
  // spec `highlight()` never dims or re-renders this layer (see Adapting).
  override readonly highlightStrategy = 'observation-rerender' as const;
  // The tooltip shows both endpoints of the hovered category; each row reads its own `aes` column (raw values).
  override readonly tooltip = [
    { key: 'Start', aes: 'start' },
    { key: 'End', aes: 'end' },
  ] as const;

  override readonly spatialKind = 'buckets';

  // The injected `y` mapping does two jobs: the bucket hover index needs a `POSITION_VARIABLES.y`
  // column next to x, and the y-scale domain is collected from `yMin`/`yMax` only through a `y` mapping
  // that resolves to them — without it `start`/`end` would never train the axis. The end value is a raw
  // column preserved alongside yMin/yMax, so it serves; the tooltip does not read it. Note this makes
  // `layer.mapping.y` the end column, so a fork dropping the `tooltip` contract would see `end` in the
  // default tooltip rows and labels.
  compile({ data, mapping }: GeomCompilerInput): CompiledGeom {
    return { data, mapping: { y: mapping.end } };
  }
}

/** One dumbbell in `[0, 1]` data-up space — the band centre, both scaled endpoints, and its cascade paint. */
interface Dumbbell {
  x: number;
  start: number;
  end: number;
  /** The layer's cascade color: a user `style.geom` entry, else the `geom` token for the active scheme. */
  connectorColor: string;
  alpha: number;
}

const readDumbbell = (observation: Observation, styleReaders: GeomStyleReaders): Dumbbell | null => {
  const x = getX(observation);
  // `start`/`end` were filled into the interval columns and scaled by the pipeline.
  const start = getYMin(observation);
  const end = getYMax(observation);
  if (x === null || start === null || end === null) return null;
  return {
    x,
    start,
    end,
    connectorColor: styleReaders.get('color', observation),
    alpha: styleReaders.get('alpha', observation),
  };
};

const DumbbellPaint = ({ dumbbell, params }: { dumbbell: Dumbbell; params: DumbbellParams }) => {
  const cx = toPercent(toViewBoxX(dumbbell.x));
  return (
    <g opacity={dumbbell.alpha}>
      <line
        x1={cx}
        x2={cx}
        y1={toPercent(toViewBoxY(dumbbell.start))}
        y2={toPercent(toViewBoxY(dumbbell.end))}
        stroke={dumbbell.connectorColor}
        strokeWidth={params.connectorWidth}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={toPercent(toViewBoxY(dumbbell.start))} r={params.pointRadius} fill={params.startColor} />
      <circle cx={cx} cy={toPercent(toViewBoxY(dumbbell.end))} r={params.pointRadius} fill={params.endColor} />
    </g>
  );
};

const DumbbellLayer = ({ layer, styleReaders }: { layer: CompiledLayer; styleReaders: GeomStyleReaders }) => {
  const params = layer.params as unknown as DumbbellParams;
  const dumbbells = useMemo(
    () =>
      [...layer.data]
        .map((observation) => readDumbbell(observation, styleReaders))
        .filter((dumbbell): dumbbell is Dumbbell => dumbbell !== null),
    [layer.data, styleReaders]
  );
  return (
    <>
      {dumbbells.map((dumbbell, index) => (
        <DumbbellPaint key={index} dumbbell={dumbbell} params={params} />
      ))}
    </>
  );
};

/**
 * Re-paints the hovered dumbbell above its siblings, which the layer group's CSS hover-dim fades. That
 * dimming is driven by the hover store holding any primary hit (`useHoverDim` sets `data-hover-active`
 * on the geom group), not by `highlightStrategy`; this output escapes it only because it paints outside
 * that group.
 */
const HoveredDumbbell = ({
  layer,
  observation,
  styleReaders,
}: {
  layer: CompiledLayer;
  observation: Observation;
  styleReaders: GeomStyleReaders;
}) => {
  const params = layer.params as unknown as DumbbellParams;
  const dumbbell = readDumbbell(observation, styleReaders);
  return dumbbell ? <DumbbellPaint dumbbell={dumbbell} params={params} /> : null;
};

export const dumbbell = defineGeomRenderer(new DumbbellGeom(), {
  coord: 'cartesian',
  guideMode: 'band',
  swatchShape: 'circle', // without this, swatches fall back to `'square'`
  render: ({ layer, styleReaders }) => <DumbbellLayer layer={layer} styleReaders={styleReaders} />,
  renderHover: ({ layer, primary, styleReaders }) => (
    <HoveredDumbbell layer={layer} observation={primary.observation} styleReaders={styleReaders} />
  ),
  renderHoverCompanions: () => null,
});
```

`start` and `end` are required aesthetics — a `min`/`max` role carrying an `aes` is required — so omitting either is a mapping error. The geometries are `%`-positioned children of the panel SVG, so the renderer never needs pixel sizes; `input.panelRect` (the panel's layout-pixel `Rect`, x/y already applied — paint in local 0…width / 0…height) is the escape hatch when it does. `spatialKind: 'buckets'` means `input.intro` offers a wipe plan; this renderer ignores it (plans are offered, never imposed), so the dumbbells pop in while built-in layers animate.

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react-renderer';
import type { Data } from '@graphysdk/viz-engine';

const kit = createGraphyKit({ plugins: [dumbbell] });

// Median full-time salary by role, women vs men ($k).
const payGap: Data = {
  columns: [{ key: 'category' }, { key: 'start' }, { key: 'end' }],
  rows: [
    { category: 'Product', start: 125, end: 140 },
    { category: 'Eng', start: 118, end: 132 },
    { category: 'Data', start: 112, end: 128 },
    { category: 'Design', start: 95, end: 104 },
    { category: 'Sales', start: 82, end: 99 },
  ],
};

const spec = kit.pipe(
  kit.createSpec({ x: 'category' }),
  kit.geom.dumbbell({
    aes: { start: 'start', end: 'end' },
    params: { startColor: '#c9a96e', endColor: '#2e7d5b' },
  }),
  kit.scale.x.discrete(),
  // The cross axis zooms to the data so the comparison gaps read clearly.
  kit.scale.y.continuous({ zero: false })
);

export const DumbbellChart = () => (
  <kit.GraphProvider input={spec} data={payGap}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- Point colors, radius, and connector width are all params — override per layer via `params: { ... }` or change `defaultParams` for a house default. For per-observation color instead of fixed endpoint colors, add a `color` visual aesthetic and read it through `styleReaders.get('color', observation)`.
- Paint is inside the style cascade: the connector and the group opacity read `styleReaders.get('color' | 'alpha', observation)`, which honours a user's `style.geom` entries and dark-scheme tokens (`getColor`/`getAlpha` expose the encoding only). Geom params are reserved for what the stylesheet has no vocabulary for — two endpoint fills per observation. The fixed hex `startColor`/`endColor` ignore the scheme; branch on `input.colorScheme` (`'light' | 'dark'`) for a light/dark pair. See `reference/styling.md`.
- Rename the endpoint aesthetics (`aes: 'start'` / `aes: 'end'` in `positionRoles`) to fit the domain (`before`/`after`, `low`/`high`) — the typed `kit.geom.<name>({ aes })` keys and the `tooltip` entries follow the declared names.
- `zero: false` on the y scale is usually right for dumbbells (the gap is the message); drop it when absolute magnitude matters.
- `highlightStrategy` is inert here (see the class comment): a custom geom that should recede while another layer is highlighted paints its own de-emphasis via `styleReaders.get('alpha', observation, 'dimmed')`. `identityKey: 'index'` would be equally inert — it is only read for `'render-hit-test'` geoms — so it is not declared.
- No `resolveAnchorPosition` is implemented, so annotations cannot anchor to the dumbbells; implement it returning an endpoint's `[0,1]` position to make them annotatable. The omission is silent for a `'buckets'` layer — `MISSING_ANCHOR_CAPABILITY` fires for render-hit-test layers only.
