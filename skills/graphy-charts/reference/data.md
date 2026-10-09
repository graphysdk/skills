# Data

Contents

- Data shape
- Column types and value formats
- Declaring a column's value format
- Numbers
- Dates
- Parsing locale and formatting locale
- Missing values
- Wide and long data
- From data type to scale
- Loading files with data-import-utils
- Pitfalls

## Data shape

Data is a table: a list of columns and a list of rows. Every row is an object keyed by column key.

```ts
import type { Data } from '@graphysdk/react';

const data: Data = {
  columns: [{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue' }, { key: 'region' }],
  rows: [
    { month: '2024-01', revenue: 1200, region: 'North' },
    { month: '2024-02', revenue: 1350, region: 'North' },
    { month: '2024-01', revenue: 980, region: 'South' },
  ],
};
```

A cell is a `number`, a `string`, a `Date`, or `null`. The spec maps a column by `key`: `createSpec({ x: 'month', y: 'revenue', color: 'region' })`.

`label` is display text. Legends and tooltips show it and fall back to the key. An axis title is `config({ axes: { x: { label } } })` when set, else the column's `label`, else no title.

Only columns listed in `columns` are read. Extra keys on a row are ignored.

Exact types: types.md § Core & data.

## Column types and value formats

Every column gets one of three data types: numeric, temporal, or categorical. The type comes from the column's value format. The value format is inferred from the first non-empty cell in the column, and the whole column is parsed with it.

Inference checks, in order:

1. A number, or a string that reads as a number (`'1,234.5'`, `'12k'`): `decimal`.
2. A string that matches a date format for the parsing locale: `date`, `month_year`, `quarter`, `day_month`, `month`, `year`, or `datetime`.
3. A weekly range such as `'Jan 1 – Jan 7'`: `weekly_date_range`, or `weekly_date_range_with_year` when both parts carry a year.
4. A `Date` object: `date`.
5. A string ending in `%`: `percentage`.
6. A string starting or ending with a currency symbol (`'$1,200'`, `'€45'`): `currency`.
7. Anything else: `text`.

One check runs first. The first column with no declared format whose cells in the first five non-empty rows are all four-digit years (1800 to 2199) becomes a `year` column, so `2021, 2022, 2023` reads as time, not as a number. It needs at least two such cells, and it is skipped when any column declares `{ type: 'year' }`. Declaring that column as `integer` keeps it numeric but does not stop the check on other columns. A column with no non-empty cell is dropped.

```ts
import type { Data } from '@graphysdk/react';

const data: Data = {
  columns: [{ key: 'year' }, { key: 'growth' }, { key: 'sales' }, { key: 'team' }],
  rows: [
    { year: 2022, growth: '4.5%', sales: '$1,200', team: 'Ops' },
    { year: 2023, growth: '5.1%', sales: '$1,450', team: 'Ops' },
  ],
};
// year: temporal (year), growth: numeric (percentage, stored as 0.045),
// sales: numeric (currency usd, stored as 1200), team: categorical (text)
```

The data type decides how the column is placed and scaled. The value format decides how its values are written in axes, tooltips, and labels (`0.045` shows as `4.5%`, `1200` as `$1,200`).

## Declaring a column's value format

Set `valueFormat` on a column to skip inference. Use it when the first cell is misleading or when a plain number should be shown in a specific way.

```ts
import type { Data } from '@graphysdk/react';

const data: Data = {
  columns: [
    { key: 'code', valueFormat: { type: 'text' } },
    { key: 'price', valueFormat: { type: 'currency', iso: 'eur' } },
    { key: 'share', valueFormat: { type: 'percentage' } },
    { key: 'day', valueFormat: { type: 'date', dateFormat: 'MM/dd/yyyy' } },
  ],
  rows: [
    { code: '0042', price: 19.9, share: 0.31, day: '02/01/2024' },
    { code: '0043', price: 24.5, share: 0.12, day: '02/15/2024' },
  ],
};
```

- `{ type: 'text' }` keeps digit strings such as postcodes or IDs categorical.
- `{ type: 'currency', iso }` formats bare numbers as money. `iso` is a lower-case three-letter code (`'usd'`, `'gbp'`, `'eur'`, ...).
- `{ type: 'percentage' }` takes fractions: `0.31` shows as `31%`.
- A temporal format takes an optional `dateFormat`, a date-fns pattern the strings are parsed with. Use it for dates the parsing locale would read in the wrong order.
- `{ type: 'integer' }`, `{ type: 'decimal' }`, and `{ type: 'duration' }` (milliseconds) are the other numeric formats. `{ type: 'time' }` is the temporal format for a time of day.

A cell that does not fit the declared format becomes `null`. The format list is `ExplicitValueFormat` in types.md § Supporting types.

## Numbers

Numeric cells can be numbers or strings. Strings may carry thousands separators, a sign, and a `k`, `m`, `b`, or `t` suffix: `'1,250'`, `'-3.5'`, `'12k'` become `1250`, `-3.5`, `12000`. `'12.5%'` becomes `0.125`. `'$1,200'` becomes `1200`, and the symbol sets the column's currency. The symbol may sit at the start or the end.

Prefer real numbers in rows when you control the data. Strings are for data from files and spreadsheets.

## Dates

Temporal cells can be `Date` objects, ISO strings (`'2024-02-01T00:00:00Z'` reads as `datetime`), or dates written the way people write them. Recognized string shapes, with `/`, `-`, `.`, or a space as separator:

- Day, month, and year in the parsing locale's order: `'01/02/2024'`, `'1 February 2024'`, `'February 1, 2024'`.
- Month and year: `'February 2024'`, `'2024-02'`.
- Quarter: `'Q1 2024'`.
- Day and month without a year: `'1 February'`, `'February 1'`.
- Month only: `'February'` or `'Feb'`.
- Bare years: `'2024'` or `2024` (see the year check above).

Short and long month names both work. Dates are parsed to UTC and shown in UTC. The first non-empty cell fixes one format for the column; cells in another format become `null`.

A format with no year (`month`, `day_month`, `weekly_date_range`) is shown without a year. To order such values, the engine gives them a synthetic year: it walks the column in row order, one sequence per group, starting in the current year, and moves to the next year each time a date falls earlier in the year than the one before it. `Jan … Dec, Jan, Feb` reads as 14 months in a row. Reordering the rows moves the axis.

## Parsing locale and formatting locale

Two locales are involved, and they default differently.

The parsing locale decides how an ambiguous string is read. `'01/02/2024'` is 1 February in `en-GB` and 2 January in `en-US`. Rows are parsed day-first (`en-GB`). The field that changes it, `data._metadata.parsingLocale`, is internal and not in the published `Data` type. For month-first strings do one of these instead:

- Pass `Date` objects or ISO strings. They read the same in every locale.
- Declare the column with a `dateFormat`: `{ type: 'date', dateFormat: 'MM/dd/yyyy' }`.

The formatting locale decides how axis ticks, tooltips, legends, and labels are written: decimal and thousands separators, month names, currency symbols. It is `formattingLocale` on `GraphProvider` when set, else `config({ parsingLocale })` from the spec, which defaults to `'en-US'`.

```tsx
import { GraphProvider, GraphRenderer, config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: '2024-01', revenue: 1200.5 },
    { month: '2024-02', revenue: 1350.25 },
  ],
};

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.line(),
  scale.x(),
  scale.y(),
  config({ parsingLocale: 'pt-PT' })
);

export function PortugueseGraph() {
  return (
    <GraphProvider data={data} spec={spec} formattingLocale="pt-PT">
      <GraphRenderer />
    </GraphProvider>
  );
}
```

`config({ parsingLocale })` reads the values written inside the spec: a date in a highlight predicate or an annotation anchor. It does not change how a data cell is read. Set it to match the data when the two differ.

Supported locales: `'en-GB'`, `'en-US'`, `'pt-PT'`, `'ar'`. Durations always format in English.

## Missing values

`null`, `undefined`, an empty or whitespace-only string, and `'-'` read as missing and become `null`. A row where every cell is missing is dropped.

How a missing value is drawn depends on the geom. Lines and areas take a `missingValues` param:

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';

const gapLine = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.line({ params: { missingValues: 'gap' } }),
  scale.x(),
  scale.y()
);

const bridgedLine = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.line({ params: { missingValues: 'connect' } }),
  scale.x(),
  scale.y()
);
```

- `'gap'` breaks the line at the missing observation. Default for lines.
- `'connect'` skips the missing observation and joins its neighbors.
- `'zero'` draws the missing observation as zero. Default for areas. An area asked for `'gap'` draws `'zero'`, since a stack cannot hold a gap.

Bars and points have no `missingValues` param.

## Wide and long data

A table with one column per group (per region, per year, per product) is wide data. The mapping works on long data, where one column holds the group name and one holds the value. `transform.reshape` folds wide numeric columns into two long ones.

```ts
import { createSpec, geom, mapping, pipe, scale, transform } from '@graphysdk/react';

const wide = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }],
  rows: [
    { month: 'Jan', North: 120, South: 95 },
    { month: 'Feb', North: 150, South: 110 },
  ],
};

const spec = pipe(
  createSpec(),
  transform.reshape({ keep: ['month'], reshape: ['North', 'South'], keyName: 'region', valueName: 'revenue' }),
  mapping({ x: 'month', y: 'revenue', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y()
);
```

Every option is optional. By default all categorical and temporal columns are kept, all numeric columns are folded, and the new columns are named `key` and `value`. When the folded columns had different value formats (one currency, one percentage), the value column keeps them per observation, so tooltips format each group its own way.

`mapping(...)` and `createSpec({ x, y, color })` build the same spec; item order does not matter. The transform fails with `INVALID_DATA_SHAPE` when a folded column is not numeric, or when `keep` contains `keyName` or `valueName`.

## From data type to scale

`scale.x()`, `scale.y()`, and `scale.ySecondary()` with no arguments infer the scale kind from the mapped column's data type. A color scale is added for you when none is declared: a palette by default, or one inferred from the column under a tile. Declare `scale.color.continuous()`, `scale.color.discrete()`, or `scale.color.palette()` to choose.

- numeric position: continuous.
- categorical position: band (one slot per distinct value).
- temporal position: datetime, with date-aware ticks.

Geoms can override this. A bar's main axis is always a band, even for numbers or dates, so `geom.bar()` with a numeric `x` places one bar per distinct value. A `scale.x.continuous()` under a bar is replaced by a band with an `UNSUPPORTED_SCALE_TYPE` warning. A tile needs bands on both axes. A bar or area holds zero on its value axis, so a `domainMin` above zero gives way with a warning. An undeclared `x` or `y` scale raises no diagnostic; the geom is just not placed.

To force a kind, call the typed builder: `scale.x.datetime()`, `scale.x.discrete()`, `scale.y.log()`. Options such as `domainMin` and `reverse` work on the inferred form too: `scale.y({ domainMin: 0 })`. See spec.md § Scales.

## Loading files with data-import-utils

`@graphysdk/data-import-utils` turns CSV, TSV, JSON, and spreadsheet files into the `{ columns, rows }` shape. The delimited and spreadsheet parsers generate column keys `c1`, `c2`, ... and put the header text into `label`. A spec maps the generated keys, or looks a key up by label. `hasHeader` (default `true`) says whether the first row is the header.

```ts
import { fromCSV } from '@graphysdk/data-import-utils/csv';
import { createSpec, geom, pipe, scale } from '@graphysdk/react';

const data = fromCSV('Month,Revenue\nJan,120\nFeb,150');
// data.columns: [{ key: 'c1', label: 'Month' }, { key: 'c2', label: 'Revenue' }]

const revenueKey = data.columns.find((column) => column.label === 'Revenue')?.key ?? 'c2';
const spec = pipe(createSpec({ x: 'c1', y: revenueKey }), geom.bar(), scale.x(), scale.y());
```

Those parsers turn numeric strings into numbers at import. The `locale` option (`'EN_US'`, `'EN_GB'`, `'PT_PT'`, `'AR'`, default `'EN_US'`) picks the thousands and decimal separators. Spreadsheet dates come back as ISO strings and booleans as `1` or `0`. Everything else stays a string, and the graph infers types from there as above.

`fromJSON` is different. It accepts a JSON string, an array of row objects (columns are the union of keys, in first-seen order), or a `{ columns, rows }` table. Keys are kept as they are, `locale` is ignored, strings and numbers pass through, booleans become `'true'` or `'false'`, and nested values are stringified.

Imported columns are typed `{ key, label? }` and carry no `valueFormat`. To add one, map them into new column objects typed as the graph's `Data`:

```ts
import { fromCSV } from '@graphysdk/data-import-utils/csv';
import type { Data } from '@graphysdk/react';

const imported = fromCSV('Code,Price\n0042,19.9\n0043,24.5');

const data: Data = {
  columns: imported.columns.map((column) =>
    column.label === 'Code' ? { ...column, valueFormat: { type: 'text' } } : column
  ),
  rows: imported.rows,
};
```

Each format has its own subpath so only its parser is bundled. The root entry exports types only.

```ts
import { fromXLSX } from '@graphysdk/data-import-utils/xlsx';
import { fromJSON } from '@graphysdk/data-import-utils/json';
import { fromText } from '@graphysdk/data-import-utils/text';
import { fromBuffer } from '@graphysdk/data-import-utils/buffer';
import { fromFile } from '@graphysdk/data-import-utils/file';
import { fromURL } from '@graphysdk/data-import-utils/url';

const fromSheet = await fromXLSX(buffer, { sheet: 'Revenue' });
const fromJsonText = fromJSON('[{ "month": "Jan", "revenue": 120 }]');
const fromAnyText = fromText(csvString, 'csv', { locale: 'EN_GB', hasHeader: true });
const fromAnyBuffer = await fromBuffer(buffer, 'xlsx');
const fromDisk = await fromFile('sales.csv');
const fromWeb = await fromURL('https://example.com/sales.csv', {
  headers: { Authorization: 'Bearer token' },
  timeout: 10_000,
  signal: controller.signal,
});
```

`fromFile` reads from disk and needs Node. In the browser read the file with the File API and hand the text to `fromCSV` or `fromTSV`, or the `ArrayBuffer` to `fromXLSX`, `fromXLS`, or `fromODS`. Spreadsheet parsers read the first sheet unless `sheet` is given, by name or index. `fromURL` takes fetch `headers`, a `timeout` in milliseconds (default 30 seconds), and an abort `signal`. `maxFileSize` (default 5 MB), `maxRows`, and `maxCells` throw when exceeded.

## Pitfalls

- A column whose first cell is a number but whose later cells are text is numeric, and the text cells become `null`. Declare `{ type: 'text' }` when a column mixes.
- IDs, postcodes, and product codes made of digits are read as numbers. Declare `{ type: 'text' }`.
- Month-first date strings (`'02/01/2024'` meaning 1 February) are read day-first. Use `Date` objects, ISO strings, or a column `dateFormat`.
- Percentages are fractions. A `percentage` column with the value `45` shows as `4500%`. Store `0.45`, or use `'45%'` strings.
- A count column that looks like years (`1950, 2000`) can become a `year` column. Declare it `{ type: 'integer' }`.
- One column per group is wide data. Reshape it, or map one column to `y` when you need one group.
- Row keys must match column keys exactly, including case. Mappings name the column `key`, never the `label`.
