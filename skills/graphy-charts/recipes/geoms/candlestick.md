# Candlestick

One candle per trading session: a body from open to close and a wick from low to high, colored by whether the session rose or fell. Ships as `@graphysdk/geom-candlestick`; do not write a plugin for it.

## Install

```bash
npm install @graphysdk/geom-candlestick
```

Peers: `@graphysdk/react` and React.

## Basic

One row per session. Map the session to `x` and the four prices through `aes`. All four are required.

```tsx
import { candlestick } from '@graphysdk/geom-candlestick';
import { createGraphyKit, GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

const priceData: Data = {
  columns: [
    { key: 'date', label: 'Date' },
    { key: 'open', label: 'Open' },
    { key: 'high', label: 'High' },
    { key: 'low', label: 'Low' },
    { key: 'close', label: 'Close' },
  ],
  rows: [
    { date: 'Apr 01', open: 100, high: 103, low: 99, close: 102 },
    { date: 'Apr 02', open: 102, high: 104, low: 101, close: 101 },
    { date: 'Apr 03', open: 101, high: 105, low: 100, close: 104 },
    { date: 'Apr 04', open: 104, high: 106, low: 103, close: 103 },
    { date: 'Apr 07', open: 103, high: 104, low: 100, close: 100 },
    { date: 'Apr 08', open: 100, high: 102, low: 98, close: 101 },
    { date: 'Apr 09', open: 101, high: 107, low: 101, close: 106 },
  ],
};

const kit = createGraphyKit({ plugins: [candlestick] });

const spec = kit.pipe(
  kit.createSpec({ x: 'date' }),
  kit.geom.candlestick({ aes: { open: 'open', high: 'high', low: 'low', close: 'close' } }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);

export function Prices() {
  return (
    <kit.GraphProvider data={priceData} spec={spec}>
      <GraphRenderer />
    </kit.GraphProvider>
  );
}
```

Create the kit once at module scope. `kit.GraphProvider` shows "Made with Graphy" by default; `config({ content: { brandMark: { enabled: false } } })` turns it off. Sessions sit one per band at equal spacing, so a weekend takes no room. The price axis fits the prices; it does not hold zero. A session rises when its close is at or above its open, so a doji counts as rising. The close stands in for the layer's `y`: a highlight or headline reading `y` reads the close. A `y` in the root mapping does not reach the layer.

## Variants

### Horizontal

Add `kit.coord.flip()`. Sessions move to the vertical axis.

### Body width

`width` is the fraction of its band a body spans, in `(0, 1]`. Default `0.6`. Above `1` clamps to `1`; at or below `0` falls back to the default; both warn.

```ts
const wideBodies = kit.geom.candlestick({
  aes: { open: 'open', high: 'high', low: 'low', close: 'close' },
  params: { width: 0.8 },
});
```

### Styling

The color comes from a part per direction. The bodies' other properties and the wick have builders of their own.

```ts
import { styles } from '@graphysdk/react';

const styledSpec = kit.pipe(
  kit.createSpec({ x: 'date' }),
  kit.geom.candlestick({ aes: { open: 'open', high: 'high', low: 'low', close: 'close' } }),
  styles({
    defaults: [
      kit.style.geom.candlestick.rising({ fill: 'transparent', stroke: '#1f7a6d' }),
      kit.style.geom.candlestick.falling({ fill: '#3a3833', stroke: '#3a3833' }),
      kit.style.geom.candlestick.wick({ stroke: '#898373' }),
    ],
  }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous()
);
```

| Builder                                | Properties                                    | Default                          |
| -------------------------------------- | --------------------------------------------- | -------------------------------- |
| `kit.style.geom.candlestick.rising()`  | `fill`, `stroke`                              | The positive trend color         |
| `kit.style.geom.candlestick.falling()` | `fill`, `stroke`                              | The negative trend color         |
| `kit.style.geom.candlestick()`         | `alpha`, `fillAlpha`, `strokeWidth`           | 1px border                       |
| `kit.style.geom.candlestick.wick()`    | `stroke`, `alpha`, `strokeWidth`, `dashArray` | 1px, in its direction's `stroke` |

A chart-wide `style.geom({ fill })` does not reach the candles. Each session carries a `candlestickDirection` column, `'rising'` or `'falling'`. Name it in a `where` or a `highlight`:

```ts
const thickFalling = kit.style.geom.candlestick(
  { strokeWidth: 2 },
  { where: { variable: 'candlestickDirection', eq: 'falling' } }
);
```

### Color through a scale

`color` is opt-in. Map it to `candlestickDirection` for a legend, or to your own column. A mapped color replaces the direction parts' built-in colors and their `defaults` entries; an `overrides` entry replaces the mapped color.

```ts
const legendSpec = kit.pipe(
  kit.createSpec({ x: 'date' }),
  kit.geom.candlestick({
    aes: { open: 'open', high: 'high', low: 'low', close: 'close', color: 'candlestickDirection' },
  }),
  kit.scale.x.discrete(),
  kit.scale.y.continuous(),
  kit.scale.color.discrete({ domain: ['rising', 'falling'], range: ['#1f8a70', '#c8453b'] })
);
```

### Hover and highlight

The tooltip lists open, high, low and close, each labeled by its column `label`. A press anywhere on the candle takes its session. A highlight raises each matched candle whole: `highlight({ variable: 'candlestickDirection', eq: 'falling' })`.

## Pitfalls

- All four prices must be mapped. A missing one fails compile with `MISSING_AESTHETIC`.
- The x axis is always a band, even for dates. Declare `kit.scale.x.discrete()`.
- `position` is always `'identity'`. No polar coordinates.
- No data labels: `dataLabels` prints nothing on a candle.
- Volume is a separate bar layer. OHLC ticks are not drawn.
- `plugins` are read once at mount. Keep the kit at module scope.
