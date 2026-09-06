# Candlestick

Technique: custom positional aesthetics (open/high/low/close).

Reach for this pattern when a mark needs more positional inputs than `x`/`y` and they must all share one axis. The geom declares extra positional aesthetics in `positionRoles`; the engine then trains the price scale over all four prices, builds the axis, and hands the renderer `[0, 1]` positions — `compile()` stays nearly empty. This is the lightest custom-geom form: no layout algorithm, no custom hit-testing (the built-in bucket hover — the nearest candle's x anywhere in the panel — works because `compile()` injects the `y` column the bucket index requires).

## Plugin

```tsx
import { useMemo } from 'react';
import { createGraphyKit, defineGeomRenderer } from '@graphysdk/react-renderer';
import type { CompiledGeom, CompiledLayer, GeomCompilerInput, GeomStyleReaders, Observation } from '@graphysdk/viz-engine';
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
    { axis: 'y', role: 'min', valueKind: 'value', aes: 'low' }, // wick bottom → yMin (numeric; domain via the injected `y`)
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'high' }, // wick top → yMax (numeric)
    { axis: 'y', role: 'scalar', valueKind: 'value', aes: 'open' }, // body (scaled; joins the domain via its own positional axis)
    { axis: 'y', role: 'scalar', valueKind: 'value', aes: 'close' },
  ] as const;
  // Cartesian only: opts out of `coord.flip()`.
  override readonly supportedCoordTypes = ['cartesian'] as const;
  // Declared but not read for a custom geom: `layer.highlight` is looked up by built-in geom name, so a
  // spec `highlight()` never dims or re-renders this layer (see Adapting).
  override readonly highlightStrategy = 'observation-rerender' as const;
  // Each row reads its own `aes` column (the raw price), not the injected `y`.
  override readonly tooltip = [
    { key: 'Open', aes: 'open' },
    { key: 'High', aes: 'high' },
    { key: 'Low', aes: 'low' },
    { key: 'Close', aes: 'close' },
  ] as const;
  override readonly spatialKind = 'buckets';

  // The pipeline scales the prices. The injected `y` mapping does two jobs: the bucket hover index needs
  // a `POSITION_VARIABLES.y` column next to x, and the interval roles (`low`/`high`) reach the y-scale
  // domain only through a `y` mapping that resolves to `yMin`/`yMax` (`open`/`close` are `scalar` roles
  // and reach it separately via their own positional axes). The session high serves; the tooltip does
  // not read it. `min`/`max` role columns must be numeric.
  compile({ data, mapping }: GeomCompilerInput): CompiledGeom {
    return { data, mapping: { y: mapping.high } };
  }
}

/** One candle in `[0, 1]` data-up space — wick and body bounds already scaled, plus its cascade alpha. */
interface Candle {
  x: number;
  low: number;
  high: number;
  open: number;
  close: number;
  alpha: number;
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

const readCandles = (layer: CompiledLayer, styleReaders: GeomStyleReaders): Candle[] => {
  const params = layer.params as unknown as CandlestickParams;
  const rows: Array<Omit<Candle, 'halfBody' | 'isUp'>> = [];
  for (const observation of layer.data) {
    const x = getX(observation);
    const low = getYMin(observation);
    const high = getYMax(observation);
    const open = getScaledAesthetic(observation, 'open');
    const close = getScaledAesthetic(observation, 'close');
    if (x === null || low === null || high === null || open === null || close === null) continue;
    // `alpha` through the cascade: a user `style.geom` entry or the built-in default, never a constant.
    rows.push({ x, low, high, open, close, alpha: styleReaders.get('alpha', observation) });
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
  // Up/down is semantic paint the stylesheet has no vocabulary for, so it stays a geom param.
  const color = candle.isUp ? params.upColor : params.downColor;
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);
  const rawHeight = bodyTop - bodyBottom;
  const height = Math.max(rawHeight, MIN_BODY);
  // Centre a clamped near-doji body on the open/close midpoint so it doesn't drift off the wick.
  const top = rawHeight < MIN_BODY ? (bodyTop + bodyBottom) / 2 + height / 2 : bodyTop;
  return (
    <g opacity={candle.alpha}>
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

const CandlestickLayer = ({ layer, styleReaders }: { layer: CompiledLayer; styleReaders: GeomStyleReaders }) => {
  const candles = useMemo(() => readCandles(layer, styleReaders), [layer, styleReaders]);
  const params = layer.params as unknown as CandlestickParams;
  return (
    <>
      {candles.map((candle, index) => (
        <CandleMark key={index} candle={candle} params={params} />
      ))}
    </>
  );
};

/**
 * Re-paints the hovered candle above its siblings, which the layer group's CSS hover-dim fades. That
 * dimming is driven by the hover store holding any primary hit (`useHoverDim` sets `data-hover-active`
 * on the geom group), not by `highlightStrategy`; this output escapes it only because it paints outside
 * that group.
 */
const HoveredCandle = ({
  layer,
  observation,
  styleReaders,
}: {
  layer: CompiledLayer;
  observation: Observation;
  styleReaders: GeomStyleReaders;
}) => {
  const params = layer.params as unknown as CandlestickParams;
  // Read every candle so band spacing (and thus body width) matches the base layer, then pick the
  // hovered one by its band centre — each candle owns a distinct x.
  const candle = useMemo(() => {
    const hoveredX = getX(observation);
    return readCandles(layer, styleReaders).find((entry) => entry.x === hoveredX) ?? null;
  }, [layer, observation, styleReaders]);
  return candle ? <CandleMark candle={candle} params={params} /> : null;
};

const candlestick = defineGeomRenderer(new CandlestickGeom(), {
  coord: 'cartesian',
  guideMode: 'band',
  // `swatchShape` omitted → legend/tooltip swatches fall back to `'square'`.
  render: ({ layer, styleReaders }) => <CandlestickLayer layer={layer} styleReaders={styleReaders} />,
  renderHover: ({ layer, primary, styleReaders }) => (
    <HoveredCandle layer={layer} observation={primary.observation} styleReaders={styleReaders} />
  ),
  renderHoverCompanions: () => null,
});

export const kit = createGraphyKit({ plugins: [candlestick] });
```

The marks are `%`-positioned children of the panel SVG, so the renderer never needs pixel sizes; `input.panelRect` (the panel's layout-pixel `Rect`, x/y already applied — paint in local 0…width / 0…height) is the escape hatch when it does. `spatialKind: 'buckets'` means `input.intro` offers a wipe plan; this renderer ignores it (plans are offered, never imposed), so the candles pop in while built-in layers animate.

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

- Add or drop positional aesthetics by editing `positionRoles`: `role: 'min'`/`'max'` entries fill the `yMin`/`yMax` interval columns (numeric only), `role: 'scalar'` entries are scaled in place into their own derived column. All of them train the scale, by two routes: `min`/`max` reach the domain only through a `y` mapping that resolves to `yMin`/`yMax`, while `scalar` roles reach it via their own custom positional axes. Each `aes` name becomes a key in the layer's `aes` object; scalars are read via `getScaledAesthetic`. Requiredness is asymmetric: `low`/`high` (min/max roles with an `aes`) are required, while `open`/`close` (scalar) are optional unless asserted via `validateMapping`.
- Keep `compile()` injecting a representative `y` mapping — the bucket hover index needs a y position column next to x, and dropping it also removes `low`/`high` from the y domain. The `tooltip` rows read the raw (unscaled) value of each declared aesthetic through its own `aes`, never `y`.
- `guideMode: 'band'` assumes a discrete x scale; for a continuous x, switch to `'crosshair'` and reconsider `resolveHalfBody` (body width derives from the minimum gap between x positions). `HoveredCandle` re-derives that width from every candle on each pointer move; a pixel body width from `input.panelRect.width` would make it a constant instead, and `HoverRenderInput` carries `panelRect` too, so the hovered candle can take the same pixel route.
- Paint is inside the style cascade: `styleReaders.get('alpha', observation)` (and `get('color', observation)`, if you want the wick in the layer's colour) honour a user's `style.geom` entries and dark-scheme tokens; `getColor`/`getAlpha` expose the encoding only. `upColor`/`downColor` stay geom params because the stylesheet has no up/down vocabulary; as fixed hex they ignore the scheme — branch on `input.colorScheme` (`'light' | 'dark'`) for a light/dark pair. See `reference/styling.md`.
- `highlightStrategy` is inert here (see the class comment): a custom geom that should recede while another layer is highlighted paints its own de-emphasis via `styleReaders.get('alpha', observation, 'dimmed')`. `identityKey: 'index'` would be equally inert — it is only read for `'render-hit-test'` geoms — so it is not declared.
- No `resolveAnchorPosition` is implemented, so annotations cannot anchor to the candles; implement it returning the candle's `[0,1]` position (the close, or the wick top) to make them annotatable. The omission is silent for a `'buckets'` layer — `MISSING_ANCHOR_CAPABILITY` fires for render-hit-test layers only.
