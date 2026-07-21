/**
 * Committed type surface for the gitignored `runtime.generated.ts` (a ~2.7 MB
 * artifact `scripts/build-vendor.mjs` writes; `predev` regenerates it). Lets
 * typecheck and lint pass in checkouts that never ran the vendor build — when
 * the generated module exists, TypeScript resolves it instead of this file.
 */

/** The bundled `@app/runtime` facade source (ESM), served for every allowed import specifier. */
export declare const runtimeModule: string;

/** The renderer's stylesheet, inlined into every generated preview page. */
export declare const runtimeCss: string;
