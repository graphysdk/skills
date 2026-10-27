# Use your design system

Customize the editor with CSS variables, replacement controls and custom sections. These APIs work with the standard SDK. Controls you omit from the registry keep their built-in implementations.

## 1. Editor tokens

The panel and edit menu use these CSS variables when set, otherwise their defaults. Set shared values on `:root`. Popups have `data-graphy-color-scheme`, which lets you style menus for dark charts separately.

```css
:root {
  --graphy-editor-accent: #0f62fe;
  --graphy-editor-surface: #ffffff;
  --graphy-editor-text: #161616;
  --graphy-editor-font-family: 'Inter', sans-serif;
}
[data-graphy-color-scheme='dark'] {
  --graphy-editor-menu-background: #262626;
  --graphy-editor-menu-text: #f4f4f4;
}
```

## 2. Swap controls

Discrete controls commit each change. Continuous controls call `onChange` during a gesture and `onCommit` once at its end, creating one undo step for the gesture.

```tsx
import type { ControlRegistry, SliderControlProps, SwitchControlProps } from '@graphysdk/react/editable';

// Commit when pointer or keyboard interaction ends, or focus leaves the control.
const HouseSlider = ({
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
  <div className="house-slider">
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
  </div>
);

// Each toggle creates one undo step. Switch controls use checked.
const HouseSwitch = ({ checked, onChange, disabled, ariaLabel, ariaLabelledBy, id }: SwitchControlProps) => (
  <input
    type="checkbox"
    role="switch"
    id={id}
    checked={checked}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    onChange={(event) => onChange(event.target.checked)}
  />
);

export const houseControls: ControlRegistry = {
  Slider: HouseSlider,
  Switch: HouseSwitch,
  // Other controls keep their built-in implementations.
};
```

Wrap the chart and panels in `ControlRegistryProvider` to use the replacement controls in both menus and panels:

```tsx
import { GraphProvider } from '@graphysdk/react';
import {
  BarSection,
  ControlRegistryProvider,
  EditableGraphRenderer,
  EditorPanel,
  GridSection,
} from '@graphysdk/react/editable';

<ControlRegistryProvider controls={houseControls}>
  <GraphProvider spec={spec} data={data} onSpecChange={setSpec}>
    <EditableGraphRenderer mode="edit" />
    <EditorPanel.Root>
      <BarSection />
      <GridSection />
    </EditorPanel.Root>
  </GraphProvider>
</ControlRegistryProvider>;
```

For one panel only, pass `controls={houseControls}` to that `EditorPanel.Root` instead.

## 3. Add a custom section

Build a section with `Section`, `Row`, controls from the registry and the panel's graph handle. Read values from the compiled chart and update them through commands.

```tsx
import { useSyncExternalStore } from 'react';
import {
  BarSection,
  EditorPanel,
  GridSection,
  Row,
  Section,
  useControls,
  usePanelGraph,
} from '@graphysdk/react/editable';
import { SetContentSourceCommand } from '@graphysdk/react/editable';

const SourceLinkSection = () => {
  const graph = usePanelGraph(); // throws outside EditorPanel.Root
  const { TextField } = useControls();

  const scene = useSyncExternalStore(graph.subscribe, graph.getScene);
  const source = scene?.spec.config.content?.source ?? undefined;

  return (
    <Section title="Source link" layout="collapsible" preview={source?.label ?? 'None'}>
      <Row label="Label">
        <TextField
          value={source?.label ?? ''}
          onChange={(label) =>
            graph.commands.dispatch(new SetContentSourceCommand({ source: { ...source, label } }), { transient: true })
          }
          onCommit={graph.commands.commit}
          placeholder="e.g. Company filings"
        />
      </Row>
      <Row label="URL">
        <TextField
          value={source?.url ?? ''}
          onChange={(url) =>
            graph.commands.dispatch(new SetContentSourceCommand({ source: { ...source, url } }), { transient: true })
          }
          onCommit={graph.commands.commit}
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

Details:

- Read the field that the command updates from the compiled chart. This keeps the control in sync with menu edits, agent commands and undo.
- Each keystroke dispatches a transient change; blur commits the typing session as one undo step.
- Section titles identify sections. Use a unique title within each `EditorPanel.Root`.
- Custom sections use replacement controls when they read them through `useControls`.
- Target panel styles with `[data-graphy-editor-panel]` or pass `className` to the root.
