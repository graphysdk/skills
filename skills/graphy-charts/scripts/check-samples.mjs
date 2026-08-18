#!/usr/bin/env node
// Verify the skill's code samples against the INSTALLED @graphysdk packages.
//
//   Phase 1  every import specifier resolves and every named import exists
//   Phase 2  each fenced ts/tsx block is typechecked
// Each fenced ts/tsx block is compiled on its own, prefixed with a preamble that
// binds every export of both packages, so fragments still resolve their builders.
// Only API-shape diagnostics are reported; fragment noise is filtered out.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, relative, dirname } from 'node:path';

const require = createRequire(import.meta.url);
const REPO = resolve(process.argv[3] ?? '/Users/roman/dev/skills');
const ts = require(join(REPO, 'node_modules/typescript'));
const SKILL = resolve(process.argv[2] ?? join(REPO, 'skills/graphy-charts'));
// Must live INSIDE the repo: node module resolution for @graphysdk/* depends on it.
const TMP = join(REPO, '.sample-typecheck');

function dts(pkg, file) { return resolve(dirname(require.resolve(pkg, { paths: [REPO] })), file); }
function exportsOf(path) {
  const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const v = new Set(), t = new Set();
  (function visit(n) {
    if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
      for (const e of n.exportClause.elements) (e.isTypeOnly ? t : v).add(e.name.text);
    else if ((ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) &&
      n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) t.add(n.name.text);
    else if ((ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isEnumDeclaration(n)) &&
      n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) && n.name) v.add(n.name.text);
    else if (ts.isVariableStatement(n) && n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      for (const d of n.declarationList.declarations) if (ts.isIdentifier(d.name)) v.add(d.name.text);
    ts.forEachChild(n, visit);
  })(sf);
  return { values: v, types: t };
}

const VE = exportsOf(dts('@graphysdk/viz-engine', 'index.d.ts'));
const RR = exportsOf(dts('@graphysdk/react-renderer', 'index.d.ts'));
// A name bound by the preamble must not be bound twice.
const seen = new Set();
const pick = (s) => [...s].filter((n) => !seen.has(n) && (seen.add(n), true));
const PREAMBLE = [
  `import * as React from 'react';`,
  `import { ${pick(VE.values).join(', ')} } from '@graphysdk/viz-engine';`,
  `import type { ${pick(VE.types).join(', ')} } from '@graphysdk/viz-engine';`,
  `import { ${pick(RR.values).join(', ')} } from '@graphysdk/react-renderer';`,
  `import type { ${pick(RR.types).join(', ')} } from '@graphysdk/react-renderer';`,
  `// @ts-ignore unused preamble bindings`,
].join('\n');
const PREAMBLE_LINES = PREAMBLE.split('\n').length;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}
function codeBlocks(text) {
  const lines = text.split('\n'); const blocks = []; let open = null;
  lines.forEach((line, i) => {
    const f = line.match(/^\s*```(\w+)?/); if (!f) return;
    if (open === null) {
      const lang = (f[1] ?? '').toLowerCase();
      open = { start: i, lang: ['ts','tsx','typescript'].includes(lang) ? lang : null };
    } else {
      if (open.lang) blocks.push({ offset: open.start + 1, code: lines.slice(open.start + 1, i).join('\n') });
      open = null;
    }
  });
  return blocks;
}

// Diagnostics that indicate a real API mismatch (not a fragment artefact).
const REPORT = new Set([
  2305, // module has no exported member
  2724, // no exported member named X, did you mean Y
  2339, // property does not exist on type
  2353, // object literal may only specify known properties
  2551, // property does not exist, did you mean
  2554, // expected N arguments but got M
  2559, 2769, // no overload matches
  2322, // type not assignable (catches bad JSX props)
  2741, // missing required property
]);
// Never report: fragment artefacts.
const IGNORE = new Set([2304, 2552, 2451, 2440, 2300, 6133, 6196, 2686, 1155, 2693, 2749, 7027, 2578]);

const files = walk(SKILL).sort();

// ---------------------------------------------------------------------------
// Phase 1 — every specifier resolves, every named import exists.
// Parser-only, so there are no false positives.
// ---------------------------------------------------------------------------
const VALID = new Set(['@graphysdk/viz-engine', '@graphysdk/react-renderer', '@graphysdk/react-renderer/editable']);
const NAMES = {
  '@graphysdk/viz-engine': new Set([...VE.values, ...VE.types]),
  '@graphysdk/react-renderer': new Set([...RR.values, ...RR.types]),
  '@graphysdk/react-renderer/editable': (() => { const e = exportsOf(dts('@graphysdk/react-renderer', 'editable.d.ts')); return new Set([...e.values, ...e.types]); })(),
};
let importProblems = 0;
for (const file of files) {
  const found = [];
  for (const { offset, code } of codeBlocks(readFileSync(file, 'utf8'))) {
    const sf = ts.createSourceFile('s.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const spec = st.moduleSpecifier.text;
      if (!spec.startsWith('@graphysdk/')) continue;
      const line = offset + sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1;
      if (!VALID.has(spec)) { found.push([line, `unresolvable specifier '${spec}'`]); continue; }
      const b = st.importClause?.namedBindings;
      if (!b || !ts.isNamedImports(b)) continue;
      for (const el of b.elements) {
        const n = (el.propertyName ?? el.name).text;
        if (!NAMES[spec].has(n)) found.push([line, `'${n}' is not exported by ${spec}`]);
      }
    }
  }
  if (found.length) {
    importProblems += found.length;
    console.log(`\n${relative(REPO, file)}`);
    for (const [ln, msg] of found.sort((a, b) => a[0] - b[0])) console.log(`  :${ln}  ${msg}`);
  }
}
console.log(`\nPhase 1 — imports: ${importProblems} problem(s).`);
console.log(`\nPhase 2 — types:`);

rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
const units = [];
for (const file of files) {
  codeBlocks(readFileSync(file, 'utf8')).forEach((b, i) => {
    const name = join(TMP, `${relative(SKILL, file).replace(/[\/\.]/g, '_')}__${i}.tsx`);
    writeFileSync(name, `${PREAMBLE}\n${b.code}\n`);
    units.push({ name, file, offset: b.offset });
  });
}
const options = {
  jsx: ts.JsxEmit.ReactJSX, noEmit: true, skipLibCheck: true, strict: false,
  moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022, esModuleInterop: true, allowJs: true,
  baseUrl: REPO, typeRoots: [join(REPO, 'node_modules/@types')],
};
const program = ts.createProgram(units.map((u) => u.name), options);
const byFile = new Map();
const preambleErrors = new Set();
for (const d of ts.getPreEmitDiagnostics(program)) {
  if (!d.file) continue;
  const unit = units.find((u) => u.name === d.file.fileName);
  if (!unit) continue;
  if (IGNORE.has(d.code) || !REPORT.has(d.code)) continue;
  const { line } = d.file.getLineAndCharacterOfPosition(d.start);
  if (line < PREAMBLE_LINES) { preambleErrors.add(`TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText,' ').slice(0,160)}`); continue; }
  const mdLine = unit.offset + (line - PREAMBLE_LINES) + 1;
  const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 240);
  const key = relative(REPO, unit.file);
  if (!byFile.has(key)) byFile.set(key, []);
  byFile.get(key).push([mdLine, d.code, msg]);
}
let total = 0;
for (const [file, list] of [...byFile].sort()) {
  const uniq = [...new Map(list.map((x) => [`${x[0]}:${x[2]}`, x])).values()].sort((a, b) => a[0] - b[0]);
  total += uniq.length;
  console.log(`\n${file}`);
  for (const [ln, code, msg] of uniq) console.log(`  :${ln}  TS${code}  ${msg}`);
}
if (preambleErrors.size) {
  console.log(`\nHARNESS PREAMBLE ERRORS (results are unreliable until fixed):`);
  for (const e of preambleErrors) console.log(`  ${e}`);
}
console.log(`\n${units.length} sample blocks typechecked — ${total} API-shape error(s).`);
rmSync(TMP, { recursive: true, force: true });
process.exit(importProblems + total + preambleErrors.size ? 1 : 0);
