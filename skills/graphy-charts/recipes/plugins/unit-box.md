# Unit box

A custom geom that draws each observation as a stretched unit-space box with a pixel-radius circle at its center. Use it to see how `UnitBoxSvg` keeps circles round while the box around them follows the panel's aspect ratio.

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './round-mark-geom';

const data: Data = {
  columns: [{ key: 'band' }, { key: 'value' }],
  rows: [
    { band: 'A', value: 2 },
    { band: 'B', value: 5 },
    { band: 'C', value: 3 },
    { band: 'D', value: 6 },
  ],
};

const spec = kit.pipe(kit.createSpec({ x: 'band', y: 'value' }), kit.geom.roundMark(), kit.scale.x(), kit.scale.y());

export const CirclesStayRound = () => (
  <kit.GraphProvider spec={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `round-mark-geom.tsx`.

```tsx
import type { GeomCompileResult, GeomCompilerInput } from '@graphysdk/react';
import { createGraphyKit, defineGeomRenderer, Geom, getX, getY, toViewBoxY, UnitBoxSvg } from '@graphysdk/react';

const COLOR = '#4e79a7';
/** Half the box size, in unit space. */
const BOX_HALF = 0.1;

class RoundMarkGeom extends Geom {
  readonly type = 'roundMark' as const;
  override readonly defaultParams = {};
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' },
    { axis: 'y', role: 'point', valueKind: 'value' },
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;

  compile({ data }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: {} };
  }
}

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new RoundMarkGeom(), {
      coord: 'cartesian',
      render: ({ layer }) => (
        <>
          {[...layer.data].map((observation, index) => {
            const x = getX(observation);
            const y = getY(observation);
            if (x === null || y === null) return null;
            // Scaled y points up. Unit boxes have a top-left origin, so flip it.
            const top = toViewBoxY(y);
            return (
              <UnitBoxSvg
                key={index}
                box={{ x0: x - BOX_HALF, y0: top - BOX_HALF, x1: x + BOX_HALF, y1: top + BOX_HALF }}
              >
                <rect width="100%" height="100%" fill={COLOR} fillOpacity={0.18} />
                <circle cx="50%" cy="50%" r={16} fill={COLOR} />
              </UnitBoxSvg>
            );
          })}
        </>
      ),
      renderHover: () => null,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- `UnitBoxSvg` places a nested `<svg>` over a box given in unit space (`x0`, `y0`, `x1`, `y1` in [0, 1], top-left origin). Its children use pixel units, so `r={16}` stays 16 pixels at any panel size. Children are clipped to the box, so a circle wider than the box on a small panel is cut off.
- `getX` and `getY` return positions scaled to [0, 1] with y pointing up, or `null` for a missing value. Pass y through `toViewBoxY` before building the box.
- Hover still resolves: the default `spatialKind` is `'points'`, so each observation is indexed at its x and y and the tooltip appears there. `renderHover` returns `null`, so nothing extra is painted. Set `spatialKind = 'noop'` to switch hover off.
