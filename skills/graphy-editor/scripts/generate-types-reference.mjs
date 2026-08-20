// Generates reference/types.md from the published .d.ts of the editing surface:
// @graphysdk/viz-engine (commands, annotations, anchors), @graphysdk/react-renderer
// (handle & hooks) and @graphysdk/react-renderer/editable (panel, sections,
// controls) — the exact public shape, with JSDoc, so a codegen agent never has
// to grep the bundles.
//
// How it works (same machinery as graphy-charts/scripts/generate-types-reference.mjs,
// different curation):
// - GROUPS lists curated ROOT symbols per section. Only roots are maintained by
//   hand; a renamed/removed root fails generation loudly.
// - Every type a root's declaration references is pulled in automatically
//   (transitive closure) and emitted in a per-package "Supporting types"
//   appendix — the doc never contains a dangling type name.
// - EXPAND_STOP names types that are deliberately NOT expanded (internal or
//   output-side graphs); they appear in the doc as opaque references.
// - dts-bundler renames (`Plugin` -> `Plugin_2`) are resolved through the
//   d.ts export aliases and mapped back everywhere they appear.
//
// Known upstream gap: dist/editable.d.ts imports `EditorPanel`, `PanelRootProps`
// and `PANEL_ROOT_ATTRIBUTE` from dangling relative paths, so they cannot be
// extracted here; reference/panel.md documents their shape in prose.
//
// Usage:  node scripts/generate-types-reference.mjs [--check]
//         (reads the dist .d.ts from the packages installed in this repo's node_modules)
//         --check: exit 1 if reference/types.md is out of date instead of writing.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(scriptDir, "../reference/types.md");
const checkMode = process.argv.includes("--check");

// The published packages don't export package.json, so resolve the entry point
// and take the sibling .d.ts in dist/ (and package.json one level up).
function findPackage(pkg, dtsFile = "index.d.ts") {
  const entry = createRequire(import.meta.url).resolve(`@graphysdk/${pkg}`);
  const dts = resolve(dirname(entry), dtsFile);
  const { version } = JSON.parse(
    readFileSync(resolve(dirname(entry), "../package.json"), "utf8"),
  );
  return { dts, version };
}

// Keys are internal ids; `label` is what the doc prints.
const PACKAGES = {
  "viz-engine": { ...findPackage("viz-engine"), label: "@graphysdk/viz-engine" },
  "react-renderer": {
    ...findPackage("react-renderer"),
    label: "@graphysdk/react-renderer",
  },
  editable: {
    ...findPackage("react-renderer", "editable.d.ts"),
    label: "@graphysdk/react-renderer/editable",
  },
};

// Cross-package import resolution: which sibling package a module specifier in
// one package's d.ts refers to. Relative specifiers never match (the dangling
// EditorPanel imports land in `unresolved`, by design).
const SIBLINGS = {
  "viz-engine": ["react-renderer"],
  "react-renderer": ["viz-engine"],
  editable: ["viz-engine", "react-renderer"],
};
const SPECIFIER_OF = {
  "viz-engine": "@graphysdk/viz-engine",
  "react-renderer": "@graphysdk/react-renderer",
};

// Each group becomes a `##` section; `symbols` are the curated roots. Order is
// preserved. Types the roots reference are appended automatically.
const GROUPS = [
  {
    title: "Handle & hooks — @graphysdk/react-renderer",
    pkg: "react-renderer",
    symbols: [
      "GraphHandle",
      "GraphCommands",
      "GraphHistory",
      "GraphMode",
      "useGraphCommands",
      "useGraphHandle",
      "useGraphHistory",
      "useGraphHistoryShortcuts",
      "GraphHistoryShortcutsOptions",
      "useGraphSelection",
      "useCompiledSelector",
      "useHandleCompiled",
      "pruneSelection",
      "GraphProviderProps",
    ],
  },
  {
    title: "Command contract",
    pkg: "viz-engine",
    symbols: [
      "Command",
      "CommandMetadata",
      "CommandApplyResult",
      "DispatchOptions",
      "SerializedCommand",
      "CommandRegistry",
      "commandRegistry",
      "CommandStackSnapshot",
      "EditTarget",
      "areEditTargetsEqual",
      "convertSpecToInput",
      "updateSpec",
    ],
  },
  {
    title: "Commands — chart & layers",
    pkg: "viz-engine",
    symbols: [
      "SetChartTypeCommand",
      "AddLayerCommand",
      "AddLayerOptions",
      "LayerDraft",
      "RemoveLayerCommand",
      "SetLayerPositionCommand",
      "SetLayerStatCommand",
      "SetLayerYScaleTypeCommand",
      "SetBarWidthCommand",
      "SetBarBorderRadiusCommand",
      "SetLineWidthCommand",
      "SetLineInterpolationCommand",
      "SetLineMissingValuesCommand",
      "SetPointSizeCommand",
      "SetRuleLabelCommand",
      "SetRuleValueCommand",
      "SetStatLineCommand",
      "SetDataLabelsFormatCommand",
      "ToggleDataLabelsCommand",
      "ToggleCategoryLabelsCommand",
      "ToggleGoalLineCommand",
      "ToggleLineFillCommand",
      "ToggleLinePointsVisibilityCommand",
      "ToggleStackTotalsCommand",
    ],
  },
  {
    title: "Commands — scales & coords",
    pkg: "viz-engine",
    symbols: [
      "SetScaleDomainCommand",
      "SetScalePaletteCommand",
      "SetScaleReverseCommand",
      "SetScaleTransformCommand",
      "SetScaleZeroCommand",
      "SetCoordLimitsCommand",
      "SetPolarInnerRadiusCommand",
      "SetPolarStartAngleCommand",
    ],
  },
  {
    title: "Commands — config & content",
    pkg: "viz-engine",
    symbols: [
      "SetContentTitleCommand",
      "SetContentSubtitleCommand",
      "SetContentCaptionCommand",
      "SetContentSourceCommand",
      "ToggleContentVisibilityCommand",
      "SetAxisLabelCommand",
      "SetAxisPositionCommand",
      "SetAxisTickModeCommand",
      "SetAxisTicksVisibilityCommand",
      "SetAxisVisibilityCommand",
      "SetGridVisibilityCommand",
      "SetGridLineStyleCommand",
      "SetGridLineWidthCommand",
      "SetLegendAlignCommand",
      "SetLegendDisplayCommand",
      "SetLegendPositionCommand",
      "SetHeadlineShowCommand",
      "SetHeadlineSizeCommand",
      "SetHeadlinePositionCommand",
      "SetHeadlineCompareWithCommand",
      "SetNumberFormatDecimalsCommand",
      "SetNumberFormatAbbreviationCommand",
      "SetAppearanceTextScaleCommand",
    ],
  },
  {
    title: "Commands — styles & highlights",
    pkg: "viz-engine",
    symbols: [
      "SetStyleRuleCommand",
      "AddHighlightCommand",
      "AddHighlightOptions",
      "RemoveHighlightCommand",
      "SetHighlightDimStyleCommand",
      "readHighlightDimStyle",
      "HighlightDimStyle",
      "findEquivalentHighlight",
      "findHighlightsAtObservation",
    ],
  },
  {
    title: "Commands — annotations",
    pkg: "viz-engine",
    symbols: [
      "AddAnnotationCommand",
      "AddAnnotationOptions",
      "UpdateAnnotationCommand",
      "AnnotationPatch",
      "MoveAnnotationCommand",
      "RemoveAnnotationCommand",
    ],
  },
  {
    title: "Annotation model & anchors",
    pkg: "viz-engine",
    symbols: [
      "AnnotationKind",
      "KindedAnnotation",
      "LocatedAnnotation",
      "findAnnotation",
      "isAnnotationMovable",
      "clampAnnotationTranslation",
      "PanelTranslation",
      "buildObservationAnchor",
      "areAnchorsEqual",
      "RichTextContent",
    ],
  },
  {
    title: "Editable components — @graphysdk/react-renderer/editable",
    pkg: "editable",
    symbols: [
      "EditableGraphRenderer",
      "IntlProvider",
      "AxesPanel",
      "ElementsPanel",
      "Section",
      "SectionProps",
      "SectionLayout",
      "ToggledSection",
      "Row",
      "RowLayout",
      "OverridableSectionProps",
      "usePanelGraph",
      "usePanelExpansion",
    ],
  },
  {
    title: "Sections",
    pkg: "editable",
    symbols: [
      "GraphTypeSection",
      "GraphOptionsSection",
      "GraphOptionsSectionProps",
      "AxisSection",
      "AxisSectionProps",
      "PolarSection",
      "BarSection",
      "LineSection",
      "PointSection",
      "GridSection",
      "LegendSection",
      "LegendSectionProps",
      "HeadlineSection",
      "NumberFormatSection",
      "AppearanceSection",
      "TextSizeSection",
      "CalloutsSection",
      "TitleSection",
      "SubtitleSection",
      "CaptionSection",
      "SourceSection",
      "GoalSection",
      "TrendsAndAveragesSection",
    ],
  },
  {
    title: "Controls",
    pkg: "editable",
    symbols: [
      "ControlOption",
      "ControlBaseProps",
      "DiscreteControlProps",
      "ContinuousControlProps",
      "Button",
      "ButtonControlProps",
      "NumberField",
      "NumberFieldControlProps",
      "RadioGrid",
      "RadioGridControlProps",
      "Select",
      "SelectControlProps",
      "Slider",
      "SliderControlProps",
      "Switch",
      "SwitchControlProps",
      "TextField",
      "TextFieldControlProps",
      "ToggleGroup",
      "ToggleGroupControlProps",
      "ControlRegistry",
      "ResolvedControlRegistry",
      "useControls",
    ],
  },
];

const SKIPPED = new Set(["GraphConfig"]);

function removeSkipped(text) {
  if (![...SKIPPED].some((name) => text.includes(name))) return text;
  for (const name of SKIPPED) {
    text = text
      .replace(new RegExp(`\\s*\\|\\s*${name}\\b`, "g"), "")
      .replace(new RegExp(`\\b${name}\\s*\\|\\s*`, "g"), "");
  }
  // Remaining mentions sit in JSDoc: drop the sentences that contain them.
  return text
    .replace(/\/\*\*[\s\S]*?\*\/\n?/g, (comment) => {
      if (![...SKIPPED].some((name) => comment.includes(name))) return comment;
      const flattened = comment
        .trim()
        .slice(3, -2)
        .split("\n")
        .map((line) => line.replace(/^\s*\*\s?/, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const kept = flattened
        .split(/(?<=\.)\s+/)
        .filter(
          (sentence) => ![...SKIPPED].some((name) => sentence.includes(name)),
        );
      return kept.length > 0 ? `/** ${kept.join(" ")} */\n` : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "");
}

// References that are deliberately not expanded. Unlike the graphy-charts
// generator, `Command` and `CommandStep` ARE expanded here — they are this
// skill's subject. The authoring-side spec graph is stopped instead: the
// graphy-charts skill's types.md carries it in full.
const EXPAND_STOP = new Set([
  // Output side of the compile pipeline — consumed, not authored.
  "CompiledSpec",
  "CompiledLayer",
  "CompiledGeom",
  "CompiledStat",
  "CompiledScales",
  "CompiledGuides",
  "CompiledPanel",
  "CompiledAxisGuide",
  "CompiledLegendGuide",
  "CompiledLayerHighlight",
  "CompiledAnnotations",
  "CompileResult",
  "Compiler",
  "LastCompileSnapshot",
  "RendererContext",
  // The resolved spec and its authoring-side graph — commands take and return
  // it, but its shape is graphy-charts territory.
  "Spec",
  "SpecInput",
  "Dataset",
  "Observation",
  "Predicate",
  "StyleRule",
  "StyleDeclarations",
  "StyleSelect",
  "Stylesheet",
  "StylesheetInput",
  "WhenClause",
  "AnnotationsInput",
  "AnnotationsSpec",
  "AnnotationSpecByKind",
  "HighlightInput",
  "HighlightSpec",
  "ConfigSpec",
  "Data",
  "LayerInput",
  "AesMapping",
  "Geom",
  "Plugin",
  "RenderOnlyPlugin",
  "CustomPalettesInput",
  "ThemeOverrides",
  "GraphSlots",
  "VizDiagnostic",
  // The i18n dictionary graph behind IntlProvider — thousands of lines of
  // phrase keys nobody authors against. IntlProviderProps stays; its innards go.
  "Dictionary",
  "dictionaries",
  "EN_GB",
  "LocaleShape",
  "LooseLocaleShape",
  "I18nLocale",
  "I18nRuntimeOverrides",
  "TranslationKey",
  "OverridePhrase",
  "PhraseFn",
  "PhraseOf",
  "DotNotation",
  "DeepValue",
  "LooseSection",
  "LooseString",
  "LooseValue",
  "TextDirection",
  "CoreIntlProviderProps",
  // Engine internals reachable from the command/handle contracts.
  "CommandGate",
  "CommandStackManager",
  "CommandStackEvent",
  "CommandStackListener",
  "RenderedCommandResult",
  "TextMeasurer",
  "HeadlineMeasurer",
  "DiagnosticsCollector",
  "DrainedDiagnostics",
]);

// Type names never looked up (TS/DOM/React lib space).
const AMBIENT_NAMES = new Set([
  "Array",
  "ReadonlyArray",
  "Record",
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Exclude",
  "Extract",
  "NonNullable",
  "Parameters",
  "ReturnType",
  "Map",
  "Set",
  "Promise",
  "Date",
  "Error",
  "RegExp",
  "String",
  "Number",
  "Boolean",
  "Object",
  "Function",
  "Symbol",
  "Iterable",
  "IterableIterator",
  "ArrayLike",
  "React",
  "ReactNode",
  "ReactElement",
  "ComponentType",
  "CSSProperties",
  "JSX",
  "HTMLElement",
  "SVGElement",
  "MouseEvent",
  "PointerEvent",
  "KeyboardEvent",
  "Element",
  "Node",
  "globalThis",
  "ThisType",
  "PropsWithChildren",
  "ReadonlySet",
  "ReadonlyMap",
  "HTMLDivElement",
  "HTMLCanvasElement",
  "SVGSVGElement",
  "Ref",
  "RefObject",
  "EventTarget",
]);

/**
 * Parse one package's d.ts into:
 * - declarations: canonical name -> { text, refs } (overloads merged, bundler
 *   rename suffixes mapped back to the exported names everywhere)
 * - importedFrom: local name -> package specifier (for cross-package references)
 */
function parsePackage(filePath) {
  const text = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
  );

  const statementsByName = new Map(); // local name -> statement[]
  const exportedToLocal = new Map(); // `export { X_2 as X }` -> X: X_2
  const importedFrom = new Map(); // local name -> module specifier

  const record = (name, statement) => {
    if (!name) return;
    const list = statementsByName.get(name) ?? [];
    list.push(statement);
    statementsByName.set(name, list);
  };

  for (const statement of sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      record(statement.name.text, statement);
    } else if (
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement)
    ) {
      record(statement.name?.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name))
          record(declaration.name.text, statement);
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        if (specifier.propertyName)
          exportedToLocal.set(specifier.name.text, specifier.propertyName.text);
      }
    } else if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings
    ) {
      const bindings = statement.importClause.namedBindings;
      const module = statement.moduleSpecifier.text;
      if (ts.isNamedImports(bindings)) {
        for (const specifier of bindings.elements)
          importedFrom.set(specifier.name.text, module);
      }
    }
  }

  // local -> exported rename map, applied to every emitted block and reference.
  const localToExported = new Map(
    [...exportedToLocal].map(([exported, local]) => [local, exported]),
  );
  const canonical = (name) => localToExported.get(name) ?? name;
  const renameAll = (blockText) => {
    let result = blockText;
    for (const [local, exported] of localToExported) {
      result = result.replaceAll(new RegExp(`\\b${local}\\b`, "g"), exported);
    }
    return result;
  };

  // Collect the type names a statement references (type refs, heritage,
  // typeof), excluding the generic parameters the statement itself declares.
  const collectRefs = (statement) => {
    const refs = new Set();
    const typeParameters = new Set();
    const visit = (node) => {
      if (ts.isTypeParameterDeclaration(node)) {
        typeParameters.add(node.name.text);
      } else if (ts.isTypeReferenceNode(node)) {
        const root = ts.isQualifiedName(node.typeName)
          ? leftmost(node.typeName)
          : node.typeName.text;
        refs.add(root);
      } else if (
        ts.isExpressionWithTypeArguments(node) &&
        ts.isIdentifier(node.expression)
      ) {
        refs.add(node.expression.text);
      } else if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) {
        refs.add(node.exprName.text);
      }
      node.forEachChild(visit);
    };
    visit(statement);
    for (const parameter of typeParameters) refs.delete(parameter);
    return refs;
  };
  const leftmost = (qualifiedName) =>
    ts.isQualifiedName(qualifiedName.left)
      ? leftmost(qualifiedName.left)
      : qualifiedName.left.text;

  const declarations = new Map();
  for (const [localName, statements] of statementsByName) {
    const blocks = [];
    const refs = new Set();
    for (const statement of statements) {
      const fullText = statement.getFullText(sourceFile);
      const declText = statement.getText(sourceFile);
      // Leading trivia (JSDoc) sits between fullText start and the declaration;
      // keep it, then drop the `export declare` / `declare` modifier prefix.
      const jsDoc = fullText
        .slice(0, fullText.length - declText.length)
        .replace(/^\s+/, "")
        .trimEnd();
      const declaration = declText.replace(/^(export )?declare /, "");
      blocks.push(jsDoc ? `${jsDoc}\n${declaration}` : declaration);
      for (const ref of collectRefs(statement)) {
        if (ref !== localName) refs.add(canonical(ref));
      }
    }
    const entry = { text: removeSkipped(renameAll(blocks.join("\n"))), refs };
    declarations.set(canonical(localName), entry);
    if (!declarations.has(localName)) declarations.set(localName, entry);
  }

  return { declarations, importedFrom };
}

const packages = Object.fromEntries(
  Object.entries(PACKAGES).map(([pkg, { dts }]) => [pkg, parsePackage(dts)]),
);

/** Resolve a name to its declaring package, following cross-package imports. */
function resolveSymbol(pkg, name) {
  if (packages[pkg].declarations.has(name))
    return { pkg, entry: packages[pkg].declarations.get(name) };
  const importedModule = packages[pkg].importedFrom.get(name);
  for (const sibling of SIBLINGS[pkg]) {
    if (
      importedModule === SPECIFIER_OF[sibling] &&
      packages[sibling].declarations.has(name)
    ) {
      return { pkg: sibling, entry: packages[sibling].declarations.get(name) };
    }
  }
  return null;
}

// Validate roots: unique across groups, all resolvable.
const rootNames = new Set();
const missing = [];
const duplicates = [];
for (const group of GROUPS) {
  for (const name of group.symbols) {
    if (rootNames.has(name)) duplicates.push(name);
    rootNames.add(name);
    if (!resolveSymbol(group.pkg, name))
      missing.push(`${name} (${PACKAGES[group.pkg].label})`);
  }
}
if (duplicates.length > 0 || missing.length > 0) {
  for (const name of duplicates)
    console.error(`ERROR: root symbol listed twice: ${name}`);
  if (missing.length > 0) {
    console.error(
      "ERROR: root symbols not found in dist (renamed or removed?):",
    );
    for (const name of missing) console.error(`  - ${name}`);
  }
  process.exit(1);
}

// Transitive closure: BFS from the roots; referenced types not already emitted
// as roots land in the per-package supporting sets.
const supporting = Object.fromEntries(
  Object.keys(PACKAGES).map((pkg) => [pkg, new Map()]),
);
const unresolved = new Set();
const stopped = new Set();

const queue = GROUPS.flatMap((group) =>
  group.symbols.map((name) => ({
    pkg: resolveSymbol(group.pkg, name).pkg,
    name,
  })),
);
const seen = new Set(queue.map(({ pkg, name }) => `${pkg}:${name}`));

while (queue.length > 0) {
  const { pkg, name } = queue.shift();
  const resolved = resolveSymbol(pkg, name);
  if (!resolved) continue;
  for (const ref of resolved.entry.refs) {
    if (AMBIENT_NAMES.has(ref) || SKIPPED.has(ref)) continue;
    if (EXPAND_STOP.has(ref)) {
      stopped.add(ref);
      continue;
    }
    const refResolved = resolveSymbol(resolved.pkg, ref);
    if (!refResolved) {
      unresolved.add(ref);
      continue;
    }
    const key = `${refResolved.pkg}:${ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!rootNames.has(ref))
      supporting[refResolved.pkg].set(ref, refResolved.entry);
    queue.push({ pkg: refResolved.pkg, name: ref });
  }
}

// Render.
const sections = [];
for (const group of GROUPS) {
  const blocks = group.symbols.map(
    (name) => resolveSymbol(group.pkg, name).entry.text,
  );
  sections.push(
    `## ${group.title}\n\n\`\`\`ts\n${blocks.join("\n\n")}\n\`\`\``,
  );
}
for (const [pkg, entries] of Object.entries(supporting)) {
  if (entries.size === 0) continue;
  const blocks = [...entries.keys()]
    .sort()
    .map((name) => entries.get(name).text);
  sections.push(
    `## Supporting types — ${PACKAGES[pkg].label}\n\nTypes referenced by the sections above, included so no name dangles.\n\n\`\`\`ts\n${blocks.join("\n\n")}\n\`\`\``,
  );
}

const stoppedNote =
  stopped.size > 0
    ? ` The only opaque names are compiled/internal shapes and the authoring-side spec graph (documented in the graphy-charts skill's types.md): ${[...stopped].sort().join(", ")}.`
    : "";

const versions = [
  `\`@graphysdk/viz-engine@${PACKAGES["viz-engine"].version}\``,
  `\`@graphysdk/react-renderer@${PACKAGES["react-renderer"].version}\` (root and \`/editable\` entries)`,
].join(" and ");

const header = `<!-- GENERATED FILE — do not edit. -->

# Type reference

Generated from ${versions}.

> The exact public editing API, extracted verbatim (with JSDoc) from the built
> \`.d.ts\` files: the command system and annotation model from
> \`@graphysdk/viz-engine\`, the handle & hooks from \`@graphysdk/react-renderer\`,
> and the panel, sections and controls from \`@graphysdk/react-renderer/editable\`.
> Check precise signatures, option keys, and accepted values here; the other
> reference files cover how the pieces compose. Every type these declarations
> reference is defined in this file, most under "Supporting types" at the
> end.${stoppedNote}
>
> Not extractable from the published d.ts (upstream bundling gap): \`EditorPanel\`,
> \`PanelRootProps\`, \`PANEL_ROOT_ATTRIBUTE\` — their shapes are documented in
> \`panel.md\`.
`;

const output = `${header}\n${sections.join("\n\n")}\n`;
const supportingCount = Object.values(supporting).reduce(
  (total, entries) => total + entries.size,
  0,
);
const summary = `${GROUPS.length} groups, ${rootNames.size} roots, ${supportingCount} supporting types, ${stopped.size} stopped, ${unresolved.size} unresolved external names`;

if (checkMode) {
  let current = null;
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    // Missing file counts as stale.
  }
  if (current !== output) {
    console.error(
      `STALE: ${outPath} does not match the built packages — regenerate it. (${summary})`,
    );
    process.exit(1);
  }
  console.log(`Fresh: ${outPath} (${summary})`);
} else {
  writeFileSync(outPath, output);
  console.log(`Wrote ${outPath} — ${summary}`);
  if (unresolved.size > 0)
    console.log(
      `Unresolved (lib/external, left opaque): ${[...unresolved].sort().join(", ")}`,
    );
}
