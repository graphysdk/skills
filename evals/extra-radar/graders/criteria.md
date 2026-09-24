---
type: llm
weight: 1
---

Pass only if the chart uses `geom.line()` or `geom.area()` under `coord.polar` with x on the angle. Accept `coord.polar({ theta: 'x' })` or a bare `coord.polar()`, since the skill says `'x'` is the default. x must map to the measure (Speed, Quality, Price) and `color` to the product.

Fail if the answer uses a `radar` geom, a radar chart type, or a radar plugin. Also fail if it uses `coord.polar({ theta: 'y' })`, which the skill teaches as a pie.
