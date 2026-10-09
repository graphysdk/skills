# Panel rect

A minimal custom geom whose paint reads `panelRect`, the panel's pixel size. Use it as the starting point for a geom that needs real pixels, such as a circle that must stay round when the frame is resized.

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './panel-circle-geom';

const data: Data = {
  columns: [{ key: 'band' }, { key: 'value' }],
  rows: [
    { band: 'A', value: 10 },
    { band: 'B', value: 20 },
  ],
};

const spec = kit.pipe(kit.createSpec({ x: 'band', y: 'value' }), kit.geom.panelCircle(), kit.scale.x(), kit.scale.y());

export const InscribedCircle = () => (
  <kit.GraphProvider spec={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `panel-circle-geom.tsx`.

```tsx
import type { GeomCompileResult, GeomCompilerInput } from '@graphysdk/react';
import { createGraphyKit, defineGeomRenderer, Geom } from '@graphysdk/react';

class PanelCircleGeom extends Geom {
  readonly type = 'panelCircle' as const;
  override readonly defaultParams = {};
  // Declared so the scales and axes compile. The paint does not read the observations.
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' },
    { axis: 'y', role: 'point', valueKind: 'value' },
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  // Nothing is drawn at the observations, so hover has nothing to find. The default `'points'` would
  // index each observation at its x and y and show a tooltip there.
  override readonly spatialKind = 'noop';

  compile({ data }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: {} };
  }
}

const panelCircle = defineGeomRenderer(new PanelCircleGeom(), {
  coord: 'cartesian',
  // `panelRect` is in pixels and the panel SVG uses pixel units, so the circle stays round at any size.
  render: ({ panelRect }) => {
    const radius = Math.min(panelRect.width, panelRect.height) / 4;
    return <circle cx={panelRect.width / 2} cy={panelRect.height / 2} r={radius} fill="#4e79a7" />;
  },
  renderHover: () => null,
  renderHoverCompanions: () => null,
});

export const kit = createGraphyKit({ plugins: [panelCircle] });
```

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- `panelRect.x` and `panelRect.y` are already applied by the panel SVG. Paint in local `0…width` and `0…height`; adding them offsets the paint twice.
- The geom name becomes the builder method: `type = 'panelCircle'` gives `kit.geom.panelCircle()`.
- To draw from the observations instead, read `layer.data` in `render`, and set `spatialKind` back to the shape drawn so hover works.
