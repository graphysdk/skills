---
type: llm
weight: 1
---

Pass only if the share values are stored as fractions (`0.4`, `0.35`, `0.25`) or as percent strings (`'40%'`, `'35%'`, `'25%'`), and the share column's value format is `percentage`. Fractions need the column to declare `valueFormat: { type: 'percentage' }`. The skill says percent strings are inferred as `percentage`, so for them a declared `valueFormat` is optional.

Fail if the numbers `40`, `35`, and `25` are stored in a column with `valueFormat: { type: 'percentage' }`. Also fail if `40`, `35`, and `25` are stored as plain numbers and the percent sign comes only from `config({ numberFormat: { suffix: '%' } })`.
