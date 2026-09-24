---
type: llm
weight: 1
---

Pass only if the chart uses `geom.line({ params: { missingValues: 'gap' } })` and March stays in the data as a row whose visits value is missing (`null`, an empty string, or `'-'`). The skill says `'gap'` breaks the line at the missing observation, so the March row must be there.

Fail if `missingValues` is `'zero'` or `'connect'`, or if the March row is dropped with no `missingValues` setting. Also fail if the chart uses `geom.area`. The skill says an area turns `'gap'` into `'zero'`.
