# Candlestick

Technique: custom positional aesthetics (open/high/low/close).

Reach for this pattern when a mark needs more positional inputs than `x`/`y` and they must all share one axis. The geom declares extra positional aesthetics in `positionRoles`; the engine then trains the price scale over all four prices, builds the axis, and hands the renderer `[0, 1]` positions — `compile()` stays nearly empty. This is the lightest custom-geom form: no layout algorithm, no custom hit-testing (the built-in band hover works because `compile()` injects a representative `y`).

## Plugin

```tsx
import { useMemo } from 'react';
import { createGraphyKit, defineGeomRenderer } from '@graphysdk/react-renderer';
import type { CompiledGeom, CompiledLayer, GeomCompilerInput, Observation } from '@graphysdk/viz-engine';
import {
  Geom,
  getScaledAesthetic,
  getX,
  getYMax,
  getYMin,
  toPercent,
  toViewBoxX,
  toViewBoxY,
} from '@graphysdk/viz-engine';

interface CandlestickParams {
  /** Candle body width as a fraction of the band spacing (the wick sits at the band centre). */
  bodyWidth: number;
  /** Wick stroke width, in pixels. */
  wickWidth: number;
  upColor: string;
  downColor: string;
}

/**
 * An OHLC geom using the open positional-aesthetic vocabulary: open/high/low/close are authored as
 * ordinary aesthetics, exactly like `x` or `color`. The high–low wick is a y interval (`low`/`high`
 * fill `yMin`/`yMax`) and open/close are two scalar y aesthetics scaled through the same price
 * scale (raw prices preserved for the tooltip); all four train the price-axis domain.
 */
class CandlestickGeom extends Geom<CandlestickParams> {
  readonly type = 'candlestick' as const;
  override readonly defaultParams: CandlestickParams = {
    bodyWidth: 0.6,
    wickWidth: 1.5,
    upColor: '#26a69a',
    downColor: '#ef5350',
  };
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' }, // band centre, from the root `x` mapping
    { axis: 'y', role: 'min', valueKind: 'value', aes: 'low' }, // wick bottom → yMin (drives the domain)
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'high' }, // wick top → yMax
    { axis: 'y', role: 'scalar', valueKind: 'value', aes: 'open' }, // body (scaled; raw price preserved)
    { axis: 'y', role: 'scalar', valueKind: 'value', aes: 'close' },
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = 'observation-rerender' as const;
  override readonly identityKey = 'index' as const;
  override readonly tooltip = [
    { key: 'Open', aes: 'open' },
    { key: 'High', aes: 'high' },
    { key: 'Low', aes: 'low' },
    { key: 'Close', aes: 'close' },
  ] as const;
  override readonly spatialKind = 'buckets';

  // The pipeline scales the prices; injecting a representative `y` (the session high) gives the
  // built-in hover hit-test its y position and the tooltip a value, both keyed on `mapping.y`.
  compile({ data, mapping }: GeomCompilerInput): CompiledGeom {
    return { data, mapping: { y: mapping.high } };
  }
}

/** One candle in `[0, 1]` data-up space — wick and body bounds already scaled. */
interface Candle {
  x: number;
  low: number;
  high: number;
  open: number;
  close: number;
  halfBody: number;
  isUp: boolean;
}

/** Body half-width in `[0, 1]`: a fraction of the smallest gap between adjacent band centres. */
const resolveHalfBody = (xs: number[], bodyWidth: number): number => {
  const sorted = [...new Set(xs)].sort((left, right) => left - right);
  let minGap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];
    if (current === undefined || previous === undefined) continue;
    minGap = Math.min(minGap, current - previous);
  }
  const spacing = Number.isFinite(minGap) ? minGap : 0.1;
  return (spacing * bodyWidth) / 2;
};

const readCandles = (layer: CompiledLayer): Candle[] => {
  const params = layer.params as unknown as CandlestickParams;
  const rows: Array<Omit<Candle, 'halfBody' | 'isUp'>> = [];
  for (const observation of layer.data) {
    const x = getX(observation);
    const low = getYMin(observation);
    const high = getYMax(observation);
    const open = getScaledAesthetic(observation, 'open');
    const close = getScaledAesthetic(observation, 'close');
    if (x === null || low === null || high === null || open === null || close === null) continue;
    rows.push({ x, low, high, open, close });
  }
  const halfBody = resolveHalfBody(
    rows.map((row) => row.x),
    params.bodyWidth
  );
  return rows.map((row) => ({ ...row, halfBody, isUp: row.close >= row.open }));
};

/** Minimum body height in `[0, 1]` so a doji (open ≈ close) still shows a flat tick. */
const MIN_BODY = 0.0016;

const CandleMark = ({ candle, params }: { candle: Candle; params: CandlestickParams }) => {
  const color = candle.isUp ? params.upColor : params.downColor;
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);
  const rawHeight = bodyTop - bodyBottom;
  const height = Math.max(rawHeight, MIN_BODY);
  // Centre a clamped near-doji body on the open/close midpoint so it doesn't drift off the wick.
  const top = rawHeight < MIN_BODY ? (bodyTop + bodyBottom) / 2 + height / 2 : bodyTop;
  return (
    <g>
      <line
        x1={toPercent(toViewBoxX(candle.x))}
        x2={toPercent(toViewBoxX(candle.x))}
        y1={toPercent(toViewBoxY(candle.high))}
        y2={toPercent(toViewBoxY(candle.low))}
        stroke={color}
        strokeWidth={params.wickWidth}
      />
      <rect
        x={toPercent(toViewBoxX(candle.x - candle.halfBody))}
        width={toPercent(candle.halfBody * 2)}
        y={toPercent(toViewBoxY(top))}
        height={toPercent(height)}
        fill={color}
      />
    </g>
  );
};

const CandlestickLayer = ({ layer }: { layer: CompiledLayer }) => {
  const candles = useMemo(() => readCandles(layer), [layer]);
  const params = layer.params as unknown as CandlestickParams;
  return (
    <>
      {candles.map((candle, index) => (
        <CandleMark key={index} candle={candle} params={params} />
      ))}
    </>
  );
};

/** Re-paints the hovered candle above the CSS-dimmed siblings (the `observation-rerender` strategy). */
const HoveredCandle = ({ layer, observation }: { layer: CompiledLayer; observation: Observation }) => {
  const params = layer.params as unknown as CandlestickParams;
  // Read every candle so band spacing (and thus body width) matches the base layer, then pick the
  // hovered one by its band centre — each candle owns a distinct x.
  const candle = useMemo(() => {
    const hoveredX = getX(observation);
    return readCandles(layer).find((entry) => entry.x === hoveredX) ?? null;
  }, [layer, observation]);
  return candle ? <CandleMark candle={candle} params={params} /> : null;
};

const candlestick = defineGeomRenderer(new CandlestickGeom(), {
  coord: 'cartesian',
  guideMode: 'band',
  render: ({ layer }) => <CandlestickLayer layer={layer} />,
  renderHover: ({ layer, primary }) => <HoveredCandle layer={layer} observation={primary.observation} />,
  renderHoverCompanions: () => null,
});

export const kit = createGraphyKit({ plugins: [candlestick] });
```

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react-renderer';
import type { Data } from '@graphysdk/viz-engine';
import { kit } from './candlestick';

const prices: Data = {
  columns: [{ key: 'date' }, { key: 'open' }, { key: 'high' }, { key: 'low' }, { key: 'close' }],
  rows: [
    { date: 'Apr 01', open: 100, high: 103, low: 99, close: 102 },
    { date: 'Apr 02', open: 102, high: 104, low: 101, close: 101 },
    { date: 'Apr 03', open: 101, high: 105, low: 100, close: 104 },
    { date: 'Apr 04', open: 104, high: 106, low: 103, close: 103 },
    { date: 'Apr 07', open: 103, high: 104, low: 100, close: 100 },
  ],
};

const candlestickSpec = kit.pipe(
  kit.createSpec({ x: 'date' }),
  // Open/high/low/close are authored as ordinary aesthetics.
  kit.geom.candlestick({ aes: { open: 'open', high: 'high', low: 'low', close: 'close' } }),
  // Trading sessions are ordinal: one candle per band at equal spacing (weekend gaps collapse).
  kit.scale.x.discrete(),
  // The price axis zooms to the data rather than anchoring at zero.
  kit.scale.y.continuous({ zero: false })
);

export const CandlestickGraph = () => (
  <kit.GraphProvider input={candlestickSpec} data={prices}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- Add or drop positional aesthetics by editing `positionRoles`: `role: 'min'`/`'max'` entries fill the `yMin`/`yMax` interval columns, `role: 'scalar'` entries are scaled in place into their own derived column; all of them feed the axis domain, so every declared price trains the scale. Each `aes` name becomes a key in the layer's `aes` object; scalars are read via `getScaledAesthetic`.
- Keep `compile()` injecting a representative `y` mapping if you rely on the built-in band hover and tooltip; the `tooltip` rows read the raw (unscaled) values of any declared aesthetic.
- `guideMode: 'band'` assumes a discrete x scale; for a continuous x, switch to `'crosshair'` and reconsider `resolveHalfBody` (body width derives from the minimum gap between x positions).
