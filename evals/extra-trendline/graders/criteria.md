---
type: llm
weight: 1
---

Pass only if the points are a `geom.point()` layer and the trend is a separate layer that uses the smooth stat: `stat: stat.smooth({ method })` or the shorthand `stat: 'smooth'`. The skill draws this layer with `geom.line`.

Fail if the trend is drawn with an annotation (arrow, shape, or text), a `geom.rule`, or a second `geom.point` layer. Also fail if it is a line over fitted values computed by hand instead of the smooth stat.
