// Generate reference/types.md from the built .d.ts files for commands,
// annotations, handles, hooks, and editor components. Preserve JSDoc.
//
// GROUPS lists the symbols to document in each section. Missing or duplicate
// symbols fail generation. Referenced types are added under "Supporting types"
// unless EXPAND_STOP excludes them. Export aliases restore names renamed by
// the declaration bundler, such as Plugin_2 -> Plugin.
//
// Usage: node scripts/generate-types-reference.mjs [--check] [--packages <dir>]
// By default, resolve @graphysdk/viz-engine and @graphysdk/react-renderer from
// this skill's dependencies. Use --packages for a monorepo packages directory.
// --check exits with code 1 if reference/types.md needs regeneration.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(scriptDir, '../reference/types.md');
const checkMode = process.argv.includes('--check');

const packagesFlag = process.argv.indexOf('--packages');
const packagesDir = packagesFlag === -1 ? null : process.argv[packagesFlag + 1];
if (packagesFlag !== -1 && (!packagesDir || packagesDir.startsWith('--'))) {
  console.error('Usage: node generate-types-reference.mjs [--check] [--packages <dir>]');
  process.exit(1);
}

// The packages do not export package.json. Resolve it and the .d.ts file
// relative to the package entry point.
function findPackage(pkg, dtsFile = 'index.d.ts') {
  if (packagesDir) {
    const root = resolve(packagesDir, pkg);
    const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    return { dts: resolve(root, 'dist', dtsFile), version };
  }
  const entry = createRequire(import.meta.url).resolve(`@graphysdk/${pkg}`);
  const dts = resolve(dirname(entry), dtsFile);
  const { version } = JSON.parse(readFileSync(resolve(dirname(entry), '../package.json'), 'utf8'));
  return { dts, version };
}

// Keys identify packages within this script; labels appear in the reference.
const PACKAGES = {
  'viz-engine': { ...findPackage('viz-engine'), label: '@graphysdk/viz-engine' },
  'react-renderer': {
    ...findPackage('react-renderer'),
    label: '@graphysdk/react-renderer',
  },
  editable: {
    ...findPackage('react-renderer', 'editable.d.ts'),
    label: '@graphysdk/react-renderer/editable',
  },
};

// Resolve imports between these packages. Relative imports remain unresolved.
const SIBLINGS = {
  'viz-engine': ['react-renderer'],
  'react-renderer': ['viz-engine'],
  editable: ['viz-engine', 'react-renderer'],
};
const SPECIFIER_OF = {
  'viz-engine': '@graphysdk/viz-engine',
  'react-renderer': '@graphysdk/react-renderer',
};

// Each group becomes a section in this order. Referenced types are added later.
const GROUPS = [
  {
    title: 'Handle & hooks — @graphysdk/react-renderer',
    pkg: 'react-renderer',
    symbols: [
      'GraphHandle',
      'GraphCommands',
      'GraphHistory',
      'GraphMode',
      'useGraphCommands',
      'useGraphHandle',
      'useGraphHistory',
      'useGraphHistoryShortcuts',
      'GraphHistoryShortcutsOptions',
      'useGraphSelection',
      'useSceneSelector',
      'useHandleScene',
      'pruneSelection',
      'GraphProviderProps',
      'GRAPH_MODES',
      'useTargetBoundary',
      'TargetBoundary',
      'SideSpans',
    ],
  },
  {
    title: 'Command contract',
    pkg: 'viz-engine',
    symbols: [
      'Command',
      'CommandMetadata',
      'CommandApplyResult',
      'DispatchOptions',
      'SerializedCommand',
      'CommandRegistry',
      'commandRegistry',
      'CommandStackSnapshot',
      'EditTarget',
      'areEditTargetsEqual',
      'readEditTargetKey',
      'ObservationsTarget',
      'updateSpec',
      'toSpec',
    ],
  },
  {
    title: 'Commands — chart & layers',
    pkg: 'viz-engine',
    symbols: [
      'SetChartTypeCommand',
      'readChartType',
      'canBecomeHeatmap',
      'isComboChartType',
      'canBecomeCombo',
      'COMBO_TYPES',
      'SetMappingCommand',
      'SetMappingParams',
      'readMappableAesthetics',
      'AddLayerCommand',
      'AddLayerOptions',
      'LayerDraft',
      'RemoveLayerCommand',
      'SetLayerPositionCommand',
      'SetLayerStatCommand',
      'SetLayerYScaleTypeCommand',
      'SetBarWidthCommand',
      'SetBarCornerRadiusCommand',
      'SetLineStyleCommand',
      'SetLineCurveCommand',
      'SetLineMissingValuesCommand',
      'SetPointSizeCommand',
      'SetRuleLabelCommand',
      'SetRuleValueCommand',
      'SetStatLineCommand',
      'SetDataLabelsFormatCommand',
      'ToggleDataLabelsCommand',
      'ToggleCategoryLabelsCommand',
      'ToggleGoalLineCommand',
      'ToggleLinePointsCommand',
      'ToggleStackTotalsCommand',
    ],
  },
  {
    title: 'Commands — scales & coords',
    pkg: 'viz-engine',
    symbols: [
      'SetScaleDomainCommand',
      'SetScaleRangeCommand',
      'SetScaleReverseCommand',
      'SetScaleTransformCommand',
      'SetCoordLimitsCommand',
      'SetPolarInnerRadiusCommand',
      'SetPolarStartAngleCommand',
    ],
  },
  {
    title: 'Commands — config & content',
    pkg: 'viz-engine',
    symbols: [
      'SetContentTitleCommand',
      'SetContentSubtitleCommand',
      'SetContentCaptionCommand',
      'SetContentSourceCommand',
      'ToggleContentVisibilityCommand',
      'SetAxisLabelCommand',
      'SetAxisPositionCommand',
      'SetAxisTickModeCommand',
      'SetAxisTicksVisibilityCommand',
      'SetAxisVisibilityCommand',
      'SetGridVisibilityCommand',
      'SetGridLineStyleCommand',
      'SetLegendAlignCommand',
      'SetLegendDisplayCommand',
      'SetLegendPlacementCommand',
      'SetLegendPositionCommand',
      'SetHeadlineShowCommand',
      'SetHeadlineSizeCommand',
      'SetHeadlinePositionCommand',
      'SetHeadlineCompareWithCommand',
      'SetNumberFormatDecimalsCommand',
      'SetNumberFormatAbbreviationCommand',
    ],
  },
  {
    title: 'Commands — styles & highlights',
    pkg: 'viz-engine',
    symbols: [
      'SetStyleRuleCommand',
      'StyleRuleEdit',
      'SetObservationsColorCommand',
      'readObservationsColorRoute',
      'readColorChoices',
      'AddHighlightCommand',
      'AddHighlightOptions',
      'RemoveHighlightCommand',
      'SetHighlightDimStyleCommand',
      'readHighlightDimStyle',
      'HighlightDimStyle',
      'findEquivalentHighlight',
      'findHighlightsAtObservation',
    ],
  },
  {
    title: 'Commands — annotations',
    pkg: 'viz-engine',
    symbols: [
      'AddAnnotationCommand',
      'AddAnnotationOptions',
      'UpdateAnnotationCommand',
      'AnnotationPatch',
      'MoveAnnotationCommand',
      'RemoveAnnotationCommand',
      'SetDifferenceArrowStyleCommand',
    ],
  },
  {
    title: 'Commands — sequence',
    pkg: 'viz-engine',
    symbols: ['SequenceCommand', 'SequenceParams'],
  },
  {
    title: 'Annotation model & anchors',
    pkg: 'viz-engine',
    symbols: [
      'AnnotationKind',
      'KindedAnnotation',
      'LocatedAnnotation',
      'findAnnotation',
      'isAnnotationMovable',
      'clampAnnotationTranslation',
      'PanelTranslation',
      'createObservationAnchorBuilder',
      'areAnchorsEqual',
      'areObservationAnchorsEqual',
      'findObservationAttachment',
      'OBSERVATION_ATTACHMENT_KINDS',
      'buildObservationsTarget',
      'readReachableLevels',
      'RichTextContent',
    ],
  },
  {
    title: 'Editable components — @graphysdk/react-renderer/editable',
    pkg: 'editable',
    symbols: [
      'EditableGraphRenderer',
      'EditableGraphRendererProps',
      'PalettePresets',
      'EditorPanel',
      'PanelRootProps',
      'PANEL_ROOT_ATTRIBUTE',
      'IntlProvider',
      'AxesPanel',
      'ElementsPanel',
      'Section',
      'SectionProps',
      'SectionLayout',
      'ToggledSection',
      'Row',
      'Separator',
      'RowLayout',
      'OverridableSectionProps',
      'usePanelGraph',
      'usePanelExpansion',
    ],
  },
  {
    title: 'Edit menus',
    pkg: 'editable',
    symbols: [
      'BarEditMenu',
      'LineEditMenu',
      'AxisEditMenu',
      'GridEditMenu',
      'LegendEditMenu',
      'ColorRow',
      'PaletteRow',
    ],
  },
  {
    title: 'Sections',
    pkg: 'editable',
    symbols: [
      'GraphTypeSection',
      'GraphOptionsSection',
      'GraphOptionsSectionProps',
      'MappingSection',
      'ComboSection',
      'AxisSection',
      'AxisSectionProps',
      'PolarSection',
      'BarSection',
      'LineSection',
      'PointSection',
      'GridSection',
      'LegendSection',
      'LegendSectionProps',
      'HeadlineSection',
      'NumberFormatSection',
      'AppearanceSection',
      'TextSizeSection',
      'CalloutsSection',
      'TitleSection',
      'SubtitleSection',
      'CaptionSection',
      'SourceSection',
      'GoalSection',
      'TrendsAndAveragesSection',
    ],
  },
  {
    title: 'Controls',
    pkg: 'editable',
    symbols: [
      'ControlOption',
      'ControlBaseProps',
      'DiscreteControlProps',
      'ContinuousControlProps',
      'Button',
      'ButtonControlProps',
      'ColorSwatches',
      'ColorSwatchesControlProps',
      'CustomColor',
      'CustomColorControlProps',
      'NumberField',
      'NumberFieldControlProps',
      'RadioGrid',
      'RadioGridControlProps',
      'RadioGridOption',
      'Select',
      'SelectControlProps',
      'Slider',
      'SliderControlProps',
      'Switch',
      'SwitchControlProps',
      'TextField',
      'TextFieldControlProps',
      'ToggleGroup',
      'ToggleGroupControlProps',
      'ControlRegistry',
      'ResolvedControlRegistry',
      'useControls',
      'ControlRegistryProvider',
      'ControlRegistryProviderProps',
      'ControlTooltip',
      'ControlTooltipProps',
    ],
  },
];

const SKIPPED = new Set(['GraphConfig']);

function removeSkipped(text) {
  if (![...SKIPPED].some((name) => text.includes(name))) return text;
  for (const name of SKIPPED) {
    text = text
      .replace(new RegExp(`\\s*\\|\\s*${name}\\b`, 'g'), '')
      .replace(new RegExp(`\\b${name}\\s*\\|\\s*`, 'g'), '');
  }
  // Remove JSDoc sentences that refer to omitted types.
  return text
    .replace(/\/\*\*[\s\S]*?\*\/\n?/g, (comment) => {
      if (![...SKIPPED].some((name) => comment.includes(name))) return comment;
      const flattened = comment
        .trim()
        .slice(3, -2)
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const kept = flattened
        .split(/(?<=\.)\s+/)
        .filter((sentence) => ![...SKIPPED].some((name) => sentence.includes(name)));
      return kept.length > 0 ? `/** ${kept.join(' ')} */\n` : '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '');
}

// Omit compiler internals and types covered by the graphy-charts reference.
// Keep Command and CommandStep because this skill covers editing.
const EXPAND_STOP = new Set([
  // Compiler output types are not needed to write edits.
  'CompiledSpec',
  'CompiledLayer',
  'CompiledGeom',
  'CompiledStat',
  'CompiledScales',
  'CompiledGuides',
  'CompiledPanel',
  'CompiledAxisGuide',
  'CompiledLegendGuide',
  'CompiledLayerHighlight',
  'CompiledAnnotations',
  'CompileResult',
  'Compiler',
  'LastCompileSnapshot',
  'RendererContext',
  // The graphy-charts reference covers spec and authoring types.
  'Spec',
  'SpecInput',
  'Dataset',
  'Observation',
  'Predicate',
  'StyleRule',
  'StyleDeclarations',
  'StyleSelect',
  'Stylesheet',
  'StylesheetInput',
  'WhenClause',
  'AnnotationsInput',
  'AnnotationsSpec',
  'AnnotationSpecByKind',
  'HighlightInput',
  'HighlightSpec',
  'ConfigSpec',
  'Data',
  'LayerInput',
  'AesMapping',
  'Geom',
  'Plugin',
  'RenderOnlyPlugin',
  'ThemeOverrides',
  'GraphSlots',
  'VizDiagnostic',
  // Include IntlProviderProps without expanding its internal dictionary types.
  'Dictionary',
  'dictionaries',
  'EN_GB',
  'LocaleShape',
  'LooseLocaleShape',
  'I18nLocale',
  'I18nRuntimeOverrides',
  'TranslationKey',
  'OverridePhrase',
  'PhraseFn',
  'PhraseOf',
  'DotNotation',
  'DeepValue',
  'LooseSection',
  'LooseString',
  'LooseValue',
  'TextDirection',
  'CoreIntlProviderProps',
  // Engine internals referenced by commands and handles.
  'CommandGate',
  'CommandStackManager',
  'CommandStackEvent',
  'CommandStackListener',
  'RenderedCommandResult',
  'TextMeasurer',
  'HeadlineMeasurer',
  'DiagnosticsCollector',
  'DrainedDiagnostics',
]);

// Built-in TypeScript, DOM, and React types do not need local definitions.
const AMBIENT_NAMES = new Set([
  'Array',
  'ReadonlyArray',
  'Record',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Parameters',
  'ReturnType',
  'Map',
  'Set',
  'Promise',
  'Date',
  'Error',
  'RegExp',
  'String',
  'Number',
  'Boolean',
  'Object',
  'Function',
  'Symbol',
  'Iterable',
  'IterableIterator',
  'ArrayLike',
  'React',
  'ReactNode',
  'ReactElement',
  'ComponentType',
  'CSSProperties',
  'JSX',
  'HTMLElement',
  'SVGElement',
  'MouseEvent',
  'PointerEvent',
  'KeyboardEvent',
  'Element',
  'Node',
  'globalThis',
  'ThisType',
  'PropsWithChildren',
  'ReadonlySet',
  'ReadonlyMap',
  'HTMLDivElement',
  'HTMLCanvasElement',
  'SVGSVGElement',
  'Ref',
  'RefObject',
  'EventTarget',
]);

/**
 * Parse declarations and imports from one package's .d.ts file.
 * - declarations maps exported names to { text, refs }, with overloads merged.
 * - importedFrom maps local names to package specifiers.
 */
function parsePackage(filePath) {
  const text = readFileSync(filePath, 'utf8').replace(/\r\n?/g, '\n');
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);

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
    } else if (ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) {
      record(statement.name?.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) record(declaration.name.text, statement);
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        if (specifier.propertyName) exportedToLocal.set(specifier.name.text, specifier.propertyName.text);
      }
    } else if (ts.isImportDeclaration(statement) && statement.importClause?.namedBindings) {
      const bindings = statement.importClause.namedBindings;
      const module = statement.moduleSpecifier.text;
      if (ts.isNamedImports(bindings)) {
        for (const specifier of bindings.elements) importedFrom.set(specifier.name.text, module);
      }
    }
  }

  // Use exported names in all declarations and references.
  const localToExported = new Map([...exportedToLocal].map(([exported, local]) => [local, exported]));
  const canonical = (name) => localToExported.get(name) ?? name;
  const renameAll = (blockText) => {
    let result = blockText;
    for (const [local, exported] of localToExported) {
      result = result.replaceAll(new RegExp(`\\b${local}\\b`, 'g'), exported);
    }
    return result;
  };

  // Collect referenced types, including base types and typeof expressions.
  // Exclude generic parameters declared by the statement.
  const collectRefs = (statement) => {
    const refs = new Set();
    const typeParameters = new Set();
    const visit = (node) => {
      if (ts.isTypeParameterDeclaration(node)) {
        typeParameters.add(node.name.text);
      } else if (ts.isTypeReferenceNode(node)) {
        const root = ts.isQualifiedName(node.typeName) ? leftmost(node.typeName) : node.typeName.text;
        refs.add(root);
      } else if (ts.isExpressionWithTypeArguments(node) && ts.isIdentifier(node.expression)) {
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
    ts.isQualifiedName(qualifiedName.left) ? leftmost(qualifiedName.left) : qualifiedName.left.text;

  const declarations = new Map();
  for (const [localName, statements] of statementsByName) {
    const blocks = [];
    const refs = new Set();
    for (const statement of statements) {
      const fullText = statement.getFullText(sourceFile);
      const declText = statement.getText(sourceFile);
      // Preserve leading comments and remove the declaration's
      // `export declare` or `declare` prefix.
      const jsDoc = fullText
        .slice(0, fullText.length - declText.length)
        .replace(/^\s+/, '')
        .trimEnd();
      const declaration = declText.replace(/^(export )?declare /, '');
      blocks.push(jsDoc ? `${jsDoc}\n${declaration}` : declaration);
      for (const ref of collectRefs(statement)) {
        if (ref !== localName) refs.add(canonical(ref));
      }
    }
    const entry = { text: removeSkipped(renameAll(blocks.join('\n'))), refs };
    declarations.set(canonical(localName), entry);
    if (!declarations.has(localName)) declarations.set(localName, entry);
  }

  return { declarations, importedFrom };
}

const packages = Object.fromEntries(Object.entries(PACKAGES).map(([pkg, { dts }]) => [pkg, parsePackage(dts)]));

/** Resolve a name to its declaring package, following cross-package imports. */
function resolveSymbol(pkg, name) {
  if (packages[pkg].declarations.has(name)) return { pkg, entry: packages[pkg].declarations.get(name) };
  const importedModule = packages[pkg].importedFrom.get(name);
  for (const sibling of SIBLINGS[pkg]) {
    if (importedModule === SPECIFIER_OF[sibling] && packages[sibling].declarations.has(name)) {
      return { pkg: sibling, entry: packages[sibling].declarations.get(name) };
    }
  }
  return null;
}

// Each listed symbol must exist and appear in only one group.
const rootNames = new Set();
const missing = [];
const duplicates = [];
for (const group of GROUPS) {
  for (const name of group.symbols) {
    if (rootNames.has(name)) duplicates.push(name);
    rootNames.add(name);
    if (!resolveSymbol(group.pkg, name)) missing.push(`${name} (${PACKAGES[group.pkg].label})`);
  }
}
if (duplicates.length > 0 || missing.length > 0) {
  for (const name of duplicates) console.error(`ERROR: root symbol listed twice: ${name}`);
  if (missing.length > 0) {
    console.error('ERROR: root symbols not found in dist (renamed or removed?):');
    for (const name of missing) console.error(`  - ${name}`);
  }
  process.exit(1);
}

// Follow references from the listed symbols and group additional types
// by package for the supporting sections.
const supporting = Object.fromEntries(Object.keys(PACKAGES).map((pkg) => [pkg, new Map()]));
const unresolved = new Set();
const stopped = new Set();

const queue = GROUPS.flatMap((group) =>
  group.symbols.map((name) => ({
    pkg: resolveSymbol(group.pkg, name).pkg,
    name,
  }))
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
    if (!rootNames.has(ref)) supporting[refResolved.pkg].set(ref, refResolved.entry);
    queue.push({ pkg: refResolved.pkg, name: ref });
  }
}

const sections = [];
for (const group of GROUPS) {
  const blocks = group.symbols.map((name) => resolveSymbol(group.pkg, name).entry.text);
  sections.push(`## ${group.title}\n\n\`\`\`ts\n${blocks.join('\n\n')}\n\`\`\``);
}
for (const [pkg, entries] of Object.entries(supporting)) {
  if (entries.size === 0) continue;
  const blocks = [...entries.keys()].sort().map((name) => entries.get(name).text);
  sections.push(
    `## Supporting types — ${PACKAGES[pkg].label}\n\nAdditional types referenced by the sections above.\n\n\`\`\`ts\n${blocks.join('\n\n')}\n\`\`\``
  );
}

const stoppedNote =
  stopped.size > 0
    ? ` Types omitted from this reference (see the graphy-charts types.md for spec and authoring types): ${[...stopped].sort().join(', ')}.`
    : '';

const versions = [
  `\`@graphysdk/viz-engine@${PACKAGES['viz-engine'].version}\``,
  `\`@graphysdk/react-renderer@${PACKAGES['react-renderer'].version}\` (root and \`/editable\` entries)`,
].join(' and ');

const header = `<!-- GENERATED FILE — do not edit. -->

# Type reference

Generated from ${versions}.

> Signatures, option keys, and accepted values from the built \`.d.ts\` files,
> with JSDoc. Includes commands and annotations from \`@graphysdk/viz-engine\`,
> handles and hooks from \`@graphysdk/react-renderer\`, and editor components
> from \`@graphysdk/react-renderer/editable\`. Referenced types appear under
> "Supporting types" where available; external and built-in types are omitted.
> See the other references for usage.${stoppedNote}
`;

const output = `${header}\n${sections.join('\n\n')}\n`;
const supportingCount = Object.values(supporting).reduce((total, entries) => total + entries.size, 0);
const summary = `${GROUPS.length} groups, ${rootNames.size} roots, ${supportingCount} supporting types, ${stopped.size} stopped, ${unresolved.size} unresolved external names`;

if (checkMode) {
  let current = null;
  try {
    current = readFileSync(outPath, 'utf8');
  } catch {
    // Missing file counts as stale.
  }
  if (current !== output) {
    console.error(`STALE: ${outPath} does not match the built packages — regenerate it. (${summary})`);
    process.exit(1);
  }
  console.log(`Fresh: ${outPath} (${summary})`);
} else {
  writeFileSync(outPath, output);
  console.log(`Wrote ${outPath} — ${summary}`);
  if (unresolved.size > 0) console.log(`Unresolved (lib/external, left opaque): ${[...unresolved].sort().join(', ')}`);
}
