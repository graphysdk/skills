# @graphysdk/skills

Agent skills for building with [Graphy](https://graphy.dev). Install into Claude Code, Cursor, OpenCode, Cline, Codex, or any other coding agent that supports the [Agent Skills format](https://agentskills.io), and your assistant knows how to set up the Graphy SDK and author graphs with it correctly the first time.

## Skills

| Skill | What it does |
|---|---|
| [`graphy-charts`](./skills/graphy-charts/SKILL.md) | Everything for building with the Graphy viz stack: installing and setting up the SDK (prerequisites, troubleshooting), then authoring graphs — grammar-of-graphics spec building (geoms, scales, transforms, coords), styling, slots, plugins, and storytelling (highlights, annotations). Includes recipes for common graph types and house styles, a generated type reference, a headless spec validator, and a checker that typechecks every code sample against the installed SDK. |
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
skills/<skill-name>/            # published copy of the skills (auto-discovered by the Claude Code plugin)
.claude-plugin/plugin.json      # Claude Code plugin manifest (skills/ is auto-discovered)
.claude-plugin/marketplace.json # plugin marketplace manifest
apps/graph-codegen/             # local chat bench: agent + live preview against the published skills
llms.txt                        # source of truth for graphy.dev/llms.txt — the agent-facing link index
pnpm-workspace.yaml             # catalog pinning the SDK version this copy was published with
```

`skills/graphy-charts` and `skills/graphy-editor` are copied here from the Graphy monorepo when an npm publish succeeds. Edits to those folders on this repo are overwritten on the next publish. The SDK versions in `pnpm-workspace.yaml` are updated to that published version in the same step. `apps/graph-codegen` lives only in this repo and reads the published skill copy.

## Development

Skill authoring, sample checks, type-reference generation, and evals live in the monorepo. See [MAINTAINING.md](MAINTAINING.md).

### Try graph-codegen: describe a graph, watch an agent build it

`apps/graph-codegen` is a small chat bench where a Claude agent, given nothing but the published `graphy-charts` skill, writes real `@graphysdk` chart code from your prompt and renders it in a live preview next to the conversation. Some things to try:

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
