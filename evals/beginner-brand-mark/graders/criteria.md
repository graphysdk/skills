---
type: llm
weight: 1
---

Pass if the spec sets `brandMark.enabled` to false, or `isBrandMarkVisible` to false, or the component imports `GraphProvider` from `@graphysdk/react-renderer`, which leaves the mark off.

Fail if the chart uses `@graphysdk/react` and never turns the mark off.
