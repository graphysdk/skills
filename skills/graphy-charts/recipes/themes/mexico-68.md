# Mexico 68

**Tier: config + theme tokens + render-only geom paint plugins.** This is the plugin-tier exemplar: the spec and theme are ordinary, and every geom's paint is replaced via `defineGeomRenderer` render-only overrides passed as `plugins` to `GraphProvider`.

Op-art style after the Mexico 68 Olympic identity: a hot magenta lead with orange, purple, cyan, and green radiating behind it, Righteous uppercase headlines over Rubik engine text, and no gridlines — the vibration needs quiet ground. The whole grammar is the echo: every mark is drawn as concentric outlines with no solid core. Bars radiate as arches, lines as parallel echoes with a ringed-target terminus, points as ringed targets, and polar slices as single outlines with ink echoes fanning outward.

The overrides replace only the paint half of each built-in geom for one coordinate system; compile, scales, layout, legends, tooltips, and hover hit-testing are all reused unchanged. The `plugins` array is frozen at mount — remount `GraphProvider` with a React `key` to change it.

## Module: `mexico68.theme.ts` (constants + theme overrides)

```ts
import type { FontTokenOverride, ThemeOverrides } from '@graphysdk/react-renderer';

export const MEXICO_FONT_FAMILY = {
  headings: "'Righteous', 'Rubik', sans-serif",
  body: "'Rubik', 'Helvetica Neue', Arial, sans-serif",
} as const;

// The Mexico 68 op-art palette: a hot magenta lead with orange, purple, cyan, and
// green running behind it. Ink is the one near-black, reserved for baselines and
// the values printed above each arch.
export const MEXICO_COLORS = {
  page: '#F4F1EA', // gallery white behind the charts
  card: '#FFFFFF', // chart background
  ink: '#1A1A1A', // baselines, printed values, echo halos
  pink: '#EC008C', // the lead — Actual, North, Product A
  orange: '#F7931E', // the "next colour" — Forecast, South
  purple: '#662D91', // East
  cyan: '#27AAE1', // West
  green: '#39B54A', // Central
  axisGrey: '#9A968C', // the quiet ground the vibration needs
} as const;

// Emphasis order: magenta leads, the rest radiate behind it.
export const MEXICO_PALETTE = [
  MEXICO_COLORS.pink,
  MEXICO_COLORS.orange,
  MEXICO_COLORS.purple,
  MEXICO_COLORS.cyan,
  MEXICO_COLORS.green,
] as const;

// Engine text is Rubik 500 12px; the printed value above each arch sits a touch
// heavier and larger — the one number you read off the vibration.
const engineFont: FontTokenOverride = {
  family: MEXICO_FONT_FAMILY.body,
  size: { value: 12, unit: 'px' },
  lineHeight: 1.4,
  weight: 500,
};

const valueFont: FontTokenOverride = {
  family: MEXICO_FONT_FAMILY.body,
  size: { value: 13, unit: 'px' },
  lineHeight: 1.2,
  weight: 600,
};

export const theme: ThemeOverrides = {
  textPrimary: MEXICO_COLORS.ink,
  textSecondary: MEXICO_COLORS.axisGrey,
  gridLineColor: 'transparent', // the vibration needs quiet ground — no gridlines
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: MEXICO_COLORS.ink,
  dataLabelTextColor: MEXICO_COLORS.ink, // values printed above each arch, in ink
  fontFamilyDefault: MEXICO_FONT_FAMILY.body,
  fontFamilyHeading: MEXICO_FONT_FAMILY.headings,
  fontTickLabel: engineFont,
  fontAxisLabel: engineFont,
  fontLegendLabel: engineFont,
  fontDataLabel: valueFont,
  fontPieLabel: `500 11px/1.4 ${MEXICO_FONT_FAMILY.body}`,
};
```

`fontTickLabel`, `fontAxisLabel`, `fontLegendLabel`, and `fontDataLabel` are measured font tokens (structured `FontTokenOverride` objects); `fontPieLabel` is a plain CSS font shorthand string.

## Shared config builder and title helper

```ts
import { config } from '@graphysdk/viz-engine';
import type { RichTextContent } from '@graphysdk/viz-engine';

const BAR_BAND_FRACTION = 0.5; // room for the arch to radiate inside its band
const LINE_WIDTH = 2;

// Shared frame: white ground, no grid, a single 2px ink baseline the arches rest on.
// The y axis stays visible in the quiet grey; it is zero-based everywhere.
const createMexicoConfig = (options: { legendPosition?: 'none' | 'top' | 'bottom' } = {}) =>
  config({
    legend: { position: options.legendPosition ?? 'none' },
    appearance: { background: { type: 'solid', color: MEXICO_COLORS.card } },
    layout: {
      padding: 32,
      gaps: { header: options.legendPosition === 'top' ? 24 : 40 },
    },
    panel: {
      border: {
        top: { isVisible: false },
        bottom: { isVisible: true, lineStyle: 'solid', lineWidth: 2, color: MEXICO_COLORS.ink },
        left: { isVisible: false },
        right: { isVisible: false },
      },
    },
    axes: {
      x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
      y: { position: 'left', grid: { isVisible: false } },
    },
  });

// Polar charts carry no cartesian baseline or y axis — the ring is its own ground.
const mexicoPolarConfig = config({
  panel: { border: { bottom: { isVisible: false } } },
  axes: { y: { isVisible: false } },
});

// Headline: Righteous, uppercase, key phrase in the lead magenta.
export const createMexicoTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: segments.map(({ text, color }) => ({
        type: 'text',
        text: text.toUpperCase(),
        marks: [
          {
            type: 'textStyle',
            attrs: { color: color ?? MEXICO_COLORS.ink, fontFamily: MEXICO_FONT_FAMILY.headings, fontSize: '22px' },
          },
        ],
      })),
    },
  ],
});
```

## Module: `mexico68.plugins.tsx` (render-only geom paint overrides)

Four overrides, one per `(geom, coord)` pair the style repaints: `mexicoBar` (bar, cartesian) draws radiating arches, `mexicoSlice` (bar, polar) draws outlined arcs with outward ink echoes, `mexicoPoint` (point, cartesian) draws ringed targets, and `mexicoLine` (line, cartesian) draws parallel echoes with a ringed-target terminus. Each also supplies `renderHover` (redraw the hovered mark bolder, with a faint solid core — the one place the "no solid core" rule relaxes) and `renderHoverCompanions` (faint targets marking where a hovered reading lands on the other layers of a combo).

```tsx
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { defineGeomRenderer } from '@graphysdk/react-renderer';
import type {
  CartesianCoordSystem,
  CompiledLayer,
  CompiledLayerFor,
  HoverHit,
  MainAxis,
  Observation,
  StackRole,
} from '@graphysdk/viz-engine';
import {
  buildPolarBarArcPath,
  createStableKeyGenerator,
  getAlpha,
  getAngleExtent,
  getBarRectBounds,
  getColor,
  getGroup,
  getRadiusExtent,
  getStackRole,
  getX,
  getY,
  GROUP_VARIABLES,
  prepareLineObservations,
  toViewBoxX,
  toViewBoxY,
} from '@graphysdk/viz-engine';

import { MEXICO_COLORS } from './mexico68.theme';

// ─── The echo (the whole grammar) ────────────────────────────────────────────
// Every mark is drawn as concentric outlines with no solid core: three echoes,
// 5.5px apart, each a 2px stroke. Thin marks degrade to fewer echoes.
const ECHOES = 3;
const ECHO_STEP = 5.5;
const ECHO_STROKE = 2;

// Ringed target: a small dot inside two rings, the outer one faded — the scatter
// point, the line terminus, and the legend key all share it.
const TARGET_DOT = 3;
const TARGET_RING_MID = 7.5;
const TARGET_RING_OUTER = 12;
const TARGET_OUTER_OPACITY = 0.55;

// Slices sit at 90% radius so the ink echoes have room to radiate outward without
// clipping against the panel edge.
const SLICE_RADIUS_SCALE = 0.9;
const SLICE_GAP_PX = 1.5;
const SLICE_ECHO_STEP_PX = 4;
const SLICE_ECHO_OPACITY = 0.5;

// ─── Hover emphasis ──────────────────────────────────────────────────────────
// Focus does not change the grammar, it turns the vibration up: the hovered mark
// keeps its echoes but gains a bolder stroke and, where it has a body, a faint
// solid core — the one place the "no solid core" rule relaxes, so a reading pops.
// Everything else dims via the renderer's own hover-dim on the base layer.
const HOVER_STROKE = ECHO_STROKE + 1.5;
const HOVER_FILL_OPACITY = 0.18;
// Companion targets mark where the hovered reading lands on the OTHER layers of a
// combo — present but quiet, so the primary stays the loudest thing on the panel.
const COMPANION_OPACITY = 0.5;

interface PixelSize {
  width: number;
  height: number;
}

/**
 * Measures the panel in pixels. The arch caps, the parallel line echoes, and the target
 * rings all need true pixel geometry (a semicircle must stay circular, an offset must be a
 * fixed 5.5px), which the normalized `[0,1]` position space can't give directly.
 *
 * The engine mounts each geom into a panel-sized `<svg>` (its `ownerSVGElement`) whose user
 * units are already pixels, so the marks paint straight into a `<g>` at pixel coordinates —
 * no nested `<svg>`, which never establishes its own size from a `<g>` parent. That owner svg
 * carries the panel dimensions on its `width`/`height` attributes; an inner `<svg>` reports a
 * zero `getBoundingClientRect`, so the size is read off `baseVal` instead. Marks stay hidden
 * until the panel reports a size.
 *
 * Hover renderers receive `panelRect` directly and skip this — only the base paint and the
 * cross-layer companions, which are handed no rect, measure through here.
 */
const usePanelSize = (): { ref: RefObject<SVGGElement | null>; size: PixelSize } => {
  const ref = useRef<SVGGElement | null>(null);
  const [size, setSize] = useState<PixelSize>({ width: 0, height: 0 });

  useEffect(() => {
    const panelSvg = ref.current?.ownerSVGElement;
    if (!panelSvg) return;
    // Observe the outermost plot svg: it has a real layout box that fires the observer on
    // resize, where the nested panel svg's content box stays zero and never would. The panel
    // dimensions are then re-read off `baseVal`, which the layout keeps in sync.
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

/** A ringed target — dot inside two rings, outer ring faded — at a pixel centre. */
const RingedTarget = ({
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
          r={TARGET_RING_OUTER + ECHO_STEP}
          fill="none"
          stroke={color}
          strokeWidth={ECHO_STROKE}
          opacity={TARGET_OUTER_OPACITY / 2}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={TARGET_RING_OUTER}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={TARGET_OUTER_OPACITY}
      />
      <circle cx={cx} cy={cy} r={TARGET_RING_MID} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={isEmphasized ? TARGET_DOT + 1.5 : TARGET_DOT} fill={color} />
    </>
  );
};

// ─── mexicoBar — the radiating arch (bar, cartesian) ─────────────────────────
// Each bar unrolls into concentric arches sharing one centre: two vertical legs to
// the baseline and a semicircle cap whose radius is half the bar's width. Inner
// echoes step in by 5.5px; the count degrades when the bar is too thin to hold three.
//
// A stacked column paints as one arch PER SEGMENT, each keeping its own dome. Every
// segment is self-describing via its `StackCap`: a `floor` or `solo` owns the axis and
// runs its legs to the baseline; a `ceiling` or `middle` sits on the segment below, and
// each of its echoes ends where its legs meet that segment's outer dome — a bottom clip
// in the shape of the arch beneath, so no leg ever crosses the arc below it.

interface ArchSegment {
  key: string;
  x: number; // normalized [0,1] left edge
  y: number; // normalized [0,1] top edge of THIS segment — this arch's cap
  width: number;
  height: number; // normalized height of THIS segment
  color: string;
  opacity: number;
  cap: StackRole;
}

/** One arch outline: legs from a baseline up to the cap, then a semicircle over the top. */
const buildArchPath = (centerX: number, baselineY: number, capCenterY: number, radius: number): string => {
  const left = centerX - radius;
  const right = centerX + radius;
  return `M ${left} ${baselineY} L ${left} ${capCenterY} A ${radius} ${radius} 0 0 1 ${right} ${capCenterY} L ${right} ${baselineY}`;
};

/** An arch's geometry, colour, and stack role from its normalized bar rect. */
const toArchSegment = (observation: Observation, mainAxis: MainAxis, key: string): ArchSegment | null => {
  const bounds = getBarRectBounds(mainAxis, observation);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
  return {
    key,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    color: getColor(observation) ?? MEXICO_COLORS.ink,
    opacity: getAlpha(observation) ?? 1,
    cap: getStackRole(observation),
  };
};

/** One segment's arch: dome at its own top, legs resting on the axis or on the dome below it. */
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

  // Radius rounds fully to half the width, but never so far the cap drops below the segment on a
  // short one. Cap centre is fixed off the outer radius, so inner echoes peak progressively lower.
  const outerRadius = Math.min(barWidth / 2, segHeight);
  const capCenterY = capTopY + outerRadius;
  const echoCount = Math.max(1, Math.min(ECHOES, Math.floor(outerRadius / ECHO_STEP)));
  const strokeWidth = isEmphasized ? HOVER_STROKE : ECHO_STROKE;

  // A floor/solo owns the axis, so its legs run straight down to the baseline. A stacked segment
  // rests on the outer dome of the segment below (same width → radius barWidth/2, centred one radius
  // past their shared boundary); an echo's legs end where they meet that dome, tracing its curve.
  const ownsBaseline = segment.cap === 'solo' || segment.cap === 'floor';
  const belowRadius = barWidth / 2;
  const belowCapCenterY = segBottomY + belowRadius;
  const computeLegBaseY = (radius: number): number =>
    ownsBaseline ? segBottomY : belowCapCenterY - Math.sqrt(Math.max(0, belowRadius * belowRadius - radius * radius));

  return (
    <g opacity={segment.opacity}>
      {isEmphasized && (
        // The focus core: the outer arch filled faintly, breaking the "no solid core" rule just for
        // the hovered column. An open path fills as if closed along the legs' base.
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

/** Taller arches first, so a shorter segment stacked in front tucks over their touching legs. */
const byDescendingHeight = (first: ArchSegment, second: ArchSegment): number => first.y - second.y;

const MexicoArchBars = ({
  layer,
  coordSystem,
}: {
  layer: CompiledLayer;
  coordSystem: CartesianCoordSystem;
}): ReactNode => {
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

/** The hovered column redrawn bold with a faint core, from its whole stack of segments. */
const MexicoArchHover = ({
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

// ─── mexicoSlice — outlined arcs with outward echoes (bar, polar) ─────────────
// Donut, rose, and racetrack all arrive here. Each slice is one closed outline in
// its own colour with a hairline gap to its neighbour; ink echoes then radiate
// outward from the slice's rim, fading as they go.

interface SliceArc {
  key: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  opacity: number;
}

/** A slice's angle/radius extents from its observation, scaled into the echo-safe radius band. */
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
    color: getColor(observation) ?? MEXICO_COLORS.ink,
    opacity: getAlpha(observation) ?? 1,
  };
};

/** Centres the unit-space polar drawing on the panel and scales it to the inscribed circle. */
const PolarStage = ({ size, children }: { size: PixelSize; children: ReactNode }): ReactNode => {
  const minSide = Math.min(size.width, size.height);
  return <g transform={`translate(${size.width / 2} ${size.height / 2}) scale(${minSide / 2})`}>{children}</g>;
};

/** One slice: its coloured outline with a hairline gap, plus ink echoes radiating outward. */
const SliceShape = ({
  slice,
  unitsPerPx,
  isEmphasized = false,
}: {
  slice: SliceArc;
  unitsPerPx: number;
  isEmphasized?: boolean;
}): ReactNode => {
  // A hairline gap: trim the arc by the angle that spans SLICE_GAP_PX at its rim.
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
      {isEmphasized && (
        // The focus core: the wedge filled faintly, the one slice that gains a body.
        <path d={outline ?? undefined} fill={slice.color} opacity={HOVER_FILL_OPACITY} stroke="none" />
      )}
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
              stroke={MEXICO_COLORS.ink}
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

const MexicoSlices = ({ layer }: { layer: CompiledLayerFor<'bar'> }): ReactNode => {
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

/** The hovered slice redrawn bold with a faint body, from `primary.observation` and the panel rect. */
const MexicoSliceHover = ({ observation, size }: { observation: Observation; size: PixelSize }): ReactNode => {
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

// ─── mexicoPoint — ringed targets (point, cartesian) ─────────────────────────

interface TargetPoint {
  key: string;
  x: number; // normalized [0,1]
  y: number;
  color: string;
  opacity: number;
}

/** A ringed target's position/colour from its observation, in normalized [0,1] panel space. */
const toTargetPoint = (observation: Observation, key: string): TargetPoint | null => {
  const x = getX(observation);
  const y = getY(observation);
  if (x === null || y === null) return null;
  return {
    key,
    x: toViewBoxX(x),
    y: toViewBoxY(y),
    color: getColor(observation) ?? MEXICO_COLORS.ink,
    opacity: getAlpha(observation) ?? 1,
  };
};

const MexicoPoints = ({ layer }: { layer: CompiledLayer }): ReactNode => {
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
            <RingedTarget cx={point.x * size.width} cy={point.y * size.height} color={point.color} />
          </g>
        ))}
    </g>
  );
};

/** Faint ringed targets marking where a hovered reading lands on this (non-focal) layer. */
const CompanionTargets = ({ hits, size }: { hits: HoverHit[]; size: PixelSize }): ReactNode =>
  hits.map((hit, index) => {
    const point = toTargetPoint(hit.observation, `companion-${hit.layerId}-${index}`);
    if (!point) return null;
    return (
      <g key={point.key} opacity={COMPANION_OPACITY}>
        <RingedTarget cx={point.x * size.width} cy={point.y * size.height} color={point.color} />
      </g>
    );
  });

/** The hovered target redrawn bold, with faint companions for readings that share its position. */
const MexicoPointHover = ({
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
      {point && <RingedTarget cx={point.x * size.width} cy={point.y * size.height} color={point.color} isEmphasized />}
    </g>
  );
};

/** Cross-layer companion targets — the path with no `panelRect`, so it measures the panel itself. */
const MexicoCompanionLayer = ({ related }: { related: HoverHit[] }): ReactNode => {
  const { ref, size } = usePanelSize();
  return (
    <g ref={ref} data-geom="point">
      {size.width > 0 && <CompanionTargets hits={related} size={size} />}
    </g>
  );
};

// ─── mexicoLine — parallel echoes + terminus (line, cartesian) ────────────────
// The bar grammar unrolled onto a trace: every line is three parallels 5.5px apart,
// the reading living on the centre one. Only the endpoint radiates, as a ringed
// target — the "echoes + terminus" reading of the line chart.

interface LinePoint {
  x: number; // normalized [0,1]
  y: number;
}

interface LineTrace {
  key: string;
  points: LinePoint[];
  color: string;
  opacity: number;
}

/** A trace's points/colour from an ordered run of observations, in normalized [0,1] space. */
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
    color: getColor(first) ?? MEXICO_COLORS.ink,
    opacity: getAlpha(first) ?? 1,
  };
};

/** Offset a polyline perpendicular to its local direction, so the copies stay parallel. */
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
      {terminus && <RingedTarget cx={terminus.x} cy={terminus.y} color={trace.color} isEmphasized={isEmphasized} />}
    </g>
  );
};

const MexicoLines = ({ layer }: { layer: CompiledLayerFor<'line'> }): ReactNode => {
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

/** The hovered series redrawn bold, with faint companions for readings that share its x. */
const MexicoLineHover = ({
  layer,
  observation,
  companions,
  size,
}: {
  layer: CompiledLayerFor<'line'>;
  observation: Observation;
  companions: HoverHit[];
  size: PixelSize;
}): ReactNode => {
  const primaryGroup = getGroup(observation);
  const seriesObservations = useMemo(() => {
    const matching = layer.data.filter(GROUP_VARIABLES.group, 'eq', primaryGroup);
    return prepareLineObservations([...matching], layer.params.missingValues);
  }, [layer.data, layer.params.missingValues, primaryGroup]);

  const trace = toLineTrace(seriesObservations, 'hover');
  if (size.width <= 0) return null;
  return (
    <g data-geom="line">
      <CompanionTargets hits={companions} size={size} />
      {trace && <LineEchoTrace trace={trace} size={size} isEmphasized />}
    </g>
  );
};

// ─── Plugin registrations ─────────────────────────────────────────────────────
// Render-only overrides by name: each replaces the paint half of a built-in geom
// for one coordinate system, reusing the unchanged compile/scale/layout half.
// Hover keeps the same grammar and turns the vibration up on the hovered mark,
// while the base layer dims itself; companions mark where the reading lands on the
// other layers of a combo.

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
    return <MexicoArchBars layer={layer} coordSystem={coordSystem} />;
  },
  renderHover: ({ coordSystem, primary, group, panelRect }) => {
    if (coordSystem.type !== 'cartesian') return null;
    // `group` carries the hovered column's other stacked segments, so the whole two-tone arch
    // lifts together rather than a single segment floating out of its column.
    return (
      <MexicoArchHover
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
    return <MexicoSlices layer={layer as CompiledLayerFor<'bar'>} />;
  },
  renderHover: ({ coordSystem, primary, panelRect }) => {
    if (coordSystem.type !== 'polar') return null;
    return <MexicoSliceHover observation={primary.observation} size={rectSize(panelRect)} />;
  },
  renderHoverCompanions: () => null,
});

export const mexicoPoint = defineGeomRenderer('point', {
  coord: 'cartesian',
  swatchShape: 'circle',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <MexicoPoints layer={layer} />;
  },
  renderHover: ({ primary, group, related, panelRect }) => (
    <MexicoPointHover
      observation={primary.observation}
      companions={[...group, ...related]}
      size={rectSize(panelRect)}
    />
  ),
  renderHoverCompanions: ({ related }) => <MexicoCompanionLayer related={related} />,
});

export const mexicoLine = defineGeomRenderer('line', {
  coord: 'cartesian',
  swatchShape: 'line',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <MexicoLines layer={layer as CompiledLayerFor<'line'>} />;
  },
  renderHover: ({ layer, coordSystem, primary, group, related, panelRect }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return (
      <MexicoLineHover
        layer={layer as CompiledLayerFor<'line'>}
        observation={primary.observation}
        companions={[...group, ...related]}
        size={rectSize(panelRect)}
      />
    );
  },
  renderHoverCompanions: ({ related }) => <MexicoCompanionLayer related={related} />,
});

export const mexicoPlugins = [mexicoBar, mexicoSlice, mexicoPoint, mexicoLine] as const;
```

## Example: arch bars, actual vs forecast

The spec is a plain bar spec — the arches come entirely from `mexicoBar` in the `plugins` array. One arch per quarter with its value printed above; the actual quarters take the magenta, the forecast the next palette colour.

```tsx
import { config, createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

import { mexicoPlugins } from './mexico68.plugins';
import { MEXICO_COLORS, theme } from './mexico68.theme';

const cpmData = {
  columns: [{ key: 'quarter' }, { key: 'cpm' }, { key: 'type' }],
  rows: [
    { quarter: 'Q1', cpm: 4.2, type: 'actual' },
    { quarter: 'Q2', cpm: 4.8, type: 'actual' },
    { quarter: 'Q3', cpm: 5.1, type: 'actual' },
    { quarter: 'Q4', cpm: 5.6, type: 'actual' },
    { quarter: 'Q1 next', cpm: 6.3, type: 'forecast' },
  ],
};

const cpmSpec = pipe(
  createSpec(),
  mapping({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({
    position: 'identity',
    params: { width: BAR_BAND_FRACTION, borderRadius: 0 },
    dataLabels: { showDataLabels: true, position: 'outside', justify: 'end', align: 'center' },
  }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [MEXICO_COLORS.pink, MEXICO_COLORS.orange] }),
  createMexicoConfig({ legendPosition: 'top' }),
  config({
    content: {
      title: createMexicoTitle([
        { text: 'CPM, € — actual vs ' },
        { text: 'forecast', color: MEXICO_COLORS.orange },
        { text: '.' },
      ]),
      isTitleVisible: true,
      subtitle: 'Cost per mille by quarter, €. The orange arch is the forecast.',
      isSubtitleVisible: true,
    },
  })
);

export function CpmChart() {
  return (
    <GraphProvider
      data={cpmData}
      input={cpmSpec}
      theme="light"
      themeOverrides={theme}
      plugins={[...mexicoPlugins]}
    >
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Example: donut with outward ink echoes

Same spec you would write without plugins; `mexicoSlice` repaints each region as one closed outline with ink echoes fanning outward from the ring.

```tsx
import { config, coord, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

import { mexicoPlugins } from './mexico68.plugins';
import { MEXICO_COLORS, MEXICO_PALETTE, theme } from './mexico68.theme';

const revenueData = {
  columns: [{ key: 'region' }, { key: 'revenue' }],
  rows: [
    { region: 'North', revenue: 26 },
    { region: 'East', revenue: 22 },
    { region: 'Central', revenue: 20 },
    { region: 'South', revenue: 17 },
    { region: 'West', revenue: 15 },
  ],
};

const revenueDonutSpec = pipe(
  createSpec({ x: '', y: 'revenue', color: 'region' }),
  geom.bar({
    position: 'fill',
    params: { borderRadius: 0 },
    dataLabels: {
      showDataLabels: true,
      format: 'percentage',
      showCategoryLabels: true,
      position: 'outside',
      justify: 'end',
      align: 'center',
    },
  }),
  coord.polar({ theta: 'y', innerRadius: 0.55 }),
  scale.x(),
  scale.y(),
  scale.color.discrete({ domain: ['North', 'East', 'Central', 'South', 'West'], range: [...MEXICO_PALETTE] }),
  createMexicoConfig(),
  mexicoPolarConfig,
  config({
    content: {
      title: createMexicoTitle([
        { text: 'North', color: MEXICO_COLORS.pink },
        { text: ' takes a quarter of revenue.' },
      ]),
      isTitleVisible: true,
      subtitle: 'Share of revenue by region, %.',
      isSubtitleVisible: true,
    },
  })
);

export function RevenueDonut() {
  return (
    <GraphProvider
      data={revenueData}
      input={revenueDonutSpec}
      theme="light"
      themeOverrides={theme}
      plugins={[...mexicoPlugins]}
    >
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Fonts

Theme tokens set font families but do not load the fonts — the page must load them. Righteous carries the headlines, Rubik the engine text:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Righteous&family=Rubik:wght@400;500;600;700&display=swap" />
```
