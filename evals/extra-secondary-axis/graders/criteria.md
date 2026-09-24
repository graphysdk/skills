---
type: llm
weight: 1
---

Pass only if the orders line layer sets `yScaleType: 'secondary'` and the revenue bars stay on the primary y scale. `scale.ySecondary()` is optional because the skill says it is added when a layer asks for it.

Note: the local skill binds a layer to the second axis with `yScaleType: 'secondary'`. `config({ axes: { ySecondary } })` only labels and places that axis, so on its own it does not count.

Fail if both series share one y scale with no secondary axis. This includes an answer that sets `config({ axes: { ySecondary } })` or declares `scale.ySecondary()` but leaves the line on the primary scale.
