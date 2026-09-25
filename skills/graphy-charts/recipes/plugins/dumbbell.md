# Dumbbell

Two dots joined by a connector per band, comparing a start value with an end value. Use it for before/after or group A versus group B comparisons. Two geoms are included: `dumbbell` (bands on x, values on y) and `horizontalDumbbell` (bands on y, values on x).

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './dumbbell-geom';

// Median salary by role, women versus men ($k).
const payGap: Data = {
  columns: [{ key: 'role' }, { key: 'start' }, { key: 'end' }],
  rows: [
    { role: 'Product', start: 125, end: 140 },
    { role: 'Eng', start: 118, end: 132 },
    { role: 'Data', start: 112, end: 128 },
    { role: 'Design', start: 95, end: 104 },
    { role: 'Sales', start: 82, end: 99 },
    { role: 'Marketing', start: 78, end: 88 },
    { role: 'Support', start: 58, end: 63 },
  ],
};

const verticalSpec = kit.pipe(
  kit.createSpec({ x: 'role' }),
  kit.geom.dumbbell({ aes: { start: 'start', end: 'end' }, params: { startColor: '#c9a96e', endColor: '#2e7d5b' } }),
  kit.scale.x.discrete(),
  // The value axis fits the data so the gaps read clearly.
  kit.scale.y.continuous()
);

const horizontalSpec = kit.pipe(
  kit.createSpec({ y: 'role' }),
  kit.geom.horizontalDumbbell({ aes: { start: 'start', end: 'end' } }),
  kit.scale.y.discrete(),
  // The x interval trains its domain on the end value only, so pin the domain to cover both ends.
  kit.scale.x.continuous({ domainMin: 50, domainMax: 145 })
);

export const DumbbellGraph = ({ horizontal = false }: { horizontal?: boolean }) => (
  <kit.GraphProvider spec={horizontal ? horizontalSpec : verticalSpec} data={payGap}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `dumbbell-geom.tsx`.

```tsx
import { useMemo } from 'react';

import type { GeomCompileResult, GeomCompilerInput, Observation, SceneLayer } from '@graphysdk/react';
import {
  createGraphyKit,
  defineGeomRenderer,
  Geom,
  getX,
  getXMax,
  getXMin,
  getY,
  getYMax,
  getYMin,
  toPercent,
  toViewBoxX,
  toViewBoxY,
} from '@graphysdk/react';

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
 * `start` and `end` are custom y aesthetics declared as a min/max interval, so the engine scales them
 * into yMin/yMax and trains the value axis over both. `compile()` only injects a representative `y`
 * for hover and the tooltip.
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
    { axis: 'x', role: 'point' }, // the band, from the root `x` mapping
    { axis: 'y', role: 'min', valueKind: 'value', aes: 'start' }, // yMin, trains the value axis
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'end' }, // yMax
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = 'observation-rerender' as const;
  override readonly identityKey = 'index' as const;
  // The tooltip shows both endpoints of the hovered band (raw values, preserved by the interval fill).
  override readonly tooltip = [
    { key: 'Start', aes: 'start' },
    { key: 'End', aes: 'end' },
  ] as const;

  override readonly spatialKind = 'buckets';

  // Hover hit-testing and the tooltip key on `mapping.y`; the end value is the representative y.
  compile({ data, mapping }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: { y: mapping.end } };
  }
}

/** One dumbbell in [0, 1] data-up space: the band centre and both scaled endpoints. */
interface Dumbbell {
  x: number;
  start: number;
  end: number;
}

const readDumbbell = (observation: Observation): Dumbbell | null => {
  const x = getX(observation);
  // `start` and `end` were filled into the interval columns and scaled by the pipeline.
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

const DumbbellLayer = ({ layer }: { layer: SceneLayer }) => {
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

/** Repaints the hovered dumbbell above the dimmed siblings (the `observation-rerender` strategy). */
const HoveredDumbbell = ({ layer, observation }: { layer: SceneLayer; observation: Observation }) => {
  const params = layer.params as unknown as DumbbellParams;
  const mark = readDumbbell(observation);
  return mark ? <DumbbellMark mark={mark} params={params} /> : null;
};

const dumbbell = defineGeomRenderer(new DumbbellGeom(), {
  coord: 'cartesian',
  guideMode: 'band',
  render: ({ layer }) => <DumbbellLayer layer={layer} />,
  renderHover: ({ layer, primary }) => <HoveredDumbbell layer={layer} observation={primary.observation} />,
  renderHoverCompanions: () => null,
});

/**
 * The same geom on its side: the interval spans x, so it fills xMin/xMax. This is a separate geom, not
 * a rotation. `coord.flip()` swaps the pair after the position mapper runs, so a flipped `DumbbellGeom`
 * would still take the y route.
 */
class HorizontalDumbbellGeom extends Geom<DumbbellParams> {
  readonly type = 'horizontalDumbbell' as const;
  override readonly defaultParams: DumbbellParams = {
    dotRadius: 5,
    connectorWidth: 2,
    startColor: '#a0a8c0',
    endColor: '#4e79a7',
  };
  override readonly positionRoles = [
    { axis: 'y', role: 'point' }, // the band, from the root `y` mapping
    { axis: 'x', role: 'min', valueKind: 'value', aes: 'start' }, // xMin
    { axis: 'x', role: 'max', valueKind: 'value', aes: 'end' }, // xMax
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = 'observation-rerender' as const;
  override readonly identityKey = 'index' as const;
  override readonly tooltip = [
    { key: 'Start', aes: 'start' },
    { key: 'End', aes: 'end' },
  ] as const;

  override readonly spatialKind = 'buckets';

  // Hover and the tooltip want a single `x`. The end value is it.
  compile({ data, mapping }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: { x: mapping.end } };
  }
}

/** One dumbbell scaled to [0, 1]: its row, and where each dot sits across. */
interface HorizontalDumbbell {
  y: number;
  start: number;
  end: number;
}

const readHorizontalDumbbell = (observation: Observation): HorizontalDumbbell | null => {
  const y = getY(observation);
  const start = getXMin(observation);
  const end = getXMax(observation);
  if (y === null || start === null || end === null) return null;
  return { y, start, end };
};

const HorizontalDumbbellMark = ({ mark, params }: { mark: HorizontalDumbbell; params: DumbbellParams }) => {
  const cy = toPercent(toViewBoxY(mark.y));
  const startX = toPercent(toViewBoxX(mark.start));
  const endX = toPercent(toViewBoxX(mark.end));
  return (
    <g>
      <line
        x1={startX}
        x2={endX}
        y1={cy}
        y2={cy}
        stroke={CONNECTOR_COLOR}
        strokeWidth={params.connectorWidth}
        strokeLinecap="round"
      />
      <circle cx={startX} cy={cy} r={params.dotRadius} fill={params.startColor} />
      <circle cx={endX} cy={cy} r={params.dotRadius} fill={params.endColor} />
    </g>
  );
};

const HorizontalDumbbellLayer = ({ layer }: { layer: SceneLayer }) => {
  const params = layer.params as unknown as DumbbellParams;
  const marks = useMemo(
    () => [...layer.data].map(readHorizontalDumbbell).filter((mark): mark is HorizontalDumbbell => mark !== null),
    [layer.data]
  );
  return (
    <>
      {marks.map((mark, index) => (
        <HorizontalDumbbellMark key={index} mark={mark} params={params} />
      ))}
    </>
  );
};

const HoveredHorizontalDumbbell = ({ layer, observation }: { layer: SceneLayer; observation: Observation }) => {
  const params = layer.params as unknown as DumbbellParams;
  const mark = readHorizontalDumbbell(observation);
  return mark ? <HorizontalDumbbellMark mark={mark} params={params} /> : null;
};

const horizontalDumbbell = defineGeomRenderer(new HorizontalDumbbellGeom(), {
  coord: 'cartesian',
  guideMode: 'band',
  render: ({ layer }) => <HorizontalDumbbellLayer layer={layer} />,
  renderHover: ({ layer, primary }) => <HoveredHorizontalDumbbell layer={layer} observation={primary.observation} />,
  renderHoverCompanions: () => null,
});

export const kit = createGraphyKit({ plugins: [dumbbell, horizontalDumbbell] });
```

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- Each geom declares `start` and `end` as custom aesthetics. The vertical geom takes the band from the root `x` mapping, the horizontal one from the root `y` mapping.
- With the horizontal geom, the x scale trains only on the end value. Pin `domainMin` and `domainMax` on `kit.scale.x.continuous()` so the start dots stay inside the panel.
- Dot and connector paint are geom params, not stylesheet properties.
