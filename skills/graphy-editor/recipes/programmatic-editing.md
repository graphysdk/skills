# Programmatic editing

Edit through commands from a toolbar outside the provider, a script or an agent. These edits use the same undo history and `onSpecChange` callback as edits made in the chart.

```tsx
import { useRef, useState } from 'react';
import { GraphProvider, type Data, type GraphHandle, type Spec } from '@graphysdk/react';
import { EditableGraphRenderer } from '@graphysdk/react/editable';
import {
  AddHighlightCommand,
  SequenceCommand,
  SetBarWidthCommand,
  SetContentTitleCommand,
  SetLegendPositionCommand,
  SetStatLineCommand,
  commandRegistry,
  type SerializedCommand,
} from '@graphysdk/react/editable';

export function DrivenChart({ data, initialSpec }: { data: Data; initialSpec: Spec }) {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);

  // Dispatching separately creates four undo steps.
  const polish = () => {
    const handle = handleRef.current;
    if (!handle) return;
    const { dispatch } = handle.commands;
    dispatch(new SetContentTitleCommand({ title: 'Revenue by quarter' }));
    dispatch(new SetLegendPositionCommand({ position: 'bottom' }));
    dispatch(new SetStatLineCommand({ line: 'average', label: 'Average' }));
    dispatch(new AddHighlightCommand({ predicate: { variable: 'quarter', eq: 'Q4' }, scope: 'xValue' }));
  };

  // Group commands to create one undo step.
  const polishAtOnce = () => {
    handleRef.current?.commands.dispatch(
      new SequenceCommand({
        commands: [
          new SetContentTitleCommand({ title: 'Revenue by quarter' }),
          new SetLegendPositionCommand({ position: 'bottom' }),
        ],
      })
    );
  };

  // Send transient changes, then commit once for one undo step.
  const animateBarWidth = (frames: number[]) => {
    const handle = handleRef.current;
    if (!handle) return;
    for (const width of frames) {
      handle.commands.dispatch(new SetBarWidthCommand({ width }), { transient: true });
    }
    handle.commands.commit();
  };

  // Apply serialized commands received from an agent.
  const applyFromWire = (payloads: SerializedCommand[]) => {
    const handle = handleRef.current;
    if (!handle) return;
    for (const payload of payloads) {
      handle.commands.dispatch(commandRegistry.deserialize(payload));
    }
  };

  // Serialize a command for transmission, for example from an agent.
  const wire: SerializedCommand = commandRegistry.serialize(
    new SetContentTitleCommand({ title: 'Q4 update' }, { author: 'agent' })
  );
  void wire;
  void polish;
  void polishAtOnce;
  void animateBarWidth;
  void applyFromWire;

  return (
    <div style={{ height: 400 }}>
      <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={setSpec}>
        <EditableGraphRenderer mode="readonly" />
      </GraphProvider>
    </div>
  );
}
```

Read chart state outside the provider:

```tsx
import { useHandleScene, type GraphHandle } from '@graphysdk/react';

const LayerList = ({ handle }: { handle: GraphHandle }) => {
  const scene = useHandleScene(handle); // null before the first compile
  if (!scene) return null;
  return (
    <ul>
      {scene.layers.map((layer) => (
        <li key={layer.id}>{layer.geom}</li>
      ))}
    </ul>
  );
};
```

Details:

- Agent commands and user edits share one history. `useGraphHistory()` stack entries include `metadata.author` and `description`.
- Add commands generate IDs when constructed. Replaying a serialized command uses the same object ID rather than creating another object.
- A command does nothing if its value is already set, so agents can resend commands without checking that value first.
- If a command produces a result that fails to compile, `onError` reports the failure and the last valid chart remains visible.
- Commands work in `readonly` mode. `mode` controls canvas interactions; use `edit` to let users edit by clicking the chart.
