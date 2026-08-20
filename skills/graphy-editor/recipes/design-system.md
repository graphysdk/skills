# Design-system adoption

Make the pre-built panel look and feel like your product, one layer at a time: swap individual
controls via the registry (sections keep working unchanged), then add a custom section of your
own. Nothing here forks the SDK — omitted registry members keep the built-ins, so adoption is
incremental.

## 1. Swap controls with a `ControlRegistry`

The two contracts to honor (`reference/panel.md` for the full rules): **discrete** controls commit
per change; **continuous** controls stream `onChange` during the gesture and call `onCommit` once
at its end — that call is what seals a drag into a single undo entry.

```tsx
import type {
  ControlRegistry, SliderControlProps, SwitchControlProps,
} from '@graphysdk/react-renderer/editable';

// Continuous: stream onChange, commit on pointer-up AND blur (focus can leave mid-drag).
const HouseSlider = ({
  value, onChange, onCommit, min, max, step, suffix, formatValue, isDisabled, ariaLabel, ariaLabelledBy,
}: SliderControlProps) => (
  <div className="house-slider">
    <input
      type="range" min={min} max={max} step={step} value={value} disabled={isDisabled}
      aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      onPointerUp={() => onCommit?.()}
      onKeyUp={() => onCommit?.()}
      onBlur={() => onCommit?.()}
    />
    {suffix !== undefined && <span>{formatValue ? formatValue(value) : `${value}${suffix}`}</span>}
  </div>
);

// Discrete: every flip is its own undo entry; note the prop is isChecked, not value.
const HouseSwitch = ({ isChecked, onChange, isDisabled, ariaLabel, ariaLabelledBy, id }: SwitchControlProps) => (
  <input
    type="checkbox" role="switch" id={id} checked={isChecked} disabled={isDisabled}
    aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}
    onChange={(e) => onChange(e.target.checked)}
  />
);

export const houseControls: ControlRegistry = {
  Slider: HouseSlider,
  Switch: HouseSwitch,
  // TextField, NumberField, Select, ToggleGroup, RadioGrid, Button: built-ins until you're ready.
};
```

```tsx
<EditorPanel.Root controls={houseControls}>
  <BarSection />
  <GridSection />
</EditorPanel.Root>
```

Every section now renders your slider and switch wherever it used the built-ins — sections resolve
controls through `useControls()`, never a UI library directly.

## 2. Add a custom section

A section is `Section` + `Row` + resolved controls + the panel's graph handle. Read state from the
compiled spec, write it as commands:

```tsx
import { useSyncExternalStore } from 'react';
import {
  EditorPanel, Section, Row, useControls, usePanelGraph, BarSection, GridSection,
} from '@graphysdk/react-renderer/editable';
import { SetContentSourceCommand } from '@graphysdk/viz-engine';

const SourceLinkSection = () => {
  const graph = usePanelGraph(); // throws outside EditorPanel.Root
  const { TextField } = useControls();

  // Subscribe to the compiled spec and read the field you need from it.
  const compiled = useSyncExternalStore(graph.subscribe, graph.getCompiled);
  const source = compiled?.spec.config.content?.source ?? undefined;

  return (
    <Section title="Source link" layout="collapsible" preview={source?.label ?? 'None'}>
      <Row label="Label">
        <TextField
          value={source?.label ?? ''}
          onChange={(label) =>
            graph.commands.dispatch(
              new SetContentSourceCommand({ source: { ...source, label } }),
              { transient: true },
            )}
          onCommit={graph.commands.seal}
          placeholder="e.g. Company filings"
        />
      </Row>
      <Row label="URL">
        <TextField
          value={source?.url ?? ''}
          onChange={(url) =>
            graph.commands.dispatch(
              new SetContentSourceCommand({ source: { ...source, url } }),
              { transient: true },
            )}
          onCommit={graph.commands.seal}
          placeholder="https://…"
        />
      </Row>
    </Section>
  );
};

export const Panel = () => (
  <EditorPanel.Root controls={houseControls} defaultExpandedSection="Source link">
    <SourceLinkSection />
    <BarSection />
    <GridSection />
  </EditorPanel.Root>
);
```

What to notice:

- **Read where you write.** The section reads the value off the compiled spec and its command
  writes that same field, so the input always shows what an edit would change — and edits arriving
  from anywhere else (canvas, agent, undo) flow back into it through the subscription.
- **One undo entry per burst of typing.** Each keystroke dispatches with `{ transient: true }`;
  blur (`onCommit`) seals the run — matching the built-in sections.
- **`title` is identity.** "Source link" must not collide with another section's title in the same
  root, and it's the string `defaultExpandedSection` and `usePanelExpansion().expandSection` take.
- **Custom sections and swapped controls compose** — the section resolves `TextField` through the
  registry too, so it picks up your design system the moment you add one.
- Styling: target CSS at `[data-graphy-editor-panel]` (`PANEL_ROOT_ATTRIBUTE`), or pass
  `className` on the root — including the `lightTheme`/`darkTheme` classes from
  `@graphysdk/react-renderer` to take over theming.
