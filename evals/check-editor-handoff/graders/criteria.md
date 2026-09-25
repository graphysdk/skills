---
type: llm
weight: 1
---

Pass if the answer sends editing to the `graphy-editor` skill and uses `EditableGraphRenderer` from either `@graphysdk/react/editable` or `@graphysdk/react-renderer/editable`. The editor skill's own example still imports the react-renderer entry.

Fail if the answer builds an editor from scratch with graphy-charts alone, for example a plain `GraphRenderer` with hand-made undo, and never uses an editable entry.
