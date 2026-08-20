# Full tabbed editor (pre-built panel)

A complete editor layout: chart on the left, the pre-built panel on the right, host-owned tabs
grouping the sections, a history trail. Reach for it when you want the whole panel; what the panel
can and can't edit is in `reference/panel.md`.

```tsx
import { useRef, useState, type ReactNode } from 'react';
import {
  GraphProvider, useGraphHistory, useGraphHistoryShortcuts, type GraphHandle,
} from '@graphysdk/react-renderer';
import {
  EditableGraphRenderer, EditorPanel,
  GraphTypeSection, GraphOptionsSection, GridSection, HeadlineSection, LegendSection,
  NumberFormatSection, AxisSection, PolarSection, BarSection, LineSection, PointSection,
  AppearanceSection, CalloutsSection, TitleSection, SubtitleSection, CaptionSection,
  SourceSection, GoalSection, TrendsAndAveragesSection, TextSizeSection,
} from '@graphysdk/react-renderer/editable';
import type { Data, SpecInput } from '@graphysdk/viz-engine';

// The host owns the tab bar entirely; the SDK owns the panel root and sections.
const TABS = [
  { id: 'graph', label: 'Graph', sections: (
      <>
        <GraphTypeSection />
        <GraphOptionsSection />
        <GridSection />
        <HeadlineSection />
        <LegendSection />
        <NumberFormatSection />
      </>
  ) },
  { id: 'fine-tune', label: 'Fine tune', sections: (
      <>
        <AxisSection axis="x" />
        <AxisSection axis="y" />
        <PolarSection />
        <BarSection />
        <LineSection />
        <PointSection />
      </>
  ) },
  { id: 'design', label: 'Design', sections: <AppearanceSection /> },
  { id: 'annotate', label: 'Annotate', sections: (
      <>
        <CalloutsSection />
        <TitleSection />
        <SubtitleSection />
        <CaptionSection />
        <SourceSection />
        <GoalSection />
        <TrendsAndAveragesSection />
      </>
  ) },
  { id: 'size', label: 'Size', sections: <TextSizeSection /> },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TabbedPanel = () => {
  const [selected, setSelected] = useState<TabId>('graph');
  const tab = TABS.find((t) => t.id === selected) ?? TABS[0];
  return (
    <div style={{ inlineSize: 360, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
      <div role="tablist" style={{ display: 'flex', gap: 4 }}>
        {TABS.map((t) => (
          <button
            key={t.id} role="tab" aria-selected={t.id === selected}
            onClick={() => setSelected(t.id)}
            style={{ fontWeight: t.id === selected ? 700 : 400 }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Keyed remount: each tab opens on its own default section rather than inheriting the last. */}
      <EditorPanel.Root key={tab.id}>{tab.sections}</EditorPanel.Root>
    </div>
  );
};

const HistoryTrail = () => {
  const { undoStack } = useGraphHistory();
  return (
    <ol>
      {undoStack.slice(-5).reverse().map((entry) => (
        <li key={entry.id}>{entry.description}</li>
      ))}
    </ol>
  );
};

export function ChartEditor({ data, initialSpec }: { data: Data; initialSpec: SpecInput }) {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  return (
    <GraphProvider input={spec} data={data} handleRef={handleRef} onChange={setSpec}>
      <div style={{ display: 'flex', gap: 16, blockSize: 'calc(100dvh - 2rem)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minInlineSize: 0 }}>
          <div style={{ flex: 1, minBlockSize: 0 }}>
            <EditableGraphRenderer mode="editable" />
          </div>
          <HistoryTrail />
        </div>
        <TabbedPanel />
      </div>
    </GraphProvider>
  );
}
```

What to notice:

- **No spec state in the panel.** The panel binds to the enclosing provider through context — no
  `handle` prop needed here, no `onChange` wiring per section. The host's only editor state is the
  selected tab.
- **Tabs are yours.** Which sections group under which tab, the tab bar's markup and styling — all
  host-owned. The SDK draws the line at `EditorPanel.Root`.
- **`key={tab.id}` is deliberate.** Remounting the root per tab makes each tab open fresh
  (`defaultExpandedSection` applies per mount); without it, the accordion state leaks across tabs.
- **Sections hide themselves when irrelevant.** `PolarSection` renders nothing on a non-polar
  chart, `LineSection` nothing without a line or area layer — mount the full set and let the chart
  decide.
- **The history trail reads `undoStack`** (entries are `{ id, description, timestamp, author }`).
  One drag or one typed title shows as one entry, because gestures seal into single commands.
  To offer "jump back three steps", loop single `undo()` calls — the stack moves one command at a
  time.
- Everything the panel edits also lands in `onChange` — the same `setSpec` persistence as the
  minimal embed.

Mounting the panel **outside** the provider (a drawer, another root) needs two extras — `handle`
and the editing `IntlProvider` — see `reference/panel.md`.
