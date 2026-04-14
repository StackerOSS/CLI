import type { PackageManager } from "../types";

export const DEFAULT_API_BASE = "https://stacker.ranveersoni.me";

export const TANSTACK_ADDON_PACKAGES: Record<string, string> = {
	query: "@tanstack/react-query",
	router: "@tanstack/react-router",
	form: "@tanstack/react-form",
	table: "@tanstack/react-table",
	store: "@tanstack/react-store",
	db: "@tanstack/react-db",
	devtools: "@tanstack/react-query-devtools",
};

export const FRAMEWORK_LABELS: Record<string, string> = {
	"Next.js": "Next.js (App Router)",
	"Vite": "Vite",
	"TanStack Start": "TanStack Start",
	"React Router": "React Router v7",
	"Astro": "Astro",
	"Laravel": "Laravel",
};

export const PM_RUNNERS: Record<PackageManager, string> = {
	bun: "bunx",
	pnpm: "pnpm dlx",
	yarn: "yarn dlx",
	npm: "npx",
};

export const PM_INSTALL: Record<PackageManager, string> = {
	bun: "bun add",
	pnpm: "pnpm add",
	yarn: "yarn add",
	npm: "npm install",
};
