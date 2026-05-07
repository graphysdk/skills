# @graphysdk/skills

Agent skills for integrating [Graphy](https://graphy.dev) into your codebase. Use them with Claude Code, Cursor, OpenCode, Cline, Codex or any other coding agent that supports the [Anthropic Skills format](https://docs.anthropic.com/) — so the assistant knows how to wire up Graphy correctly the first time.

## Install

You can consume this repo two ways. Both work from the same source — pick whichever fits your tooling.

### Claude Code plugin marketplace

In Claude Code, send these to the agent:

```
/plugin marketplace add graphysdk/skills
/plugin install graphy@sdk
/reload-plugins
/graphy add a graphy chart
```

Replace the last line with whatever you want — *"visualize this dataset"*, *"add a chart of monthly sales"*, etc. Claude auto-routes based on the prompt.

### Vercel Labs `skills` CLI (cross-agent)

In your terminal:

```bash
npx skills add graphysdk/skills
```

Supports 50+ agents (Cursor, OpenCode, Cline, Codex, Claude Code, etc.) — make sure your target agent is checked in the picker. Skills install into your project's `.<agent>/skills/` directory; pass `--global` for `~/<agent>/skills/`.

Then restart your agent session and send to the agent:

```
/graphy add a graphy chart
```

Or just prompt as you normally would (e.g. *"add a graphy chart"*) — auto-routing kicks in based on the prompt.

## Available skills

| Skill | What it does |
|---|---|
| [`graphy`](./skills/graphy/SKILL.md) | Get from zero to a rendered graph in a React app using `@graphysdk/viz-engine` + `@graphysdk/react-canvas-renderer`. Covers private-registry auth, Pixi setup, and the declarative `GraphConfig` API. |

All skills live under [`skills/`](./skills/) — one directory per skill, each containing its `SKILL.md` (plus any optional supporting files). The `skills` CLI auto-discovers everything in there.

## How skills work

Each skill is a directory with a `SKILL.md` file containing YAML frontmatter (`name`, `description`) and a Markdown body. Once installed, the agent will:

- **Auto-invoke** the skill when your prompt matches its `description` (e.g. *"add a graph that shows monthly revenue"* triggers the `graphy` skill).
- **Respond to explicit invocation** via the `/graphy` slash trigger (works for both install methods).

The agent reads the `SKILL.md` body as its instructions for the task — there's no runtime, just structured prose.

## Contributing

To add or update a skill:

1. Add a directory under [`skills/`](./skills/) named after the skill (matching the `name` field in its frontmatter).
2. Write a `SKILL.md` with frontmatter (`name`, `description`) and a body.
3. Add a row to the table above.
4. Open a PR.

## License

MIT
