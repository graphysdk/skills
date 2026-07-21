# Dumbbell

Technique: custom geom composing two marks per observation.

Reach for this when one observation carries two comparable values (before/after, min/max, group A/group B) that should render as paired marks — here two dots joined by a connector per category. The pattern shows custom-named positional aesthetics: `start` and `end` are declared as a y `lower`/`upper` interval, so the engine fills and scales them into `yMin`/`yMax` and trains the value axis over both; it also shows a custom `tooltip` declaration and a representative `y` for hover hit-testing.

```tsx
import { useMemo } from 'react';

import { createGraphyKit, defineGeomRenderer } from '@graphysdk/react-renderer';
import type { CompiledGeom, CompiledLayer, GeomCompilerInput, Observation } from '@graphysdk/viz-engine';
import { Geom, getX, getYMax, getYMin, toPercent, toViewBoxX, toViewBoxY } from '@graphysdk/viz-engine';

const CONNECTOR_COLOR = '#cdd2dc';

interface DumbbellParams {
  /** Endpoint dot radius, in pixels. */
  dotRadius: number;
  /** Connector stroke width, in pixels. */
  connectorWidth: number;
  /** Fill of the start dot. */
  startColor: string;
  /** Fill of the end dot. */
  endColor: string;
}

/**
 * Compares two values per category. `start` and `end` are custom y aesthetics declared as a
 * `lower`/`upper` interval, so the engine fills and scales them into yMin/yMax and trains the value
 * axis over both. `compile()` only injects a representative `y` for hover + tooltip; the paint half
 * just draws a connector and two dots.
 */
class DumbbellGeom extends Geom<DumbbellParams> {
  readonly type = 'dumbbell' as const;
  override readonly defaultParams: DumbbellParams = {
    dotRadius: 5,
    connectorWidth: 2,
    startColor: '#a0a8c0',
    endColor: '#4e79a7',
  };
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' }, // the category band, from the root `x` mapping
    { axis: 'y', role: 'min', valueKind: 'value', aes: 'start' }, // → yMin (and trains the value axis)
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'end' }, // → yMax
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = 'observation-rerender' as const;
  override readonly identityKey = 'index' as const;
  // The tooltip shows both endpoints of the hovered category (raw values, preserved by the interval fill).
  override readonly tooltip = [
    { key: 'Start', aes: 'start' },
    { key: 'End', aes: 'end' },
  ] as const;

  override readonly spatialKind = 'buckets';

  // A representative `y` (the end value — a raw column preserved alongside yMin/yMax) gives the hover
  // hit-test its `POSITION_VARIABLES.y` and the tooltip a value, both of which key on `mapping.y`.
  compile({ data, mapping }: GeomCompilerInput): CompiledGeom {
    return { data, mapping: { y: mapping.end } };
  }
}

/** One dumbbell in `[0, 1]` data-up space — the band centre and both scaled endpoints. */
interface Dumbbell {
  x: number;
  start: number;
  end: number;
}

const readDumbbell = (observation: Observation): Dumbbell | null => {
  const x = getX(observation);
  // `start`/`end` were filled into the interval columns and scaled by the pipeline.
  const start = getYMin(observation);
  const end = getYMax(observation);
  if (x === null || start === null || end === null) return null;
  return { x, start, end };
};

const DumbbellMark = ({ mark, params }: { mark: Dumbbell; params: DumbbellParams }) => {
  const cx = toPercent(toViewBoxX(mark.x));
  return (
    <g>
      <line
        x1={cx}
        x2={cx}
        y1={toPercent(toViewBoxY(mark.start))}
        y2={toPercent(toViewBoxY(mark.end))}
        stroke={CONNECTOR_COLOR}
        strokeWidth={params.connectorWidth}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={toPercent(toViewBoxY(mark.start))} r={params.dotRadius} fill={params.startColor} />
      <circle cx={cx} cy={toPercent(toViewBoxY(mark.end))} r={params.dotRadius} fill={params.endColor} />
    </g>
  );
};

const DumbbellLayer = ({ layer }: { layer: CompiledLayer }) => {
  const params = layer.params as unknown as DumbbellParams;
  const marks = useMemo(
    () => [...layer.data].map(readDumbbell).filter((mark): mark is Dumbbell => mark !== null),
    [layer.data]
  );
  return (
    <>
      {marks.map((mark, index) => (
        <DumbbellMark key={index} mark={mark} params={params} />
      ))}
    </>
  );
};

/** Re-paints the hovered dumbbell above the CSS-dimmed siblings (the `observation-rerender` strategy). */
const HoveredDumbbell = ({ layer, observation }: { layer: CompiledLayer; observation: Observation }) => {
  const params = layer.params as unknown as DumbbellParams;
  const mark = readDumbbell(observation);
  return mark ? <DumbbellMark mark={mark} params={params} /> : null;
};

export const dumbbell = defineGeomRenderer(new DumbbellGeom(), {
  coord: 'cartesian',
  guideMode: 'band',
  render: ({ layer }) => <DumbbellLayer layer={layer} />,
  renderHover: ({ layer, primary }) => <HoveredDumbbell layer={layer} observation={primary.observation} />,
  renderHoverCompanions: () => null,
});
```

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
  // The value axis zooms to the data so the comparison gaps read clearly.
  kit.scale.y.continuous({ zero: false })
);

export const DumbbellChart = () => (
  <kit.GraphProvider input={spec} data={payGap}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- Dot colors, radius, and connector width are all params — override per layer via `params: { ... }` or change `defaultParams` for a house default. For per-observation color instead of fixed endpoint colors, add a `color` visual aesthetic and read `getColor`.
- Rename the endpoint aesthetics (`aes: 'start'` / `aes: 'end'` in `positionRoles`) to fit the domain (`before`/`after`, `low`/`high`) — the typed `kit.geom.<name>({ aes })` keys and the `tooltip` entries follow the declared names.
- `zero: false` on the y scale is usually right for dumbbells (the gap is the message); drop it when absolute magnitude matters.
