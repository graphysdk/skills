---
type: llm
weight: 1
---

Pass only if the spec calls `highlight()` with a predicate that matches product `Alpha` and the option `{ scope: 'series' }`, and all three products stay in the data.

Fail if the chart is filtered down to Alpha, with `transform.filter` or by dropping rows. Also fail if there is no `highlight()` with `scope: 'series'`. The skill says a highlight without it only marks points on a line and dims nothing.
