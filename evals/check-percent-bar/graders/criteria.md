---
type: llm
weight: 1
---

Pass only if `geom.bar` uses `position: 'fill'`. The bar recipe's percent stacked variant uses `geom.bar({ position: 'fill' })` so every bar fills the full height.

Fail if the answer draws a pie or donut, or if it uses only `position: 'stack'`, including a stack over percentages computed by hand.
