# The pre-built panel

`@graphysdk/react/editable` ships a settings panel: `EditorPanel.Root` plus 22 sections, each a block of labeled controls wired to commands. Build a custom panel with `useGraphCommands` or `GraphHandle` if needed.

Contents: composition, root props, placement, the section list, your own section, controls and the registry, gotchas.

## Composition

The panel has four replaceable parts: Root connects to the chart and manages the accordion; sections appear in child order; rows label settings; controls handle input and can be replaced through the registry.

```tsx
import { AxisSection, EditorPanel, GraphTypeSection, LegendSection, TitleSection } from '@graphysdk/react/editable';

<EditorPanel.Root defaultExpandedSection="Graph type">
  <GraphTypeSection />
  <AxisSection axis="x" />
  <AxisSection axis="y" />
  <LegendSection />
  <TitleSection />
</EditorPanel.Root>;
```

## Root props

| Prop                     | Type               | Meaning                                                                                                        |
| ------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `handle`                 | `GraphHandle?`     | Omit to edit the enclosing `GraphProvider`. Pass one to mount the panel anywhere.                              |
| `children`               | `ReactNode`        | The sections, in order. Your own components can sit between them.                                              |
| `controls`               | `ControlRegistry?` | Per-control replacements. Omitted members come from the nearest `ControlRegistryProvider`, else the built-ins. |
| `defaultExpandedSection` | `string?`          | The title of the section open at first. Omitted means all closed.                                              |
| `className`              | `string?`          | Extra classes. A `lightTheme` or `darkTheme` class here replaces the root's own theme class.                   |

The root renders an accordion marked `data-graphy-editor-panel` (exported as `PANEL_ROOT_ATTRIBUTE`). One collapsible section is open at a time. A section's `title` is its identity, so titles must be distinct within one root, and `defaultExpandedSection` matches the translated title. `EditorPanel.Controls.List` stacks rows in a custom section and `EditorPanel.Controls.Grid` puts controls in two columns.

## Placement

Inside `GraphProvider`, the panel gets the chart, locale and color scheme from context:

```tsx
import { GraphProvider } from '@graphysdk/react';
import { AxisSection, EditableGraphRenderer, EditorPanel } from '@graphysdk/react/editable';

<GraphProvider spec={spec} data={data} onSpecChange={setSpec} colorScheme="dark">
  <EditableGraphRenderer mode="edit" />
  <EditorPanel.Root>
    <AxisSection axis="y" />
  </EditorPanel.Root>
</GraphProvider>;
```

Outside the provider tree, pass `handle` from `GraphProvider handleRef`. The ref is empty until the provider mounts. Without the provider context, the panel defaults to `en-GB` and a light color scheme. Wrap it in `IntlProvider` from `@graphysdk/react/editable` with the chart's locale, and `ThemeProvider` from `@graphysdk/react` with its color scheme.

Use the same `IntlProvider` inside the tree to change the locale or override phrases. It must be Graphy's provider; react-intl uses a different context. Supported locales: `en-GB`, `en-US`, `pt-PT`, `ar`.

Sections render nothing until the chart's first compile. `usePanelGraph()` and `usePanelExpansion()` throw outside a root, and `usePanelGraph()` throws in a root that has no chart, neither a `handle` nor a provider.

## Sections

Every section takes `title`, `layout` (`'fixed' | 'collapsible' | 'inline'`, default `collapsible`) and `preview` (text shown while closed; always shown on `fixed` and `inline`). `GoalSection` has no `layout` and `MappingSection` no `preview`. A section renders nothing when the chart has nothing for it, for example `LineSection` on a bar chart. The available sections are listed below.

| Section                                             | Edits                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GraphTypeSection`                                  | What the chart is: column, bar and their stacked and 100% stacked variants, line, stacked area, scatter, pie, donut, radial bar, rose, stacked rose, radar, filled radar, heatmap, combo. One undo step. Combo and heatmap are disabled when the chart cannot become one. |
| `ComboSection`                                      | On a combo chart: grouped bars, stacked bars or lines only                                                                                                                                                                                                                |
| `MappingSection`                                    | Which column feeds x, value, color, size and label                                                                                                                                                                                                                        |
| `GraphOptionsSection` (`layerId?`)                  | Data labels on a layer: on or off, absolute or percent, stack totals, category labels on a pie                                                                                                                                                                            |
| `AxisSection` (`axis: 'x' \| 'y'`)                  | Visibility, single or double axes on a combo, title, ticks, labels, position, reverse, log scale, start and end                                                                                                                                                           |
| `PolarSection`                                      | Inner radius and start angle of a round chart                                                                                                                                                                                                                             |
| `BarSection`                                        | Bar thickness and corner rounding                                                                                                                                                                                                                                         |
| `LineSection`                                       | Show points, point size, fill under line, smooth, thickness, missing values                                                                                                                                                                                               |
| `PointSection`                                      | Point size on an authored point layer                                                                                                                                                                                                                                     |
| `GridSection`                                       | Grid lines per direction, style and thickness                                                                                                                                                                                                                             |
| `LegendSection` (`positions?`)                      | Position, alignment and style. `positions` limits what is offered, plus the current one.                                                                                                                                                                                  |
| `HeadlineSection`                                   | The headline number: visible, metric, compare with, size, position                                                                                                                                                                                                        |
| `NumberFormatSection`                               | Abbreviation and decimal places for the whole chart                                                                                                                                                                                                                       |
| `AppearanceSection`                                 | Frame corner radius, how highlights fade the rest                                                                                                                                                                                                                         |
| `TextSizeSection`                                   | One multiplier over the theme's text sizes                                                                                                                                                                                                                                |
| `CalloutsSection`                                   | Adds a text, arrow, box or difference arrow annotation per button                                                                                                                                                                                                         |
| `TitleSection`, `SubtitleSection`, `CaptionSection` | Visibility and text. Hiding keeps the text. Also editable on the canvas in annotate mode. A rich-text value disables the field and stays canvas-only.                                                                                                                     |
| `SourceSection`                                     | Visibility, name and URL of the source line                                                                                                                                                                                                                               |
| `GoalSection`                                       | The goal line: on or off from its header, value, label                                                                                                                                                                                                                    |
| `TrendsAndAveragesSection`                          | A trend line with its method, or an average line per group                                                                                                                                                                                                                |

Two pre-assembled panels take the root's props: `AxesPanel` (both axes) and `ElementsPanel` (title, subtitle, caption, source, text size). Children passed to them replace their sections.

Use commands for colors, arbitrary stylesheet edits, mapping beyond the five aesthetics, custom layers and highlights. The panel has no sections for these edits.

## Your own section

- `Section`: `{ title, layout?, preview?, accessory?, onOpenChange?, children }`. `fixed` (the default here) always shows its body. `collapsible` joins the accordion. `inline` puts the control in the header unless a `preview` is given. `accessory` is a live control in the header whose clicks do not toggle.
- `ToggledSection`: `{ title, checked, onToggle, disabled?, preview?, children }`. A switch in the header turns the feature on and opens the section, or off and closes every section. Opening the section while off switches it on, unless `disabled`.
- `Row`: `{ label?, layout?: 'stack' | 'grid', icon?, children }`. One labeled setting. With a `label`, the row labels its control for screen readers.
- `Separator`: a line between runs of rows.
- `usePanelGraph(): GraphHandle`: the chart the panel edits. Read the compiled chart from it and dispatch to it.
- `usePanelExpansion(): { expandSection(title), collapseAllSections() }`.

```tsx
import { useHandleScene } from '@graphysdk/react';
import { Row, Section, useControls, usePanelGraph } from '@graphysdk/react/editable';
import { SetBarWidthCommand } from '@graphysdk/react/editable';

const BarWidthSection = () => {
  const graph = usePanelGraph();
  const { Slider } = useControls();
  const scene = useHandleScene(graph);
  const params = scene?.spec.layers.find((layer) => layer.geom === 'bar')?.params;
  // 0.7 is the cartesian default. Polar bars default to 1.
  const width = params && 'width' in params && typeof params.width === 'number' ? params.width : 0.7;

  return (
    <Section title="Bar width" layout="collapsible">
      <Row label="Width">
        <Slider
          min={0.05}
          max={1}
          step={0.01}
          value={width}
          onChange={(next) => graph.commands.dispatch(new SetBarWidthCommand({ width: next }), { transient: true })}
          onCommit={graph.commands.commit}
        />
      </Row>
    </Section>
  );
};
```

## Controls and the registry

Sections get controls from the registry through `useControls()`. The ten controls use these contracts:

- Discrete, `DiscreteControlProps<V>` (`value`, `onChange`): one change, one undo entry, nothing to commit. `Switch` (`checked`, not `value`), `Select` (nullable value, `options`, `placeholder`), `ColorSwatches` (`colors`, `trailing`, `clearable`).
- Continuous, `ContinuousControlProps<V>` (`value`, `onChange`, `onCommit?`): `onChange` streams through the gesture and is dispatched transiently, `onCommit` closes it into one undo entry. `Slider` (`min`, `max`, `step`, `suffix`, `showValue`, `formatValue`), `NumberField` (`number | null`, null is an empty field), `TextField` (per keystroke, commit on blur), `ToggleGroup` (`options`, `itemLayout`, `hasEqualWidths`), `RadioGrid` (`options`, `columns`, `itemLayout: 'tile' | 'swatch' | 'icon' | 'track'`, options may pin `gridRow` and `gridColumn`), `CustomColor` (`variant: 'default' | 'chip'`, commits when the picker closes).
- `Button` is an action: `onClick`, `variant: 'default' | 'tile'`, and either `{ label, icon? }` or `{ icon, ariaLabel }`.

Swap any of them through the registry. Omitted members keep the built-ins.

```tsx
import type { ControlRegistry, SliderControlProps } from '@graphysdk/react/editable';

const MySlider = ({
  value,
  onChange,
  onCommit,
  min,
  max,
  step,
  suffix,
  showValue = true,
  formatValue,
  disabled,
  ariaLabel,
  ariaLabelledBy,
}: SliderControlProps) => (
  <label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onChange={(event) => onChange(event.target.valueAsNumber)}
      onPointerUp={() => onCommit?.()}
      onKeyUp={() => onCommit?.()}
      onBlur={() => onCommit?.()}
    />
    {showValue && <span>{formatValue ? formatValue(value) : `${value}${suffix ?? ''}`}</span>}
  </label>
);

const controls: ControlRegistry = { Slider: MySlider };
```

Apply the registry in either place:

- `<EditorPanel.Root controls={controls}>` for one panel.
- `<ControlRegistryProvider controls={controls}>` around a chart and its panels. It reaches every panel inside, the rows of the edit menu and the color pickers in the annotation toolbars. A panel's own `controls` override the provider inside that panel.

A replacement must honor its contract. A continuous control that never calls `onCommit` leaves the run open until the next edit. One that commits every change splits a drag into many undo entries. `ControlTooltip` names an icon-only option in your own control the way the built-ins do.

## Behavior to account for

- Section titles must be distinct. The title is the accordion identity.
- A `TextField` or `NumberField` in the panel takes Cmd/Ctrl+Z for the chart's history, so both use the same undo history.
- Remount the root with a new `key` when switching tabs. Each mount opens on its own `defaultExpandedSection`.
- Editor tokens restyle the panel: `--graphy-editor-accent`, `-surface`, `-text`, `-border`, `-font-family`, `-padding-x`, `-padding-y` on `:root`. Set the two padding tokens to `0px` for a flush panel. Target host CSS at `[data-graphy-editor-panel]`.
- The editor ships phrases for `en-GB`, `en-US`, `pt-PT` and `ar`. In a right-to-left locale, arrow keys and popups follow the locale. The layout follows the page's `dir` attribute.
