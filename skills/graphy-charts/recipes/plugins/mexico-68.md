# Mexico 68 echo renderers

Replaces how the built-in bar, line and point geoms are painted: every geom becomes concentric outlines with no solid core. Bars turn into arches, polar bars into outlined slices with dark echoes, lines into three parallel strokes ending in a target, and points into targets. The theme that goes with it is in [recipes/themes/mexico-68.md](../themes/mexico-68.md).

## Usage

These are render-only overrides of built-in geoms, so specs use the normal builders and no kit is needed. Pass the array to the provider.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, pipe, scale, type Data } from '@graphysdk/react';

import { mexicoPlugins } from './mexico-68-renderers';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({
    position: 'identity',
    params: { width: 0.5 },
    dataLabels: { showDataLabels: true, position: 'outside', justify: 'end', align: 'center' },
  }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: ['#EC008C', '#F7931E'] })
);

export const ArchBarsGraph = ({ data }: { data: Data }) => (
  <GraphProvider data={data} spec={spec} plugins={mexicoPlugins}>
    <GraphRenderer />
  </GraphProvider>
);
```

The same array covers `geom.line()`, `geom.point()`, and `geom.bar()` under `coord.polar()`.

## Plugin

Save as `mexico-68-renderers.tsx`.

```tsx
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import {
  defineGeomRenderer,
  getAlpha,
  getAngleExtent,
  getBarRectBounds,
  getColor,
  getGroup,
  getRadiusExtent,
  getX,
  getY,
  GROUP_VARIABLES,
  toViewBoxX,
  toViewBoxY,
  type EditOutlineShape,
  type HoverHit,
  type Observation,
  type SceneLayer,
} from '@graphysdk/react';
import {
  buildPolarBarArcPath,
  createStableKeyGenerator,
  getStackRole,
  prepareLineObservations,
  type CartesianCoordSystem,
  type MainAxis,
  type SceneLayerFor,
  type StackRole,
  type XYPoint,
} from '@graphysdk/viz-engine';

const DARK = '#1A1A1A';

// Three echoes, 5.5px apart, each a 2px stroke. Thin geoms drop to fewer echoes.
const ECHOES = 3;
const ECHO_STEP = 5.5;
const ECHO_STROKE = 2;

// Target: a dot inside two circles, the outer one faded.
const TARGET_DOT = 3;
const TARGET_CIRCLE_MID = 7.5;
const TARGET_CIRCLE_OUTER = 12;
const TARGET_OUTER_OPACITY = 0.55;

// Slices sit at 90% radius so the dark echoes have room to radiate outward.
const SLICE_RADIUS_SCALE = 0.9;
const SLICE_GAP_PX = 1.5;
const SLICE_ECHO_STEP_PX = 4;
const SLICE_ECHO_OPACITY = 0.5;

// Hover keeps the echoes, thickens the stroke, and adds a faint solid core.
const HOVER_STROKE = ECHO_STROKE + 1.5;
const HOVER_FILL_OPACITY = 0.18;
const COMPANION_OPACITY = 0.5;

interface PixelSize {
  width: number;
  height: number;
}

// The arch caps, parallel echoes and target circles need true pixels, which the [0,1] position space
// cannot give. The engine mounts each geom into a panel-sized svg whose units are pixels, so the geoms
// paint into a <g> at pixel coordinates and read the panel size off that svg. Hover renderers receive
// panelRect directly and skip this.
const usePanelSize = (): { ref: RefObject<SVGGElement | null>; size: PixelSize } => {
  const ref = useRef<SVGGElement | null>(null);
  const [size, setSize] = useState<PixelSize>({ width: 0, height: 0 });

  useEffect(() => {
    const panelSvg = ref.current?.ownerSVGElement;
    if (!panelSvg) return;
    const rootSvg = panelSvg.ownerSVGElement ?? panelSvg;
    const measure = () => {
      const width = panelSvg.width.baseVal.value;
      const height = panelSvg.height.baseVal.value;
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rootSvg);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
};

const Target = ({
  cx,
  cy,
  color,
  isEmphasized = false,
}: {
  cx: number;
  cy: number;
  color: string;
  isEmphasized?: boolean;
}): ReactNode => {
  const strokeWidth = isEmphasized ? ECHO_STROKE + 1 : ECHO_STROKE;
  return (
    <>
      {isEmphasized && (
        <circle
          cx={cx}
          cy={cy}
          r={TARGET_CIRCLE_OUTER + ECHO_STEP}
          fill="none"
          stroke={color}
          strokeWidth={ECHO_STROKE}
          opacity={TARGET_OUTER_OPACITY / 2}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={TARGET_CIRCLE_OUTER}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={TARGET_OUTER_OPACITY}
      />
      <circle cx={cx} cy={cy} r={TARGET_CIRCLE_MID} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={isEmphasized ? TARGET_DOT + 1.5 : TARGET_DOT} fill={color} />
    </>
  );
};

// Bars, cartesian: each bar is a set of concentric arches. Two legs run to the baseline and a semicircle
// caps them. A stacked bar paints one arch per segment; a segment above another rests on that one's dome.

interface ArchSegment {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  cap: StackRole;
}

const buildArchPath = (centerX: number, baselineY: number, capCenterY: number, radius: number): string => {
  const left = centerX - radius;
  const right = centerX + radius;
  return `M ${left} ${baselineY} L ${left} ${capCenterY} A ${radius} ${radius} 0 0 1 ${right} ${capCenterY} L ${right} ${baselineY}`;
};

const toArchSegment = (observation: Observation, mainAxis: MainAxis, key: string): ArchSegment | null => {
  const bounds = getBarRectBounds(mainAxis, observation);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
  return {
    key,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    color: getColor(observation) ?? DARK,
    opacity: getAlpha(observation) ?? 1,
    cap: getStackRole(observation),
  };
};

const ArchMark = ({
  segment,
  size,
  isEmphasized = false,
}: {
  segment: ArchSegment;
  size: PixelSize;
  isEmphasized?: boolean;
}): ReactNode => {
  const barWidth = segment.width * size.width;
  const centerX = (segment.x + segment.width / 2) * size.width;
  const capTopY = segment.y * size.height;
  const segBottomY = (segment.y + segment.height) * size.height;
  const segHeight = segBottomY - capTopY;

  const outerRadius = Math.min(barWidth / 2, segHeight);
  const capCenterY = capTopY + outerRadius;
  const echoCount = Math.max(1, Math.min(ECHOES, Math.floor(outerRadius / ECHO_STEP)));
  const strokeWidth = isEmphasized ? HOVER_STROKE : ECHO_STROKE;

  // A floor or solo segment owns the baseline. A segment above rests on the dome below it, so each echo's
  // legs end where they meet that dome.
  const ownsBaseline = segment.cap === 'solo' || segment.cap === 'floor';
  const belowRadius = barWidth / 2;
  const belowCapCenterY = segBottomY + belowRadius;
  const computeLegBaseY = (radius: number): number =>
    ownsBaseline ? segBottomY : belowCapCenterY - Math.sqrt(Math.max(0, belowRadius * belowRadius - radius * radius));

  return (
    <g opacity={segment.opacity}>
      {isEmphasized && (
        <path
          d={buildArchPath(centerX, computeLegBaseY(outerRadius), capCenterY, outerRadius)}
          fill={segment.color}
          opacity={HOVER_FILL_OPACITY}
          stroke="none"
        />
      )}
      {Array.from({ length: echoCount }, (_, echo) => {
        const radius = outerRadius - echo * ECHO_STEP;
        if (radius <= 0.5) return null;
        return (
          <path
            key={echo}
            d={buildArchPath(centerX, computeLegBaseY(radius), capCenterY, radius)}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
};

// Taller arches first, so a shorter segment in front covers their touching legs.
const byDescendingHeight = (first: ArchSegment, second: ArchSegment): number => first.y - second.y;

const ArchBars = ({ layer, coordSystem }: { layer: SceneLayer; coordSystem: CartesianCoordSystem }): ReactNode => {
  const { ref, size } = usePanelSize();

  const segments = useMemo<ArchSegment[]>(() => {
    const generateKey = createStableKeyGenerator(layer.data, layer.mapping, layer.id);
    const collected: ArchSegment[] = [];
    for (const observation of layer.data) {
      const segment = toArchSegment(observation, coordSystem.mainAxis, generateKey(observation));
      if (segment) collected.push(segment);
    }
    return collected.sort(byDescendingHeight);
  }, [layer.data, layer.mapping, layer.id, coordSystem.mainAxis]);

  return (
    <g ref={ref} data-geom="bar">
      {size.width > 0 && segments.map((segment) => <ArchMark key={segment.key} segment={segment} size={size} />)}
    </g>
  );
};

const ArchHover = ({
  observations,
  mainAxis,
  size,
}: {
  observations: Observation[];
  mainAxis: MainAxis;
  size: PixelSize;
}): ReactNode => {
  const segments: ArchSegment[] = [];
  observations.forEach((observation, index) => {
    const segment = toArchSegment(observation, mainAxis, `hover-${index}`);
    if (segment) segments.push(segment);
  });
  if (size.width <= 0 || segments.length === 0) return null;
  return (
    <g data-geom="bar">
      {segments.sort(byDescendingHeight).map((segment) => (
        <ArchMark key={segment.key} segment={segment} size={size} isEmphasized />
      ))}
    </g>
  );
};

// Bars, polar: each slice is one closed outline in its colour with a hairline gap to its neighbour, and
// dark echoes radiating outward from its outer edge.

interface SliceArc {
  key: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  opacity: number;
}

const toSliceArc = (observation: Observation, key: string): SliceArc | null => {
  const { startAngle, endAngle } = getAngleExtent(observation);
  const { innerRadius, outerRadius } = getRadiusExtent(observation);
  if (startAngle === null || endAngle === null || innerRadius === null || outerRadius === null) return null;
  return {
    key,
    startAngle,
    endAngle,
    innerRadius: innerRadius * SLICE_RADIUS_SCALE,
    outerRadius: outerRadius * SLICE_RADIUS_SCALE,
    color: getColor(observation) ?? DARK,
    opacity: getAlpha(observation) ?? 1,
  };
};

// Centres the unit-space polar drawing on the panel and scales it to the inscribed circle.
const PolarStage = ({ size, children }: { size: PixelSize; children: ReactNode }): ReactNode => {
  const minSide = Math.min(size.width, size.height);
  return <g transform={`translate(${size.width / 2} ${size.height / 2}) scale(${minSide / 2})`}>{children}</g>;
};

const SliceShape = ({
  slice,
  unitsPerPx,
  isEmphasized = false,
}: {
  slice: SliceArc;
  unitsPerPx: number;
  isEmphasized?: boolean;
}): ReactNode => {
  const rimRadius = slice.outerRadius / unitsPerPx || 1;
  const gapAngle = unitsPerPx > 0 ? SLICE_GAP_PX / rimRadius : 0;
  const span = slice.endAngle - slice.startAngle;
  const inset = Math.min(gapAngle, Math.max(0, span - 0.001) / 2);
  const outline = buildPolarBarArcPath({
    startAngle: slice.startAngle + inset,
    endAngle: slice.endAngle - inset,
    innerRadius: slice.innerRadius,
    outerRadius: slice.outerRadius,
  });
  const echoStep = SLICE_ECHO_STEP_PX * unitsPerPx;
  const strokeWidth = isEmphasized ? HOVER_STROKE : ECHO_STROKE;

  return (
    <g opacity={slice.opacity}>
      {isEmphasized && <path d={outline ?? undefined} fill={slice.color} opacity={HOVER_FILL_OPACITY} stroke="none" />}
      {echoStep > 0 &&
        Array.from({ length: ECHOES }, (_, echo) => {
          const radius = slice.outerRadius + (echo + 1) * echoStep;
          if (radius >= 0.999) return null;
          const echoPath = buildPolarBarArcPath({
            startAngle: slice.startAngle + inset,
            endAngle: slice.endAngle - inset,
            innerRadius: radius - 0.0001,
            outerRadius: radius,
          });
          return (
            <path
              key={echo}
              d={echoPath ?? undefined}
              fill="none"
              stroke={DARK}
              strokeWidth={ECHO_STROKE}
              vectorEffect="non-scaling-stroke"
              opacity={(isEmphasized ? SLICE_ECHO_OPACITY * 1.6 : SLICE_ECHO_OPACITY) / (echo + 1)}
            />
          );
        })}
      <path
        d={outline ?? undefined}
        fill="none"
        stroke={slice.color}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </g>
  );
};

const Slices = ({ layer }: { layer: SceneLayerFor<'bar'> }): ReactNode => {
  const { ref, size } = usePanelSize();
  const minSide = Math.min(size.width, size.height);
  const unitsPerPx = minSide > 0 ? 2 / minSide : 0;

  const slices = useMemo<SliceArc[]>(() => {
    const generateKey = createStableKeyGenerator(layer.data, layer.mapping, layer.id);
    const result: SliceArc[] = [];
    for (const observation of layer.data) {
      const slice = toSliceArc(observation, generateKey(observation));
      if (slice) result.push(slice);
    }
    return result;
  }, [layer.data, layer.mapping, layer.id]);

  return (
    <g ref={ref} data-geom="bar">
      {size.width > 0 && (
        <PolarStage size={size}>
          {slices.map((slice) => (
            <SliceShape key={slice.key} slice={slice} unitsPerPx={unitsPerPx} />
          ))}
        </PolarStage>
      )}
    </g>
  );
};

const SliceHover = ({ observation, size }: { observation: Observation; size: PixelSize }): ReactNode => {
  const slice = toSliceArc(observation, 'hover');
  const minSide = Math.min(size.width, size.height);
  if (!slice || minSide <= 0) return null;
  return (
    <g data-geom="bar">
      <PolarStage size={size}>
        <SliceShape slice={slice} unitsPerPx={2 / minSide} isEmphasized />
      </PolarStage>
    </g>
  );
};

// Points, cartesian: targets.

interface TargetPoint {
  key: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
}

const toTargetPoint = (observation: Observation, key: string): TargetPoint | null => {
  const x = getX(observation);
  const y = getY(observation);
  if (x === null || y === null) return null;
  return {
    key,
    x: toViewBoxX(x),
    y: toViewBoxY(y),
    color: getColor(observation) ?? DARK,
    opacity: getAlpha(observation) ?? 1,
  };
};

const Points = ({ layer }: { layer: SceneLayer }): ReactNode => {
  const { ref, size } = usePanelSize();

  const points = useMemo<TargetPoint[]>(() => {
    const generateKey = createStableKeyGenerator(layer.data, layer.mapping, layer.id);
    const result: TargetPoint[] = [];
    for (const observation of layer.data) {
      const point = toTargetPoint(observation, generateKey(observation));
      if (point) result.push(point);
    }
    return result;
  }, [layer.data, layer.mapping, layer.id]);

  return (
    <g ref={ref} data-geom="point">
      {size.width > 0 &&
        points.map((point) => (
          <g key={point.key} opacity={point.opacity}>
            <Target cx={point.x * size.width} cy={point.y * size.height} color={point.color} />
          </g>
        ))}
    </g>
  );
};

// Faint targets marking where a hovered observation lands on another layer.
const CompanionTargets = ({ hits, size }: { hits: HoverHit[]; size: PixelSize }): ReactNode =>
  hits.map((hit, index) => {
    const point = toTargetPoint(hit.observation, `companion-${hit.layerId}-${index}`);
    if (!point) return null;
    return (
      <g key={point.key} opacity={COMPANION_OPACITY}>
        <Target cx={point.x * size.width} cy={point.y * size.height} color={point.color} />
      </g>
    );
  });

const PointHover = ({
  observation,
  companions,
  size,
}: {
  observation: Observation;
  companions: HoverHit[];
  size: PixelSize;
}): ReactNode => {
  const point = toTargetPoint(observation, 'hover');
  if (size.width <= 0) return null;
  return (
    <g data-geom="point">
      <CompanionTargets hits={companions} size={size} />
      {point && <Target cx={point.x * size.width} cy={point.y * size.height} color={point.color} isEmphasized />}
    </g>
  );
};

// Companion targets get no panelRect, so this measures the panel itself.
const CompanionLayer = ({ related }: { related: HoverHit[] }): ReactNode => {
  const { ref, size } = usePanelSize();
  return (
    <g ref={ref} data-geom="point">
      {size.width > 0 && <CompanionTargets hits={related} size={size} />}
    </g>
  );
};

// Lines, cartesian: three parallel strokes 5.5px apart, the observation on the centre one, and a target on
// the last point.

interface LinePoint {
  x: number;
  y: number;
}

interface LineTrace {
  key: string;
  points: LinePoint[];
  color: string;
  opacity: number;
}

const toLineTrace = (observations: Observation[], key: string): LineTrace | null => {
  const points: LinePoint[] = [];
  for (const observation of observations) {
    const x = getX(observation);
    const y = getY(observation);
    if (x === null || y === null) continue;
    points.push({ x: toViewBoxX(x), y: toViewBoxY(y) });
  }
  const first = observations[0];
  if (points.length < 2 || !first) return null;
  return {
    key,
    points,
    color: getColor(first) ?? DARK,
    opacity: getAlpha(first) ?? 1,
  };
};

// Offsets a polyline perpendicular to its local direction so the copies stay parallel.
const offsetPolyline = (points: LinePoint[], distance: number): LinePoint[] => {
  if (distance === 0) return points;
  const count = points.length;
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)] ?? point;
    const next = points[Math.min(count - 1, index + 1)] ?? point;
    const deltaX = next.x - previous.x;
    const deltaY = next.y - previous.y;
    const length = Math.hypot(deltaX, deltaY) || 1;
    return { x: point.x + (-deltaY / length) * distance, y: point.y + (deltaX / length) * distance };
  });
};

const LINE_OFFSETS = [-ECHO_STEP, 0, ECHO_STEP];

const LineEchoTrace = ({
  trace,
  size,
  isEmphasized = false,
}: {
  trace: LineTrace;
  size: PixelSize;
  isEmphasized?: boolean;
}): ReactNode => {
  const pixelPoints = trace.points.map((point) => ({ x: point.x * size.width, y: point.y * size.height }));
  const terminus = pixelPoints[pixelPoints.length - 1];
  const strokeWidth = isEmphasized ? HOVER_STROKE : ECHO_STROKE;

  return (
    <g opacity={trace.opacity}>
      {LINE_OFFSETS.map((offset) => (
        <polyline
          key={offset}
          points={offsetPolyline(pixelPoints, offset)
            .map((point) => `${point.x},${point.y}`)
            .join(' ')}
          fill="none"
          stroke={trace.color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {terminus && <Target cx={terminus.x} cy={terminus.y} color={trace.color} isEmphasized={isEmphasized} />}
    </g>
  );
};

const Lines = ({ layer }: { layer: SceneLayerFor<'line'> }): ReactNode => {
  const { ref, size } = usePanelSize();

  const traces = useMemo<LineTrace[]>(() => {
    const generateKey = createStableKeyGenerator(layer.data, layer.mapping, layer.id);
    const result: LineTrace[] = [];
    layer.data.groupBy(GROUP_VARIABLES.group).forEach((groupData) => {
      const observations = prepareLineObservations([...groupData], layer.params.missingValues);
      const first = observations[0];
      const trace = first && toLineTrace(observations, generateKey(first));
      if (trace) result.push(trace);
    });
    return result;
  }, [layer.data, layer.mapping, layer.id, layer.params.missingValues]);

  return (
    <g ref={ref} data-geom="line">
      {size.width > 0 && traces.map((trace) => <LineEchoTrace key={trace.key} trace={trace} size={size} />)}
    </g>
  );
};

const LineHover = ({
  layer,
  observation,
  companions,
  size,
}: {
  layer: SceneLayerFor<'line'>;
  observation: Observation;
  companions: HoverHit[];
  size: PixelSize;
}): ReactNode => {
  const primaryGroup = getGroup(observation);
  const groupObservations = useMemo(() => {
    const matching = layer.data.filter(GROUP_VARIABLES.group, 'eq', primaryGroup);
    return prepareLineObservations([...matching], layer.params.missingValues);
  }, [layer.data, layer.params.missingValues, primaryGroup]);

  const trace = toLineTrace(groupObservations, 'hover');
  if (size.width <= 0) return null;
  return (
    <g data-geom="line">
      <CompanionTargets hits={companions} size={size} />
      {trace && <LineEchoTrace trace={trace} size={size} isEmphasized />}
    </g>
  );
};

const ECHO_RIBBON_WIDTH = 2 * ECHO_STEP + ECHO_STROKE;
const TARGET_DISC_WIDTH = 2 * TARGET_CIRCLE_OUTER + ECHO_STROKE;

// What the editor outlines: one ribbon across the three echoes, and the disc of the target a line ends on.
const getLineEditOutlineShapes = (layer: SceneLayerFor<'line'>, size: PixelSize): EditOutlineShape[] => {
  const shapes: EditOutlineShape[] = [];
  const termini: XYPoint[] = [];

  layer.data.groupBy(GROUP_VARIABLES.group).forEach((groupData) => {
    const observations = prepareLineObservations([...groupData], layer.params.missingValues);
    const points = observations.flatMap((observation) => {
      const x = getX(observation);
      const y = getY(observation);
      return x === null || y === null ? [] : [{ x: toViewBoxX(x) * size.width, y: toViewBoxY(y) * size.height }];
    });
    const [first] = observations;
    const terminus = points[points.length - 1];
    if (first === undefined || terminus === undefined) return;

    if (points.length === 1) {
      shapes.push({ kind: 'dots', centers: [terminus], size: ECHO_RIBBON_WIDTH });
      return;
    }

    const pathData = points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join('');
    shapes.push({ kind: 'stroke', key: String(getGroup(first)), pathData, width: ECHO_RIBBON_WIDTH });
    termini.push(terminus);
  });

  if (termini.length > 0) shapes.push({ kind: 'dots', centers: termini, size: TARGET_DISC_WIDTH });
  return shapes;
};

// Registrations: each replaces the paint half of a built-in geom for one coordinate system and keeps the
// compile half. The base layer dims itself on hover; the hovered geom is redrawn bold.

const rectSize = (panelRect: { width: number; height: number }): PixelSize => ({
  width: panelRect.width,
  height: panelRect.height,
});

export const mexicoBar = defineGeomRenderer('bar', {
  coord: 'cartesian',
  guideMode: 'band',
  swatchShape: 'square',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <ArchBars layer={layer} coordSystem={coordSystem} />;
  },
  renderHover: ({ coordSystem, primary, group, panelRect }) => {
    if (coordSystem.type !== 'cartesian') return null;
    // group carries the other stacked segments of the hovered column, so the whole column lifts together.
    return (
      <ArchHover
        observations={[primary.observation, ...group.map((hit) => hit.observation)]}
        mainAxis={coordSystem.mainAxis}
        size={rectSize(panelRect)}
      />
    );
  },
  renderHoverCompanions: () => null,
});

export const mexicoSlice = defineGeomRenderer('bar', {
  coord: 'polar',
  guideMode: 'band',
  swatchShape: 'slice',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'polar') return null;
    return <Slices layer={layer as SceneLayerFor<'bar'>} />;
  },
  renderHover: ({ coordSystem, primary, panelRect }) => {
    if (coordSystem.type !== 'polar') return null;
    return <SliceHover observation={primary.observation} size={rectSize(panelRect)} />;
  },
  renderHoverCompanions: () => null,
});

export const mexicoPoint = defineGeomRenderer('point', {
  coord: 'cartesian',
  swatchShape: 'circle',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <Points layer={layer} />;
  },
  renderHover: ({ primary, group, related, panelRect }) => (
    <PointHover observation={primary.observation} companions={[...group, ...related]} size={rectSize(panelRect)} />
  ),
  renderHoverCompanions: ({ related }) => <CompanionLayer related={related} />,
});

export const mexicoLine = defineGeomRenderer('line', {
  coord: 'cartesian',
  swatchShape: 'line',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <Lines layer={layer as SceneLayerFor<'line'>} />;
  },
  renderHover: ({ layer, coordSystem, primary, group, related, panelRect }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return (
      <LineHover
        layer={layer as SceneLayerFor<'line'>}
        observation={primary.observation}
        companions={[...group, ...related]}
        size={rectSize(panelRect)}
      />
    );
  },
  renderHoverCompanions: ({ related }) => <CompanionLayer related={related} />,
  getEditOutlineShapes: ({ layer, coordSystem, panelRect }) =>
    coordSystem.type === 'cartesian' ? getLineEditOutlineShapes(layer as SceneLayerFor<'line'>, rectSize(panelRect)) : [],
});

export const mexicoPlugins = [mexicoBar, mexicoSlice, mexicoPoint, mexicoLine] as const;
```

## Notes

- `defineGeomRenderer('bar', ...)` by name keeps the built-in compile half (scales, stacking, layout) and swaps only the paint. Later entries in the plugin array win for the same geom and coord.
- The arch and echo geometry is in pixels, so the renderers measure the panel svg instead of drawing in the [0,1] unit space. Hover renderers get `panelRect` and skip the measurement.
- `getEditOutlineShapes` tells the editor what to outline for a line: one ribbon across the three strokes and a disc at the end target.
- Several helpers come from `@graphysdk/viz-engine` rather than `@graphysdk/react`: `buildPolarBarArcPath`, `createStableKeyGenerator`, `getStackRole`, `prepareLineObservations`, and the `CartesianCoordSystem`, `MainAxis`, `SceneLayerFor`, `StackRole`, `XYPoint` types.
