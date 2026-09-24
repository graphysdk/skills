# Candlestick

A custom OHLC `candlestick` geom: a high to low wick with an open to close body per trading session. Use it for price data where each observation carries four values.

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './candlestick-geom';

const prices: Data = {
  columns: [{ key: 'date' }, { key: 'open' }, { key: 'high' }, { key: 'low' }, { key: 'close' }],
  rows: [
    { date: 'Apr 01', open: 100, high: 103, low: 99, close: 102 },
    { date: 'Apr 02', open: 102, high: 104, low: 101, close: 101 },
    { date: 'Apr 03', open: 101, high: 105, low: 100, close: 104 },
    { date: 'Apr 04', open: 104, high: 106, low: 103, close: 103 },
    { date: 'Apr 07', open: 103, high: 104, low: 100, close: 100 },
    { date: 'Apr 08', open: 100, high: 102, low: 98, close: 101 },
    { date: 'Apr 09', open: 101, high: 107, low: 101, close: 106 },
    { date: 'Apr 10', open: 106, high: 108, low: 105, close: 107 },
    { date: 'Apr 11', open: 107, high: 109, low: 104, close: 105 },
    { date: 'Apr 14', open: 105, high: 106, low: 102, close: 103 },
  ],
};

const spec = kit.pipe(
  kit.createSpec({ x: 'date' }),
  // Open, high, low, and close are ordinary aesthetics declared by the geom.
  kit.geom.candlestick({ aes: { open: 'open', high: 'high', low: 'low', close: 'close' } }),
  // Sessions are ordinal: one candle per band at equal spacing.
  kit.scale.x.discrete(),
  // The price axis fits the data instead of starting at zero.
  kit.scale.y.continuous()
);

export const CandlestickGraph = () => (
  <kit.GraphProvider spec={spec} data={prices}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `candlestick-geom.tsx`.

```tsx
import { useMemo } from 'react';

import type { GeomCompileResult, GeomCompilerInput, Observation, SceneLayer } from '@graphysdk/react';
import {
  createGraphyKit,
  defineGeomRenderer,
  Geom,
  getScaledAesthetic,
  getX,
  getYMax,
  getYMin,
  toPercent,
  toViewBoxX,
  toViewBoxY,
} from '@graphysdk/react';

interface CandlestickParams {
  /** Candle body width as a fraction of the band spacing (the wick sits at the band centre). */
  bodyWidth: number;
  /** Wick stroke width, in pixels. */
  wickWidth: number;
  /** Colour for a rising session (close at or above open). */
  upColor: string;
  /** Colour for a falling session (close below open). */
  downColor: string;
}

/**
 * The wick is a y interval (`low` and `high` train the price axis). Open and close are two scalar y
 * aesthetics scaled through the same price scale, with the raw prices preserved for the tooltip.
 * The geom declares five positional aesthetics and the engine does the rest.
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
    { axis: 'y', role: 'min', valueKind: 'value', aes: 'low' }, // wick bottom, drives the domain
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'high' }, // wick top
    { axis: 'y', role: 'scalar', valueKind: 'value', aes: 'open' }, // body, scaled, raw price preserved
    { axis: 'y', role: 'scalar', valueKind: 'value', aes: 'close' },
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = 'observation-rerender' as const;
  override readonly identityKey = 'index' as const;
  // The tooltip shows all four prices of the hovered session.
  override readonly tooltip = [
    { key: 'Open', aes: 'open' },
    { key: 'High', aes: 'high' },
    { key: 'Low', aes: 'low' },
    { key: 'Close', aes: 'close' },
  ] as const;

  override readonly spatialKind = 'buckets';

  // Hover hit-testing and the tooltip key on `mapping.y`, so inject the session high as the representative y.
  compile({ data, mapping }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: { y: mapping.high } };
  }
}

/** One candle in [0, 1] data-up space, with both wick bounds and both body bounds already scaled. */
interface Candle {
  x: number;
  low: number;
  high: number;
  open: number;
  close: number;
  halfBody: number;
  isUp: boolean;
}

/** Body half-width in [0, 1]: a fraction of the smallest gap between adjacent band centres. */
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

const readCandles = (layer: SceneLayer): Candle[] => {
  const params = layer.params as unknown as CandlestickParams;
  const rows: Array<Omit<Candle, 'halfBody' | 'isUp'>> = [];
  for (const observation of layer.data) {
    const x = getX(observation);
    const low = getYMin(observation);
    const high = getYMax(observation);
    // Open and close were scaled into derived columns; the raw prices stay for the tooltip.
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

/** Minimum body height in [0, 1] so a doji (open close to close) still shows a flat tick. */
const MIN_BODY = 0.0016;

const CandleMark = ({ candle, params }: { candle: Candle; params: CandlestickParams }) => {
  const color = candle.isUp ? params.upColor : params.downColor;
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);
  const rawHeight = bodyTop - bodyBottom;
  const height = Math.max(rawHeight, MIN_BODY);
  // Centre a clamped near-doji body on the open/close midpoint so it does not drift off the wick.
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

const CandlestickLayer = ({ layer }: { layer: SceneLayer }) => {
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

/** Repaints the hovered candle above the dimmed siblings (the `observation-rerender` strategy). */
const HoveredCandle = ({ layer, observation }: { layer: SceneLayer; observation: Observation }) => {
  const params = layer.params as unknown as CandlestickParams;
  // Read every candle so band spacing (and body width) matches the base layer, then pick the hovered
  // one by its band centre. Each candle owns a distinct x.
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

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- The geom declares `open`, `high`, `low`, and `close` as its own positional aesthetics, so `kit.geom.candlestick({ aes })` is fully typed.
- Colours are geom params (`upColor`, `downColor`), not stylesheet paint: `kit.geom.candlestick({ params: { upColor: '#2e7d5b' } })`.
- Cartesian only. Hover repaints the candle in place and the tooltip lists all four prices.
