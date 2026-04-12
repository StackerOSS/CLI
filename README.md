<div align="center">

<br />

```
 ███████╗████████╗ █████╗  ██████╗██╗  ██╗███████╗██████╗
 ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
 ███████╗   ██║   ███████║██║     █████╔╝ █████╗  ██████╔╝
 ╚════██║   ██║   ██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
 ███████║   ██║   ██║  ██║╚██████╗██║  ██╗███████╗██║  ██║
 ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

**Build your stack. Instantly.**

The CLI companion to [Stacker](https://stacker.ranveersoni.me) — scaffold a production-ready project
in one command from a template you built visually in the browser.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](#)
[![Runtime](https://img.shields.io/badge/runtime-bun-orange.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#)

</div>

---

## What it does

You configure your stack on [stacker.ranveersoni.me/create](https://stacker.ranveersoni.me/create) —
pick a framework, UI system, auth, ORM, API layer, and TanStack add-ons — and the site gives you
a short **template ID**.

The CLI takes that ID, fetches your configuration, and runs the right scaffolding commands
in the right order — automatically:

```
bunx stacker-cli xCjNK1
```

That one command will:

1. Scaffold your chosen framework (`create-next-app`, `@tanstack/cli create`, `create-vite`, etc.)
2. Initialize shadcn/ui with your exact style, base color, and component selection
3. Apply your tweakcn theme
4. Install TanStack add-ons (Query, Router, Form, Table, Store…)
5. Install any extra npm packages you selected
6. Drop a `stacker.json` in the project folder as a reproducible config snapshot

---

## Install

No global install needed. Run directly with your package manager:

```bash
# bun (recommended)
bunx stacker-cli <templateId>

# pnpm
pnpm dlx stacker-cli <templateId>

# npm
npx stacker-cli <templateId>

# yarn
yarn dlx stacker-cli <templateId>
```

---

## Usage

### With a template ID

```bash
bunx stacker-cli xCjNK1
```

Fetches the template, shows you a full plan, asks for confirmation, then runs.

### Interactive

```bash
bunx stacker-cli
```

Prompts you to enter a template ID if you don't pass one.

### Options

| Flag | Description |
|---|---|
| `[templateId]` | Template ID from stacker.ranveersoni.me |
| `-d, --dir <dir>` | Target directory (defaults to project name from template) |
| `--api <url>` | Override the Stacker API base URL |
| `-y, --yes` | Skip the confirmation prompt and run immediately |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

### Examples

```bash
# scaffold to a specific folder
bunx stacker-cli xCjNK1 --dir my-app

# skip confirmation (great for CI)
bunx stacker-cli xCjNK1 --yes

# point at a self-hosted Stacker instance
bunx stacker-cli xCjNK1 --api https://stacker.ranveersoni.me
```

---

## How it works

```
stacker.ranveersoni.me/create
        │
        │  configure stack → get template ID
        ▼
bunx stacker-cli <id>
        │
        ├─ 1. fetch manifest from /api/templates/<id>
        ├─ 2. resolve add-ons supported by the installed TanStack CLI
        ├─ 3. display a full overview of the plan
        ├─ 4. confirm (or auto-confirm with --yes)
        └─ 5. run each step in sequence
                ├─ scaffold framework
                ├─ init shadcn/ui + apply tweakcn theme
                └─ install packages
```

The manifest is a plain JSON file (`stacker.json`) that gets saved in your project root.
You can commit it, share it, or re-run it later.

---

## Supported frameworks

| Framework | Scaffolder used |
|---|---|
| Next.js | `create-next-app@latest` |
| Vite | `create-vite@latest` |
| TanStack Start | `@tanstack/cli create` |
| React Router | `create-react-router@latest` |
| Astro | `create astro@latest` |
| Laravel | `laravel new` |

---

## Supported add-ons (via TanStack Start)

When scaffolding a TanStack Start project, the CLI passes add-ons directly to
`@tanstack/cli create`. Supported add-ons are auto-detected from the installed
TanStack CLI version so you always get a valid set.

Includes: `tanstack-query`, `form`, `table`, `store`, `db`, `shadcn`, `drizzle`,
`prisma`, `neon`, `convex`, `clerk`, `workos`, `better-auth`, `trpc`, `orpc`,
`sentry`, `posthog`, `biome`, `eslint`, `storybook`, `t3env`, and more.

---

## Development

```bash
# clone the repo
git clone https://github.com/StackerOSS/CLI
cd CLI

# install dependencies
bun install

# run in dev mode
bun run start

# compile to a single native binary
bun run build
```

The compiled binary (`stacker.exe` on Windows, `stacker` elsewhere) is self-contained
and needs no runtime.

---

## Environment

| Variable | Description |
|---|---|
| `STACKER_API_BASE` | Override the default API URL (`https://stacker.ranveersoni.me`) |

---

<div align="center">

Made with <3 and a lot of bad decisions! · [stacker.ranveersoni.me](https://stacker.ranveersoni.me)

</div>