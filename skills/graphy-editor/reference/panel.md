# The pre-built editor panel (optional)

`@graphysdk/react-renderer/editable` ships a ready-made settings panel: `EditorPanel.Root` plus ~20
sections, each a block of labelled controls wired to commands. It is **one optional UI over the
command system, not the editor**: it covers a curated subset of chart settings (the catalog below
says exactly what each section edits), and a host is equally free to build its own UI directly on
`useGraphCommands`/`GraphHandle` (`reference/commands.md`) — everything the panel does is ordinary
command dispatch underneath.

## How it composes

Four layers, each replaceable: **Root** (binds a graph, themes the frame, runs the accordion) →
**sections** (its children, in your order) → **rows** (one labelled setting) → **leaf controls**
(swappable via the registry).

```tsx
import {
  EditorPanel, GraphTypeSection, AxisSection, TitleSection, CalloutsSection,
} from '@graphysdk/react-renderer/editable';

<EditorPanel.Root defaultExpandedSection="Callouts">
  <GraphTypeSection />
  <AxisSection axis="x" />
  <AxisSection axis="y" />
  <TitleSection />
  <CalloutsSection />
</EditorPanel.Root>
```

### `EditorPanel.Root` props

(The published type declarations currently fail to export `PanelRootProps`, so editors show it as
`any`. These are the real props.)

| Prop | Type | Meaning |
|---|---|---|
| `handle` | `GraphHandle?` | Omit → the panel edits the enclosing `<GraphProvider>`. Pass one → the panel can live anywhere, including above or beside the provider. |
| `children` | `ReactNode` | The sections, in the order you want them. Interleave your own. |
| `controls` | `ControlRegistry?` | Per-control replacements; omitted members keep the built-ins (see Controls below). |
| `defaultExpandedSection` | `string?` | The section *title* open on first render; omitted → all closed. |
| `className` | `string?` | Extra classes on the root. If it already contains the `lightTheme`/`darkTheme` class, the root skips applying its own theme class. |

The root renders an accordion marked `data-graphy-editor-panel` (exported as
`PANEL_ROOT_ATTRIBUTE` — target host CSS at it). **One section is open at a time**, and a
section's `title` doubles as its identity in the accordion — duplicate titles break
open/close. `EditorPanel.Controls.List` / `.Grid` are layout wrappers for custom sections
(not top-level exports).

### Placement and i18n

- **Inside the provider tree**: nothing else needed; the panel binds via context and inherits the
  chart's theme.
- **Outside the tree** (separate column, drawer, another React root): pass `handle` from
  `<GraphProvider handleRef>`, **and** wrap the panel in the editing entry's own `IntlProvider` —
  without it, sections show untranslated label keys:

```tsx
import { IntlProvider, EditorPanel, AxisSection } from '@graphysdk/react-renderer/editable';
import { ThemeProvider, darkTheme } from '@graphysdk/react-renderer';

<IntlProvider locale="en-GB">
  <ThemeProvider colorScheme="dark">
    <div className={darkTheme}>
      <EditorPanel.Root handle={handle}>
        <AxisSection axis="y" />
      </EditorPanel.Root>
    </div>
  </ThemeProvider>
</IntlProvider>
```

(Use Graphy's `IntlProvider`, not react-intl's — they are unrelated, and react-intl's does not
work here.) Sections render `null` until the graph's first successful compile; `usePanelGraph()`
and `usePanelExpansion()` throw outside an `EditorPanel.Root`.

## Section catalog

Every section accepts `OverridableSectionProps` — `title`, `layout`
(`'fixed' | 'collapsible' | 'inline'`), `preview` (what it says while closed) — so the same
section can be mounted with a different title, layout or closed-state preview. Sections render
`null` when the chart has nothing for them (e.g. `LineSection` on a bar chart). This table is the
complete list of what the panel can edit:

| Section | Edits |
|---|---|
| `GraphTypeSection` | What the chart *is* — column/stacked/donut… — read from the spec, so the current type is always the one lit up |
| `GraphOptionsSection` (`layerId?`) | Data labels on a layer's marks: visibility, absolute vs percent, category labels, stack totals |
| `AxisSection` (`axis: 'x' \| 'y'`, required) | One axis and its scale: label, position, ticks, visibility, domain |
| `PolarSection` | Inner radius and start angle of a round chart |
| `BarSection` | Bar width and corner radius |
| `LineSection` | Path drawing: points, curve, thickness, missing values (line/area only) |
| `PointSection` | Point size (authored point layers only) |
| `GridSection` | Grid visibility per direction; shared style and thickness |
| `LegendSection` (`positions?`) | Legend position and display mode; `positions` restricts what's offered |
| `HeadlineSection` | The headline number shown above the chart |
| `NumberFormatSection` | Chart-wide number reading: abbreviation (`1.2k`), decimals |
| `AppearanceSection` | Frame corner radius; how highlights dim everything else (does nothing until a highlight exists) |
| `TextSizeSection` | One multiplier over the theme's text sizes |
| `CalloutsSection` | Adds a whole annotation per button press (there is no draw-on-chart gesture) |
| `TitleSection` / `SubtitleSection` / `CaptionSection` | Visibility and text; hiding keeps the text. Also editable in place on the canvas — these are the second way in |
| `SourceSection` | Source attribution — the one text slot never editable in place |
| `GoalSection` | The goal line: on/off (a `ToggledSection`), value, label |
| `TrendsAndAveragesSection` | The chart's stat line: trend (with method) or average |

Two pre-assembled panels wrap common groupings and take the root's props (minus children, which
*replace* their section list wholesale if given): `AxesPanel` (both axes) and `ElementsPanel` (the
chart's text and text size).

**That is the whole panel.** Mapping and series changes, scale transforms, per-layer styling,
arbitrary stylesheet edits, adding layers — none of it is in the panel; all of it is reachable as
commands (`reference/commands.md`).

## Building your own section

- `Section` — `{ title, layout?, preview?, accessory?, onOpenChange?, children }`. `fixed` (default)
  always shows its body; `collapsible` joins the accordion; `inline` is a single row with the
  control in the header. `accessory` puts a live control in the header whose clicks don't toggle.
- `ToggledSection` — `{ title, isChecked, onToggle, isDisabled?, preview?, children }`. A section
  whose feature is switched from its own header; on opens, off collapses, opening while off
  switches on. Always collapsible.
- `Row` — `{ label?, layout?: 'stack' | 'grid', icon?, children }`. One labelled setting; the row
  publishes ids and labels the control accessibly (`ariaLabelledBy`/`htmlFor`).
- `usePanelGraph(): GraphHandle` — the graph the surrounding panel edits; a custom section reads
  compiled state from it and dispatches commands to it.
- `usePanelExpansion(): { expandSection(title), collapseAllSections() }` — write-only.

A custom section is those pieces plus commands:

```tsx
import { Section, Row, useControls, usePanelGraph } from '@graphysdk/react-renderer/editable';
import { SetBarWidthCommand } from '@graphysdk/viz-engine';

const BarWidthSection = () => {
  const graph = usePanelGraph();
  const { Slider } = useControls();
  const width = 0.7; // in a real section, read back from graph.getCompiled()
  return (
    <Section title="Bar width" layout="collapsible">
      <Row label="Width">
        <Slider
          min={0.05} max={1} step={0.01} value={width}
          onChange={(next) => graph.commands.dispatch(new SetBarWidthCommand({ width: next }), { transient: true })}
          onCommit={graph.commands.seal}
        />
      </Row>
    </Section>
  );
};
```

## Controls and design-system adoption

Sections never import a UI library directly — every leaf goes through `useControls()`, resolved
from the registry. Eight controls, two contracts:

- **Discrete** (`DiscreteControlProps<V>`: `value`, `onChange`) — one gesture, one change, one undo
  entry, nothing to commit: `Switch` (`isChecked`, not `value`), `Select` (nullable value,
  `onChange` never fires null; the one control with a `description` line per option).
- **Continuous** (`ContinuousControlProps<V>`: `value`, `onChange`, `onCommit?`) — one gesture can
  produce a run of changes; `onChange` streams (dispatched `{ transient: true }`), `onCommit` seals
  the run into one undo entry: `Slider` (`min`/`max` required, `suffix`/`formatValue` readout),
  `NumberField` (`number | null` — null is an empty field, **not** zero; `prefix`/`suffix`
  display-only), `TextField` (per-keystroke `onChange`, `onCommit` on blur), `ToggleGroup`
  (segmented row; `itemLayout: 'inline' | 'stacked'`) and `RadioGrid` (picture grid;
  `columns`, `itemLayout: 'tile' | 'swatch'`) — both continuous *despite holding one string*,
  because a held arrow key sweeps the selection and seals on key up.
- `Button` is an action, not a value: `onClick`, `variant: 'default' | 'tile'`, and its content is
  either `{ label, icon? }` or `{ icon, ariaLabel }` — the types make "no label and no icon"
  impossible.

Swap any of them, one at a time, via the registry — omitted members keep the built-ins, so a
design system lands incrementally:

```tsx
import type { ControlRegistry, SliderControlProps } from '@graphysdk/react-renderer/editable';

const MySlider = ({ value, onChange, onCommit, min, max, step, isDisabled, ariaLabel }: SliderControlProps) => (
  <input
    type="range" min={min} max={max} step={step} value={value} disabled={isDisabled}
    aria-label={ariaLabel}
    onChange={(e) => onChange(e.target.valueAsNumber)}
    onPointerUp={() => onCommit?.()}
    onBlur={() => onCommit?.()}
  />
);

const controls: ControlRegistry = { Slider: MySlider };
// <EditorPanel.Root controls={controls}>…
```

**A replacement must honor its contract.** A continuous control that never calls `onCommit` leaves
the run open (sealed late by the next edit — undo still works, `onChange` arrives late); one that
skips the transient stream and commits every change fragments a drag into many undo entries. Match
the built-ins: stream `onChange` through the gesture, `onCommit` once at its end (pointer up, blur,
key up).

## Gotchas

- Section titles must be distinct — the title is the accordion identity.
- `TextField` inside a panel intercepts ⌘/Ctrl+Z so the shortcut steps the chart's history rather
  than the browser's own text undo — otherwise the field and the chart would fall out of step.
- `Select`'s popup renders at the page root; without a chart theme on the page it falls back to
  the page's own styles.
- Remount the root (React `key`) when switching between section sets or tabs; each mount opens on
  its own `defaultExpandedSection` rather than inheriting the last one.
- The old editor API (`@graphysdk/editor`, `EditorProvider`, `GraphPanel`, `EditorPanel.Section`,
  `defaultExpanded`) no longer exists. The prop is `defaultExpandedSection`; sections are separate
  exports.
