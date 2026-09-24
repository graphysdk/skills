---
type: llm
weight: 1
---

Pass only if the price column declares `valueFormat` with `type: 'currency'` and `iso: 'eur'`.

Fail if the only formatting is `config({ numberFormat })` with no currency column format.
