# Slots

Replace how one region of the graph paints while the engine keeps deciding what it shows.

Contents

- What a slot is
- Bare slots
- Tooltip slot
- Header slot
- Footer slot
- Swatch slot
- Grid slot
- Measured slots
- Legend slot
- AxisTicks and AxisLabel slots
- Headline slot
- Wrapping a default
- Pitfalls

Exact props: types.md § Slots.

## What a slot is

`GraphRenderer` paints each region with a default component. The `slots` prop swaps one or more of them. A slot receives the same render-ready props as the default. The spec still decides whether the region exists and what data it carries. A slot only paints.

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { TooltipSlotProps } from '@graphysdk/react';

const PlainTooltip = ({ content }: TooltipSlotProps) => <div>{content.heading}</div>;

export const Renderer = () => <GraphRenderer slots={{ Tooltip: PlainTooltip }} />;
```

There are two kinds:

- Bare slots take a component: `Header`, `Footer`, `Tooltip`, `Grid`, `Swatch`, `EditorSurface`. The layout measures their DOM or hands them a box it already sized.
- Measured slots take `{ render, measure }`: `Legend`, `Headline`, `AxisTicks`, `AxisLabel`. They sit on an edge and the layout must reserve space for them before painting, so they also say how much.

Give `slots` a stable object. Define it at module scope or in `useMemo`.

Exported types: `GraphSlots` for the prop, one `...SlotProps` type per slot (`HeaderSlotProps`, `FooterSlotProps`, `TooltipSlotProps`, `GridSlotProps`, `SwatchSlotProps`, `EditorSurfaceSlotProps`, `LegendSlotProps`, `HeadlineSlotProps`, `AxisTicksSlotProps`, `AxisLabelSlotProps`), `SlotOverride<Props, Measure>` for a measured pair and `SlotMeasureContext` for what `measure` receives.

## Bare slots

| Slot | Receives | Default export |
| --- | --- | --- |
| `Tooltip` | `content` | `DefaultTooltip` |
| `Header` | `title`, `subtitle`, styles, `brandMark`, `headerRect`, `mode`, `ref` | `DefaultHeader` |
| `Footer` | `caption`, `source`, styles, `brandMark`, `footerRect`, `mode`, `ref` | `DefaultFooter` |
| `Swatch` | `shape`, `color`, `paint`, `surface`, `label`, `lineType`, `width`, `height`, `strokeWidth`, `alpha`, `cornerRadius`, `symbol` | `DefaultSwatch` |
| `Grid` | `axes`, `panelBorderSizes`, `panelFrameRect`, `panelRect` | `DefaultGrid` |
| `EditorSurface` | `frameElement`, `panelRect`, `formattedAxes`, `shouldAnimateTransitions` | none |

`EditorSurface` is filled by `EditableGraphRenderer` from `@graphysdk/react/editable`. A read-only graph never sets it.

## Tooltip slot

The engine builds the tooltip text and the renderer positions the popover. The slot paints the body only.

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { TooltipSlotProps } from '@graphysdk/react';

const DarkTooltip = ({ content }: TooltipSlotProps) => (
  <div style={{ background: '#0f172a', color: '#f8fafc', padding: '10px 12px', borderRadius: 10, fontSize: 12 }}>
    {content.heading !== null && <div style={{ fontWeight: 700, marginBottom: 6 }}>{content.heading}</div>}
    {content.rows.map((row) => (
      <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: row.swatchColor ?? 'inherit' }}>{row.label}</span>
        <span style={{ fontWeight: row.isPrimary ? 700 : 400 }}>{row.value}</span>
      </div>
    ))}
  </div>
);

export const Renderer = () => <GraphRenderer slots={{ Tooltip: DarkTooltip }} />;
```

`content.heading` is the formatted x value. It is `null` on polar graphs and whenever `content.comment` is set, since the two share one slot. `content.rows` lists one row per group in legend order. Each row has `label`, `value` (already formatted), `swatchColor` (`null` when the graph has no colour scale), `geom`, `isPrimary` (the hovered row) and a stable `key`, plus the swatch details `swatchLineType`, `swatchFill`, `swatchAlpha`, `swatchCornerRadius` and `swatchSymbol`. `content.comment` is rich text when the pointer is over a comment bubble.

## Header slot

The header holds the title and subtitle. The layout measures the rendered element to reserve its height, so forward `ref` to the outer element and place it at `headerRect`.

```tsx
import { BrandMark, GraphRenderer } from '@graphysdk/react';
import type { HeaderSlotProps } from '@graphysdk/react';

const toPlainText = (content: HeaderSlotProps['title']): string => {
  if (content === null) return '';
  if (typeof content === 'string') return content;
  return [content.text ?? '', ...(content.content ?? []).map(toPlainText)].join('');
};

const BannerHeader = ({
  ref,
  headerRect,
  title,
  isTitleVisible,
  subtitle,
  isSubtitleVisible,
  headingStyle,
  brandMark,
}: HeaderSlotProps) => {
  if (!isTitleVisible && !isSubtitleVisible && brandMark === 'hidden') return null;
  return (
    <div
      ref={ref}
      style={{ position: 'absolute', left: headerRect.x, top: headerRect.y, width: headerRect.width, padding: '8px 0' }}
    >
      {isTitleVisible && (
        <h2 style={{ margin: 0, fontSize: headingStyle.fontSize, color: headingStyle.textColor }}>{toPlainText(title)}</h2>
      )}
      {isSubtitleVisible && <p style={{ margin: 0, opacity: 0.7 }}>{toPlainText(subtitle)}</p>}
      {brandMark !== 'hidden' && <BrandMark visual={brandMark} placement="header" />}
    </div>
  );
};

export const Renderer = () => <GraphRenderer slots={{ Header: BannerHeader }} />;
```

`title` and `subtitle` are a string, rich text, or `null`. Rich text is a tree of nodes with `type`, `text`, `content` and `marks`. `headingStyle` and `subtitleStyle` are resolved text styles with `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` and `textColor`, plus optional `fontStyle`, `letterSpacing`, `textTransform`, `textDecoration` and `textOutlineColor`. The layout reads only the measured height of the header and footer. Their width is the graph's. `brandMark` says whether the badge sits in the header: `'hidden'`, `'mini'` or `'full'`, typed `BrandMarkVisual`. The exported `BrandMark` component paints it from `visual` and `placement`, so a custom header or footer keeps the badge. `resolveBrandMarkVisual(enabled, frameSize, variant)` gives the same value for a frame of your own. A custom header opts out of inline title editing.

## Footer slot

Same contract as the header. Forward `ref`, place at `footerRect`.

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { FooterSlotProps } from '@graphysdk/react';

const SourceOnlyFooter = ({ ref, footerRect, source, isSourceVisible, sourceStyle }: FooterSlotProps) => {
  if (!isSourceVisible || source === null) return null;
  return (
    <div ref={ref} style={{ position: 'absolute', left: footerRect.x, top: footerRect.y, width: footerRect.width }}>
      <span style={{ fontSize: sourceStyle.label.fontSize, color: sourceStyle.label.textColor }}>
        Source:{' '}
        {source.url ? (
          <a href={source.url} style={{ color: sourceStyle.link.textColor }}>
            {source.label ?? source.url}
          </a>
        ) : (
          source.label
        )}
      </span>
    </div>
  );
};

export const Renderer = () => <GraphRenderer slots={{ Footer: SourceOnlyFooter }} />;
```

`caption` is text or `null`. `source` is `{ label?, url? }` or `null`. `sourceStyle` has a `label` style and a `link` style.

## Swatch slot

One swatch component serves the legend, the tooltip, the headline, callouts and rule labels. `surface` says which one is asking. Handle the case you care about and hand the rest to `DefaultSwatch`.

```tsx
import { DefaultSwatch, GraphRenderer } from '@graphysdk/react';
import type { SwatchSlotProps } from '@graphysdk/react';

const SharpSwatch = (props: SwatchSlotProps) => {
  if (props.surface !== 'legend') return <DefaultSwatch {...props} />;
  const width = props.width ?? 12;
  const height = props.height ?? 12;
  const isHollow = props.label === 'forecast';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        fill={isHollow ? 'none' : props.color}
        stroke={isHollow ? props.color : 'none'}
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const Renderer = () => <GraphRenderer slots={{ Swatch: SharpSwatch }} />;
```

`shape` is `'square'`, `'line'`, `'area'`, `'circle'` or `'slice'`, picked by the geom, typed `SwatchShape`. `surface` is `'legend'`, `'tooltip'`, `'headline'`, `'callout'` or `'rule-label'`, typed `SwatchSurface`. `label` is the item's text where the surface has one. `paint` carries a gradient, pattern or image fill when the geom has one. A swatch that reads only `color` drops those fills. Paint inside the `width` by `height` box you receive.

## Grid slot

The grid slot paints the lines behind the geoms. Coordinates are SVG-local, so draw inside an `<svg>` placed at `panelFrameRect`.

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { GridSlotProps } from '@graphysdk/react';

const DottedGrid = ({ axes, panelFrameRect, panelRect }: GridSlotProps) => {
  const offsetX = panelRect.x - panelFrameRect.x;
  const offsetY = panelRect.y - panelFrameRect.y;
  return (
    <svg x={panelFrameRect.x} y={panelFrameRect.y} width={panelFrameRect.width} height={panelFrameRect.height}>
      {axes.map((axis) => {
        if (axis.geometry !== 'linear' || !axis.gridVisible) return null;
        const isHorizontalAxis = axis.position === 'bottom' || axis.position === 'top';
        return axis.ticks.map((tick) => {
          const x = offsetX + tick.position * panelRect.width;
          const y = offsetY + (1 - tick.position) * panelRect.height;
          return isHorizontalAxis ? (
            <line key={String(tick.value)} x1={x} x2={x} y1={offsetY} y2={offsetY + panelRect.height} stroke="#ccc" strokeDasharray="2 4" />
          ) : (
            <line key={String(tick.value)} x1={offsetX} x2={offsetX + panelRect.width} y1={y} y2={y} stroke="#ccc" strokeDasharray="2 4" />
          );
        });
      })}
    </svg>
  );
};

export const Renderer = () => <GraphRenderer slots={{ Grid: DottedGrid }} />;
```

`axes` holds one formatted axis per position scale. Each tick has `value`, `position` (0 to 1 along the axis, y measured upwards) and `formattedLabel`. An axis also carries `labelRotation` and `labelMaxWidthPx`. Circular and radial axes of a radar are drawn elsewhere and have `geometry` other than `'linear'`. `DefaultGrid` skips the line that would sit on a bordered panel edge, so a custom grid reads `panelBorderSizes` to match.

## Measured slots

A region on an edge must tell the layout how much space to reserve before anything is painted. A measured slot is an object:

```ts
import type { GraphSlots } from '@graphysdk/react';

type LegendSlot = NonNullable<GraphSlots['Legend']>;
// { render: ComponentType<LegendSlotProps>; measure: (legend, ctx) => number }
```

For `Legend`, `AxisTicks` and `AxisLabel`, `measure` returns the band thickness in pixels: the height for a top or bottom region, the width for a left or right one. It is called once per legend or axis with that one `FormattedLegend` or `FormattedAxis`, not with the arrays and rects `render` receives, plus a `SlotMeasureContext` with `measureText(text, font)` and `textScale`. `measureText` takes a font with `family` and `size`, and optional `weight`, `style`, `letterSpacing` and `textTransform`, and returns `{ width, height, ascent, descent }`. Use it when the size depends on text, so the reserved band matches what you paint at any text scale. It is not called for a legend with no items, for an axis that is hidden, has no ticks or is not linear, and the `AxisLabel` measure runs only for an axis with a title.

`Headline` is different. Its `measure` is an object with `measureHeadline(headline, size, isInDonutHole?)` returning `{ width, height }` and `measureHeadlineItemWidths(headline, size)` returning one width per item. Neither receives a `SlotMeasureContext`.

Give `measure` a stable reference. A new function each render takes effect on the next paint but does not retrigger layout. The pair is typed `SlotOverride<Props, Measure>`, and `GraphSlots['Legend']` and friends name each slot's instance of it.

## Legend slot

```tsx
import { useMemo } from 'react';

import { GraphRenderer } from '@graphysdk/react';
import type { GraphSlots, LegendSlotProps } from '@graphysdk/react';

const ROW_HEIGHT = 20;
const ITEM_WIDTH = 110;

const isVertical = (position: string) => position === 'left' || position === 'right';

const ListLegend = ({ formattedLegends, rects }: LegendSlotProps) => (
  <>
    {formattedLegends.map((legend) => {
      const rect = rects[legend.position];
      if (!rect) return null;
      return (
        <ul
          key={legend.position}
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: isVertical(legend.position) ? 'column' : 'row',
          }}
        >
          {legend.items.map((item) => (
            <li
              key={String(item.value)}
              style={{ height: ROW_HEIGHT, width: ITEM_WIDTH, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ width: 10, height: 10, background: item.visual.color ?? '#999' }} />
              {item.formattedLabel}
            </li>
          ))}
        </ul>
      );
    })}
  </>
);

// A left or right legend reserves a width. A top or bottom one reserves a height.
const legendSlot: NonNullable<GraphSlots['Legend']> = {
  render: ListLegend,
  measure: (legend) => (isVertical(legend.position) ? ITEM_WIDTH : ROW_HEIGHT),
};

export const Renderer = () => {
  const slots = useMemo<GraphSlots>(() => ({ Legend: legendSlot }), []);
  return <GraphRenderer slots={slots} />;
};
```

`formattedLegends` has one legend per visual scale, or one merged legend. Each has `position` (`'top'`, `'right'`, `'bottom'` or `'left'`), `display` (`'pill'` or `'direct'`), `align`, `aesthetics`, `title` and `items`. An item has `value`, `label`, `formattedLabel`, `visual.color`, `geom`, `valueFormat`, `normalizedY` and `layerId`. `rects` maps each edge to the box the layout reserved from your `measure`. The measure reads `legend.position` because the layout wants a width on the left or right and a height on the top or bottom. The example stacks items in a column on a vertical edge and lays them in a row on a horizontal one, so one item's width or height is the whole band.

## AxisTicks and AxisLabel slots

The tick band and the axis title are separate slots, so overriding the ticks leaves the title on its default.

```tsx
import { useMemo } from 'react';

import { GraphRenderer } from '@graphysdk/react';
import type { AxisTicksSlotProps, GraphSlots } from '@graphysdk/react';

const ICON_BY_VALUE: Record<string, string> = { Q1: '❄️', Q2: '🌱', Q3: '☀️', Q4: '🍂' };
const BAND_HEIGHT = 30;

const IconTicks = ({ formattedAxes, tickRects }: AxisTicksSlotProps) => {
  const axis = formattedAxes.find((candidate) => candidate.position === 'bottom');
  const rect = tickRects.bottom;
  if (!axis || !rect) return null;
  return (
    <svg x={rect.x} y={rect.y} width={rect.width} height={rect.height} style={{ overflow: 'visible' }}>
      {axis.ticks.map((tick) => (
        <text key={String(tick.value)} x={`${tick.position * 100}%`} y={BAND_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" fontSize={22}>
          {ICON_BY_VALUE[String(tick.value)] ?? tick.formattedLabel}
        </text>
      ))}
    </svg>
  );
};

export const Renderer = () => {
  const slots = useMemo<GraphSlots>(() => ({ AxisTicks: { render: IconTicks, measure: () => BAND_HEIGHT } }), []);
  return <GraphRenderer slots={slots} />;
};
```

`tickRects` and `labelRects` are SVG-local, keyed by edge. Only the bottom axis is drawn above, so left-axis ticks disappear. An override replaces the default for every axis, and there is no default measure to fall back to, so draw and size every visible linear axis yourself. `AxisLabel` has the same shape with `labelRects` and paints the axis title.

## Headline slot

The headline is the row of big numbers above the panel, or the total in a donut hole. Its measure is an object with two functions, because the layout sizes the whole strip and then each item.

```tsx
import { useMemo } from 'react';

import { GraphRenderer } from '@graphysdk/react';
import type { GraphSlots, HeadlineSlotProps } from '@graphysdk/react';

const ITEM_WIDTH = 120;
const STRIP_HEIGHT = 48;

const CompactHeadline = ({ headline, rect, visibleItemCount }: HeadlineSlotProps) => {
  const box = { position: 'absolute' as const, left: rect.x, top: rect.y, width: rect.width, height: rect.height };
  if (headline.kind === 'grandTotal') return <div style={{ ...box, textAlign: 'center', fontSize: 24 }}>{headline.value}</div>;
  return (
    <div style={{ ...box, display: 'flex', gap: 12 }}>
      {headline.items.slice(0, visibleItemCount).map((item) => (
        <div key={item.label} style={{ width: ITEM_WIDTH }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value ?? 'n/a'}</div>
          <div style={{ fontSize: 12 }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
};

const headlineSlot: NonNullable<GraphSlots['Headline']> = {
  render: CompactHeadline,
  measure: {
    measureHeadline: (headline) =>
      headline.kind === 'grandTotal'
        ? { width: ITEM_WIDTH, height: STRIP_HEIGHT }
        : { width: headline.items.length * ITEM_WIDTH, height: STRIP_HEIGHT },
    measureHeadlineItemWidths: (headline) => headline.items.map(() => ITEM_WIDTH),
  },
};

export const Renderer = () => {
  const slots = useMemo<GraphSlots>(() => ({ Headline: headlineSlot }), []);
  return <GraphRenderer slots={slots} />;
};
```

`headline.kind` is `'perGroup'` with `items` (each with `label`, `value`, `caption`, `comparison`, `swatch`) or `'grandTotal'` with one `value`. `resolvedSize` is `'small'`, `'medium'` or `'large'`. `visibleItemCount` says how many strip items fit. `isInDonutHole` says whether a total sits inside a donut. `measureHeadline` returns `{ width, height }` for a given size. `measureHeadlineItemWidths` returns one width per item.

## Wrapping a default

`DefaultHeader`, `DefaultFooter`, `DefaultTooltip`, `DefaultGrid` and `DefaultSwatch` are exported, so a slot can add to the default instead of replacing it.

```tsx
import { DefaultTooltip, GraphRenderer } from '@graphysdk/react';
import type { TooltipSlotProps } from '@graphysdk/react';

const FramedTooltip = (props: TooltipSlotProps) => (
  <div style={{ border: '2px solid #1d4ed8', borderRadius: 8 }}>
    <DefaultTooltip {...props} />
  </div>
);

export const Renderer = () => <GraphRenderer slots={{ Tooltip: FramedTooltip }} />;
```

The defaults of the measured slots (`Legend`, `Headline`, `AxisTicks`, `AxisLabel`) are not exported. A measured override paints the whole region itself.

## Pitfalls

- A measured slot without a correct `measure` overlaps the panel or leaves a gap. Paint and measure must describe the same box.
- `Header` and `Footer` must forward `ref` to their outer element. Without it the layout reserves no space and the panel paints over them.
- `Tooltip` paints the body only. Positioning, portalling and hover detection stay built in.
- A `slots` object built inline is a new object every render. Keep it at module scope or in `useMemo`.
- `AxisTicks` covers every axis and its `measure` is called for each one. Handle each edge present in `tickRects`, not only the bottom one.
- `DefaultLegend`, `DefaultHeadline`, `DefaultAxisTicks` and `DefaultAxisLabel` are not exported. Only the bare slots can wrap their default.
