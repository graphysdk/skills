# Data

The `Data` object is the only data input. The engine parses it once into a typed dataset (type
inference + value parsing) and re-parses only when you pass a **new object reference** — mutating
in place is invisible.

## Shape

```ts
import type { Data } from '@graphysdk/viz-engine';

const data: Data = {
  columns: [
    { key: 'month' }, // key must match the row keys exactly
    { key: 'revenue', label: 'Revenue ($)' }, // label is the display name in guides/tooltips
  ],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: null }, // null = missing value
  ],
};
```

| Field | Type | Notes |
|---|---|---|
| `columns[].key` | `string` | Unique, stable identifier; the name `mapping()` and transforms use. |
| `columns[].label` | `string?` | Display name. Falls back to `key`. |
| `rows` | `Array<Record<string, DataValue>>` | One object per row; keys match `columns[].key`. |

Those three fields are the whole authorable surface. A column's format cannot be declared — the
data itself is the only lever (see *Type and format inference*). The object and each column also
carry an internal `_metadata` block the editor writes; the engine reads only `_metadata.parsingLocale`
and `columns[]._metadata.isHidden` and ignores the rest.

**Reference columns by `key`, never by `label`.** A label used as a variable name fails with
`UNKNOWN_VARIABLE`. When you didn't author the dataset, read its `columns` array first.

`DataValue = number | string | Date | null`. Strings are fine everywhere — parsing turns `'$1,200'`,
`'12%'`, `'01/02/2022'`, `'2.5k'` into typed values. Cells that are `null`, `undefined`, `''` (or
whitespace), or `'-'` count as empty. Rows whose every cell is empty are dropped.

## Locale

Supported locales: `'en-GB' | 'en-US' | 'ar' | 'pt-PT'`. Two separate settings use them.

| Setting | Where | Default | Governs |
|---|---|---|---|
| parsing locale | `_metadata.parsingLocale` on the data object (host state) | `'en-GB'` | how source cells are read — most importantly numeric date order |
| `config({ parsingLocale })` | the spec | `'en-US'` | display formatting (axes, tooltips, headline, data labels) and value coercion in predicates and annotation anchors |

`formattingLocale` on `GraphProvider` overrides `config({ parsingLocale })` for display only
(`locale = formattingLocale ?? parsingLocale`). Neither spec setting affects cell parsing.

Numeric date order is the trap: `'en-US'` reads `01/02/2022` as Jan 2 (month-day-year);
`'en-GB'`, `'pt-PT'`, `'ar'` read it as Feb 1 (day-month-year). The other orders are tried as
fallbacks only when the primary one fails. Since the parsing locale is not on the public `Data`
type, hand numeric-separated dates over in an unambiguous form (`'2022-02-01'`, `'Feb 1, 2022'`,
`Date` objects).

## Type and format inference

Per column, the engine:

1. Skips the column if `_metadata.isHidden` is set, or drops it if it has no non-empty cell.
2. **Year pass** — scans the first 5 non-empty rows of every column. The first column whose ≥ 2
   non-empty values there all read as years 1900–2199 (strings must be whole numbers; numeric cells
   only need to fall in range) becomes `{ type: 'year' }` (temporal). At most one column per dataset
   wins this pass.
3. Otherwise the **first non-empty cell alone** decides the column's `ValueFormat`, tried in order:
   number → date string (an ISO-8601 datetime string gives `datetime`) → weekly date range
   (`'Jan 1 – Jan 7'`, ends 6 days apart, 5 across a possible leap day) → `Date` object → percentage (`'12%'`) →
   currency (`'$5'`, `'€5'`, …) → `text` (catch-all).
4. Every cell in the column is then parsed with that one format. **Cells that don't fit become
   `null` silently** — no error.

Parsing details:

- Numbers accept thousands separators and magnitude suffixes: `'1,200'` → 1200, `'2.5k'` → 2500,
  also `m`, `b`, `t`. A unix timestamp is a number, so it stays `decimal`.
- Percentages are stored as fractions: `'12%'` → `0.12`. Only percent **strings** infer the
  percentage format — bare fractions (0.12) infer `decimal` and render as plain numbers. Inside a
  percentage column a bare numeric cell passes through unscaled (`12` renders "1200%"), so don't mix
  bare numbers into a percent-string column.
- Currency is recognised by symbol only, adjacent to the number at the start or end (`'$5'`, `'-$5'`,
  `'5€'`; not `'5 €'` or `'USD 5'`); the symbol sets the format's `iso` (e.g. `'usd'`).
- Dates become UTC `Date` objects. `'2022-02'` and `'February 2022'` parse as month + year; `'Q1 2022'`
  as a quarter; bare `'February'`/`'Feb'` as a month with no year; `'February 1, 2022'`, `'1 Feb 2022'`
  and `/`, `-`, `.` separated forms all parse. A `Date` object infers `date`; only an ISO-8601 datetime
  string infers `datetime`.

### Chronological years for year-less dates

A temporal column whose format carries no year — `month`, `day_month`, `weekly_date_range` — gets
synthetic years assigned by the compiler, so the values sort as a sequence rather than collapsing
onto one calendar year.

The rule: walk the column **in row order**, starting from the year the first value parsed with (the
current calendar year). Whenever a value sorts before its predecessor (compared on month/day, year
ignored), bump the year. Each **group** — the explicit `group` aesthetic if mapped, else the
combination of the categorical visual aesthetics (`color`, `size`, `alpha`, `strokeWidth`, `lineType`)
— runs its own sequence; ungrouped rows share one. The pass runs per layer, after grouping, so two
layers grouped differently can assign different years to the same rows.

What follows:

- `Jan, Feb, … Dec, Jan, Feb` reads as fourteen consecutive months across two years.
- The same month repeated across two series stays aligned on the axis, because each series restarts
  the sequence.
- Row order is the input order — sort the rows the way you want the axis read. Reordering rows
  changes the assigned years.

## ValueFormat

The inferred per-column format descriptor. It travels with the variable through the pipeline: the
compiler tags axes, legends, tooltips and headline figures with it, and the renderer turns value +
format + locale into the display string. You never format values yourself — control display by
controlling what the data parses as (plus `config({ numberFormat })` for decimals, abbreviation,
prefix and suffix).

| `type` | Data type | Rendered example (en-US) |
|---|---|---|
| `decimal` | numeric | `1,234.5` |
| `integer` | numeric | `1,235` — produced by a `count` aggregation, never inferred from raw data |
| `percentage` | numeric | `0.12` → `12%` |
| `currency` (+ `iso`) | numeric | `$1,234.50` |
| `duration` | numeric (ms) | `1h 5m` — never inferred; always rendered in English |
| `text` | categorical | passed through |
| `date` | temporal | `Jan 5, 2025` |
| `datetime` | temporal | `Jan 5, 2025 • 14:30:00` |
| `time` | temporal | `14:30` |
| `year` | temporal | `2025` |
| `quarter` | temporal | `Q1 2025` |
| `month` | temporal | `January` |
| `month_year` | temporal | `Jan 2025` |
| `day_month` | temporal | `January 5` |
| `weekly_date_range` | temporal | `January 5 – 11` |
| `weekly_date_range_with_year` | temporal | `Jan 5 – 11, 2025` |
| `lookup` | per observation | `{ byVariable, cases, fallback }` — one format per source column after a mixed-format reshape (below) |

So a revenue column supplied as `'$1,200'` strings gets a currency-formatted y-axis and tooltip for
free; the same column as bare numbers renders as plain decimals.

## Long data vs `transform.reshape`

Geoms want **long** data: one observation per row, with a categorical column to split series on.

**Already long — map the series column directly:**

```ts
const data = {
  columns: [{ key: 'month' }, { key: 'region' }, { key: 'sales' }],
  rows: [
    { month: 'Jan', region: 'North', sales: 120 },
    { month: 'Jan', region: 'South', sales: 90 },
    { month: 'Feb', region: 'North', sales: 140 },
    { month: 'Feb', region: 'South', sales: 100 },
  ],
};
const input = pipe(createSpec(), mapping({ x: 'month', y: 'sales', color: 'region' }), geom.line(), scale.x(), scale.y());
```

**Wide (one column per series) — reshape first:**

```ts
import { createSpec, pipe, mapping, geom, scale, transform } from '@graphysdk/viz-engine';

const data = {
  columns: [{ key: 'month' }, { key: 'north' }, { key: 'south' }],
  rows: [
    { month: 'Jan', north: 120, south: 90 },
    { month: 'Feb', north: 140, south: 100 },
  ],
};

const input = pipe(
  createSpec(),
  transform.reshape({ reshape: ['north', 'south'], keyName: 'region', valueName: 'sales' }),
  mapping({ x: 'month', y: 'sales', color: 'region' }),
  geom.line(),
  scale.x(),
  scale.y()
);
```

`transform.reshape(options)` collapses numeric columns into two new variables:

| Option | Default | Meaning |
|---|---|---|
| `reshape` | numeric variables not named in `keep` | Columns to collapse into rows. Numeric only — reshaping a categorical/temporal column is an error. |
| `keep` | all categorical/temporal variables | Columns carried through unchanged. |
| `keyName` | `'key'` | New categorical column holding the source column names. Must not collide with a kept column. |
| `valueName` | `'value'` | New numeric column holding the values. Same collision rule. |

With all defaults, `transform.reshape()` melts every numeric column and keeps the rest — often
exactly right for a wide table. If the source columns share a format (all currency), the value
column keeps it; if they differ, the value column gets a `lookup` format keyed on `keyName`, so each
series still displays in its own format (a `lookup` column cannot be reshaped again). A mixed-format value column is still one axis holding two
units, so observations across it are not comparable — an `annotation.differenceArrow` spanning them
compiles with an `INCOMPARABLE_ARROW_ENDPOINTS` warning (`reference/storytelling.md`).

## Gotchas

- **Month names are dates, not categories.** A column of `'Jan'`, `'Feb'`, … infers as temporal
  `month`; each cell becomes a real date and picks up a synthetic year in row order. A stray
  non-month cell like `'Total'` becomes `null` — filter summary rows out before charting. Short and
  long forms (`'Feb'`/`'February'`) can be mixed.
- **Mixed-type columns fail silently.** Only the first non-empty cell picks the format.
  `['12', 'n/a', '15']` keeps two values; `['n/a', '12', '15']` makes the whole column `text`.
- **Bare 4-digit numbers are decimals, not years** — unless the column passes the year pass (its
  first 5 non-empty rows hold ≥ 2 values in 1900–2199). A y-axis over 2020–2023 then shows `2,020`.
- **Inference cannot read intent, and there is no declaration.** A count column whose first rows sit
  in 1900–2199 (headcount 2010, 2050) is read as years; digit-string ids meant as categories infer
  as numbers. Fix the data: put a non-year value in the first rows, or prefix ids so the first cell
  reads as text. A year column belongs on `scale.x.datetime()`; `scale.x.continuous()` over it fails
  with `INCOMPATIBLE_TYPE`.
- **Numeric dates depend on locale.** `'01/02/2022'` flips month/day between `'en-US'` and the
  `'en-GB'` parsing default. Unambiguous forms are locale-proof.
- **Column keys must match row keys exactly.** A `columns` entry whose key appears in no row is
  dropped, and mapping to it fails downstream.
- **`'-'` means empty**, not a minus sign or a category.
