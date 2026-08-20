# @graphysdk/skills

Agent skills for building with [Graphy](https://graphy.dev). Install into Claude Code, Cursor, OpenCode, Cline, Codex, or any other coding agent that supports the [Agent Skills format](https://agentskills.io), and your assistant knows how to set up the Graphy SDK and author graphs with it correctly the first time.

## Skills

| Skill | What it does |
|---|---|
| [`graphy-charts`](./skills/graphy-charts/SKILL.md) | Everything for building with the Graphy viz stack: installing and setting up the SDK (prerequisites, troubleshooting), then authoring graphs — grammar-of-graphics spec building (geoms, scales, transforms, coords), styling, theming, slots, plugins, and storytelling (highlights, annotations). Includes recipes for common graph types and house styles, a generated type reference, a headless spec validator, and a checker that typechecks every code sample against the installed SDK. |
| [`graphy-editor`](./skills/graphy-editor/SKILL.md) | Editing companion to `graphy-charts`: making a rendered chart editable (`@graphysdk/react-renderer/editable`), editing it programmatically or from an agent via the serializable command system (per-layer control included), undo/redo and command history, saving and restoring edited charts, point-and-click annotation editing on the canvas, and the optional pre-built editor panel with design-system adoption. Includes worked recipes for each integration shape and its own generated type reference over the editing surface. |

## Install

Two channels, same source — pick whichever fits your tooling.

### Claude Code plugin marketplace

In Claude Code:

```
/plugin marketplace add graphysdk/skills
/plugin install graphy@graphysdk
/reload-plugins
```

Then prompt as you normally would (*"set up Graphy in this project"*, *"build a stacked bar graph of revenue by region"*, *"make this chart editable with undo"*) — Claude loads the right skill and routes to the right reference. Explicit triggers: `/graphy:charts`, `/graphy:editor`.

### Vercel Labs `skills` CLI (cross-agent)

In your terminal:

```bash
npx skills add graphysdk/skills
```

Supports 50+ agents (Cursor, OpenCode, Cline, Codex, Claude Code, etc.) — make sure your target agent is checked in the picker. Skills install into your project's `.<agent>/skills/` directory; pass `--global` for `~/<agent>/skills/`. Restart your agent session, then prompt as usual. Explicit triggers: `/graphy-charts`, `/graphy-editor`.

## Repo layout

```
skills/<skill-name>/            # canonical skills — what both channels ship (auto-discovered by the Claude Code plugin)
.claude-plugin/marketplace.json # plugin marketplace manifest
apps/graph-codegen/             # dev bench: agent + live preview for testing graphy-charts
llms.txt                        # source of truth for graphy.dev/llms.txt — the agent-facing link index
pnpm-workspace.yaml             # workspace + catalog pinning the SDK versions used repo-wide
package.json                    # deps for the skills' helper scripts
```

## Development

This repo is a pnpm workspace. The Graphy SDK versions everything builds against are defined once, in the `catalog:` block of `pnpm-workspace.yaml` — to move to a new SDK release, bump them there, run `pnpm install`, and regenerate the type reference.

```bash
pnpm install

# graphy-charts helper scripts (run from the repo root)
node skills/graphy-charts/scripts/validate-spec.mjs path/to/spec.mjs   # compile a spec, print diagnostics
node skills/graphy-charts/scripts/generate-types-reference.mjs        # regenerate reference/types.md (--check for CI)
node skills/graphy-charts/scripts/check-samples.mjs                   # verify every code sample against the installed SDK

# graphy-editor helper scripts
node skills/graphy-editor/scripts/generate-types-reference.mjs        # regenerate the editing-surface types.md (--check for CI)
node skills/graphy-charts/scripts/check-samples.mjs skills/graphy-editor   # same sample checker, pointed at the editor skill
```

`check-samples.mjs` is the guard against documentation drift: it resolves every `@graphysdk` import in
the skill's fenced samples and typechecks each block against the packages currently installed. Run it
after any SDK bump — a sample that no longer compiles is a doc that no longer works.

### Try graph-codegen: describe a graph, watch an agent build it

`apps/graph-codegen` is the fastest way to see what these skills can do. It's a small chat bench where a Claude agent, given nothing but the `graphy-charts` skill, writes real `@graphysdk` chart code from your prompt and renders it in a live preview next to the conversation. Some things to try:

- **Upload a CSV** and ask it to visualize the data — it picks the chart type and the built-in theme that fit best.
- **Upload a screenshot of any chart** you've seen elsewhere and ask it to recreate it with Graphy.
- **Upload your data plus brand assets** (e.g. a screenshot of your product) and ask for a chart in your brand's theme.

```bash
pnpm install
pnpm --filter graph-codegen dev
cd apps/graph-codegen
pnpm dev
```

Then open http://localhost:5190 and start prompting.

You'll need Node 22+ and pnpm. For Claude access, set `ANTHROPIC_API_KEY` in your environment or in `apps/graph-codegen/.env`; if you're logged into the Claude Code CLI, no key is needed — the bench uses its credentials.

## License

MIT
