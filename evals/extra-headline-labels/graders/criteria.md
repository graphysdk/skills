---
type: llm
weight: 1
---

Pass only if the spec sets `config({ headline: { show: 'total' } })` and the bar layer turns labels on with `geom.bar({ dataLabels: { showDataLabels: true } })`.

Fail if the total is only an HTML heading or element outside the spec, or only text in `content.title` or `content.subtitle`. Also fail if data labels are not turned on in the bar geom.
