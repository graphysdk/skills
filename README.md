# @graphysdk/skills

Agent skills for integrating [Graphy](https://graphy.dev) into your codebase. Use them with Claude Code, Cursor, OpenCode, Cline, Codex or any other coding agent that supports the [Agent Skills format](https://agentskills.io) — so the assistant knows how to wire up Graphy correctly the first time.

## Install

You can consume this repo two ways. Both work from the same source — pick whichever fits your tooling.

### Claude Code plugin marketplace

In Claude Code, send these to the agent:

```
/plugin marketplace add graphysdk/skills
/plugin install graphy@sdk
/reload-plugins
```

Then prompt as you normally would (e.g. *"install the Graphy SDK"*, *"set up Graphy in this project"*) — Claude auto-routes based on the prompt. You can also invoke the skill explicitly with `/graphy:install`.

### Vercel Labs `skills` CLI (cross-agent)

In your terminal:

```bash
npx skills add graphysdk/skills
```

Supports 50+ agents (Cursor, OpenCode, Cline, Codex, Claude Code, etc.) — make sure your target agent is checked in the picker. Skills install into your project's `.<agent>/skills/` directory; pass `--global` for `~/<agent>/skills/`.

Then restart your agent session and prompt as you normally would, or invoke explicitly with `/graphy-sdk-install`.

## Available skills

| Skill | What it does |
|---|---|
| [`graphy-sdk-install`](./skills/graphy-sdk-install/SKILL.md) | Install the Graphy SDK (`@graphysdk/viz-engine` + `@graphysdk/react-renderer`) and render a first graph. Covers private-registry auth, installing the alpha versions, prerequisites (React 19, bundler CSS support), and troubleshooting. |

All skills live under [`skills/`](./skills/) — one directory per skill, each containing its `SKILL.md` (plus any optional supporting files). The `skills` CLI auto-discovers everything in there.

## How skills work

Each skill is a directory with a `SKILL.md` file containing YAML frontmatter (`name`, `description`) and a Markdown body. Once installed, the agent will:

- **Auto-invoke** the skill when your prompt matches its `description` (e.g. *"add Graphy to this app"* triggers `graphy-sdk-install`).
- **Respond to explicit invocation** via the slash trigger (`/graphy:install` for the Claude Code plugin, `/graphy-sdk-install` for the Vercel CLI).

The agent reads the `SKILL.md` body as its instructions for the task — there's no runtime, just structured prose.

## Contributing

To add or update a skill:

1. Add a directory under [`skills/`](./skills/) named after the skill (matching the `name` field in its frontmatter).
2. Write a `SKILL.md` with frontmatter (`name`, `description`) and a body.
3. If the skill should be available through the Claude Code plugin too, add a symlink under [`plugin-skills/`](./plugin-skills/) (see [AGENTS.md](./AGENTS.md)).
4. Add a row to the table above.
5. Open a PR.

## License

MIT
