# Tabbed editor with the built-in panel

Place a chart in point and edit mode beside the built-in panel. Add tabs to group panel sections and a list of recent edits. See the panel reference for supported edits and limitations.

```tsx
import { useRef, useState } from 'react';
import {
  GraphProvider,
  useGraphHistory,
  useGraphHistoryShortcuts,
  type Data,
  type GraphHandle,
  type Spec,
} from '@graphysdk/react';
import {
  AppearanceSection,
  AxisSection,
  BarSection,
  CalloutsSection,
  CaptionSection,
  ComboSection,
  EditableGraphRenderer,
  EditorPanel,
  GoalSection,
  GraphOptionsSection,
  GraphTypeSection,
  GridSection,
  HeadlineSection,
  LegendSection,
  LineSection,
  MappingSection,
  NumberFormatSection,
  PointSection,
  PolarSection,
  SourceSection,
  SubtitleSection,
  TextSizeSection,
  TitleSection,
  TrendsAndAveragesSection,
} from '@graphysdk/react/editable';

// The host owns the tab bar. The SDK owns the panel root and the sections.
const TABS = [
  {
    id: 'graph',
    label: 'Graph',
    sections: (
      <>
        <GraphTypeSection />
        <ComboSection />
        <MappingSection />
        <GraphOptionsSection />
        <GridSection />
        <HeadlineSection />
        <LegendSection />
        <NumberFormatSection />
      </>
    ),
  },
  {
    id: 'fine-tune',
    label: 'Fine tune',
    sections: (
      <>
        <AxisSection axis="x" />
        <AxisSection axis="y" />
        <PolarSection />
        <BarSection />
        <LineSection />
        <PointSection />
      </>
    ),
  },
  { id: 'design', label: 'Design', sections: <AppearanceSection /> },
  {
    id: 'annotate',
    label: 'Annotate',
    sections: (
      <>
        <CalloutsSection />
        <TitleSection />
        <SubtitleSection />
        <CaptionSection />
        <SourceSection />
        <GoalSection />
        <TrendsAndAveragesSection />
      </>
    ),
  },
  { id: 'size', label: 'Size', sections: <TextSizeSection /> },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TabbedPanel = () => {
  const [selected, setSelected] = useState<TabId>('graph');
  const tab = TABS.find((candidate) => candidate.id === selected) ?? TABS[0];
  return (
    <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
      <div role="tablist" style={{ display: 'flex', gap: 4 }}>
        {TABS.map((candidate) => (
          <button
            key={candidate.id}
            role="tab"
            aria-selected={candidate.id === selected}
            onClick={() => setSelected(candidate.id)}
            style={{ fontWeight: candidate.id === selected ? 700 : 400 }}
          >
            {candidate.label}
          </button>
        ))}
      </div>
      {/* Reset expanded sections when switching tabs. */}
      <EditorPanel.Root key={tab.id}>{tab.sections}</EditorPanel.Root>
    </div>
  );
};

const HistoryTrail = () => {
  const { undoStack } = useGraphHistory();
  return (
    <ol>
      {undoStack
        .slice(-5)
        .reverse()
        .map((entry) => (
          <li key={entry.id}>{entry.description}</li>
        ))}
    </ol>
  );
};

export function ChartEditor({ data, initialSpec }: { data: Data; initialSpec: Spec }) {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  return (
    <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={setSpec}>
      <div style={{ display: 'flex', gap: 16, height: 'calc(100dvh - 2rem)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EditableGraphRenderer mode="point-and-edit" />
          </div>
          <HistoryTrail />
        </div>
        <TabbedPanel />
      </div>
    </GraphProvider>
  );
}
```

Details:

- The panel reads the chart from the enclosing provider; it needs no `handle` prop or per-section setup. The host only stores the selected tab as panel state.
- Canvas and panel edits share the same chart and history.
- The host defines the tabs, their appearance and their sections. The SDK provides `EditorPanel.Root` and the sections.
- `key={tab.id}` closes all sections when switching tabs. Set `defaultExpandedSection` to open a section by default.
- Sections hide when they do not apply. For example, `PolarSection` is hidden on Cartesian charts, and `ComboSection` is hidden outside combo charts. You can mount all sections and let each check the chart.
- The history list reads `undoStack`. Each drag or typing session creates one entry.
- Panel edits call `onSpecChange`, so they use the same persistence callback as point and edit.

To mount the panel outside the provider, such as in a drawer or another React root, pass the handle from `handleRef`. See the panel reference.
