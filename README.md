<div align="center">

<br />

<img src="https://stacker.ranveersoni.me/logo.png" alt="Stacker Logo" width="200" />

**Build your stack. Instantly.**

The CLI companion to [Stacker](https://stacker.ranveersoni.me) scaffold a production-ready project
in one command from a template.

[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](#)
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
bunx  @stacker-oss/cli xCjNK1
```

---

## Install

```bash
# bun (recommended)
bunx  @stacker-oss/cli <templateId>

# pnpm
pnpm dlx  @stacker-oss/cli <templateId>

# npm
npx  @stacker-oss/cli <templateId>

# yarn
yarn dlx  @stacker-oss/cli <templateId>
```

---

## Usage

### With a template ID

```bash
bunx  @stacker-oss/cli xCjNK1
```

Fetches the template, shows you a full plan, asks for confirmation, then runs.

### Interactive

```bash
bunx  @stacker-oss/cli
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
bunx  @stacker-oss/cli xCjNK1 --dir my-app

# skip confirmation (great for CI)
bunx  @stacker-oss/cli xCjNK1 --yes

# point at a self-hosted Stacker instance
bunx  @stacker-oss/cli xCjNK1 --api https://stacker.ranveersoni.me
```

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