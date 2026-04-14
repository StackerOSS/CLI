import {
	confirm,
	isCancel,
	log,
	multiselect,
	note,
	select,
	spinner,
	text,
} from "@clack/prompts";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { z } from "zod";
import {
	validateManifest,
	getZodErrorMessage,
	ProjectNameSchema,
	NextJsOptionsSchema,
	TanStackCliOptionsSchema,
	FrameworkSchema,
	RuntimeSchema,
	PackageManagerSchema,
} from "../types/schemas.ts";
import { saveManifest } from "../lib/api.ts";
import { buildPlan } from "../lib/plan.ts";
import { formatOverview } from "../lib/format.ts";
import type { StackerManifest } from "../types";

export async function createCommand(apiBase?: string) {
	log.message(pc.dim("Configure your stack interactively. We'll save it and give you a template ID.\n"));

	// ── Project name ──────────────────────────────────────────────────────
	const nameRes = await text({
		message: "Project name",
		placeholder: "my-app",
		validate: (v) => {
			if (!v?.trim()) return "Name is required.";
			const result = ProjectNameSchema.safeParse(v.trim().toLowerCase());
			if (!result.success) return result.error.issues[0]?.message;
			return undefined;
		},
	});
	if (isCancel(nameRes)) process.exit(0);
	const nameResult = ProjectNameSchema.safeParse((nameRes as string).trim().toLowerCase());
	if (!nameResult.success) {
		log.error(nameResult.error.issues[0]?.message ?? "Invalid project name");
		process.exit(1);
	}
	const name = nameResult.data;

	// ── Package manager ───────────────────────────────────────────────────
	const pmRes = await select({
		message: "Package manager",
		options: [
			{ value: "bun", label: "bun", hint: "recommended" },
			{ value: "pnpm", label: "pnpm" },
			{ value: "npm", label: "npm" },
			{ value: "yarn", label: "yarn" },
		],
		initialValue: "bun",
	});
	if (isCancel(pmRes)) process.exit(0);
	const packageManager = PackageManagerSchema.parse(pmRes);

	// ── Framework ─────────────────────────────────────────────────────────
	const fwRes = await select({
		message: "Framework",
		options: [
			{ value: "TanStack Start", label: "TanStack Start", hint: "SSR · React" },
			{ value: "Next.js", label: "Next.js", hint: "App Router · React" },
			{ value: "React Router", label: "React Router v7", hint: "Framework mode · React" },
			{ value: "Vite", label: "Vite", hint: "SPA · React / Solid" },
			{ value: "Astro", label: "Astro", hint: "MPA / SSR · multi-framework" },
			{ value: "Laravel", label: "Laravel", hint: "PHP · full-stack" },
		],
	});
	if (isCancel(fwRes)) process.exit(0);
	const framework = FrameworkSchema.parse(fwRes);

	// ── Next.js options ───────────────────────────────────────────────────
	let nextjsOptions = undefined;
	if (framework === "Next.js") {
		const srcDirRes = await confirm({ message: "Use src/ directory?", initialValue: false });
		if (isCancel(srcDirRes)) process.exit(0);

		const linterRes = await select({
			message: "Linter",
			options: [
				{ value: "eslint", label: "ESLint", hint: "recommended" },
				{ value: "biome", label: "Biome", hint: "fast linter + formatter" },
				{ value: "none", label: "None" },
			],
			initialValue: "eslint",
		});
		if (isCancel(linterRes)) process.exit(0);

		const bundlerRes = await select({
			message: "Bundler",
			options: [
				{ value: "turbopack", label: "Turbopack", hint: "recommended" },
				{ value: "webpack", label: "Webpack" },
			],
			initialValue: "turbopack",
		});
		if (isCancel(bundlerRes)) process.exit(0);

		const compilerRes = await confirm({ message: "Enable React Compiler (Babel)?", initialValue: false });
		if (isCancel(compilerRes)) process.exit(0);

		const agentsRes = await confirm({ message: "Include AGENTS.md for AI agents?", initialValue: true });
		if (isCancel(agentsRes)) process.exit(0);

		const aliasRes = await text({
			message: "Import alias",
			placeholder: "@/*",
			initialValue: "@/*",
		});
		if (isCancel(aliasRes)) process.exit(0);

		nextjsOptions = NextJsOptionsSchema.parse({
			srcDir: srcDirRes,
			importAlias: (aliasRes as string).trim() || "@/*",
			linter: linterRes,
			bundler: bundlerRes,
			reactCompiler: compilerRes,
			agentsMd: agentsRes,
		});
	}

	// ── TanStack CLI options ─────────────────────────────────────────────
	let tanstackOptions = undefined;
	if (framework === "TanStack Start") {
		const routerOnlyRes = await confirm({
			message: "Router-only mode (no SSR)?",
			initialValue: false,
		});
		if (isCancel(routerOnlyRes)) process.exit(0);

		const toolchainRes = await select({
			message: "Toolchain",
			options: [
				{ value: "eslint", label: "ESLint", hint: "recommended" },
				{ value: "biome", label: "Biome" },
				{ value: "rome", label: "Rome" },
				{ value: "none", label: "None" },
			],
			initialValue: "eslint",
		});
		if (isCancel(toolchainRes)) process.exit(0);

		const deploymentRes = await select({
			message: "Deployment target",
			options: [
				{ value: "none", label: "None" },
				{ value: "cloudflare-pages", label: "Cloudflare Pages" },
				{ value: "cloudflare-workers", label: "Cloudflare Workers" },
				{ value: "vercel", label: "Vercel" },
				{ value: "netlify", label: "Netlify" },
				{ value: "deno-deploy", label: "Deno Deploy" },
			],
			initialValue: "none",
		});
		if (isCancel(deploymentRes)) process.exit(0);

		const examplesRes = await confirm({
			message: "Include example pages?",
			initialValue: true,
		});
		if (isCancel(examplesRes)) process.exit(0);

		tanstackOptions = TanStackCliOptionsSchema.parse({
			routerOnly: routerOnlyRes,
			toolchain: toolchainRes,
			deployment: deploymentRes,
			examples: examplesRes,
		});
	}

	// ── Runtime (Vite, TanStack Start) ───────────────────────────────────
	let runtime = "React";
	if (framework === "Vite" || framework === "TanStack Start") {
		const rtRes = await select({
			message: "Runtime",
			options: [
				{ value: "React", label: "React" },
				{ value: "Solid", label: "Solid" },
			],
		});
		if (isCancel(rtRes)) process.exit(0);
		runtime = RuntimeSchema.parse(rtRes);
	}

	// ── UI system ─────────────────────────────────────────────────────────
	const uiRes = await select({
		message: "UI system",
		options: [
			{ value: "shadcn/ui", label: "shadcn/ui", hint: "Tailwind + Radix" },
			{ value: "None", label: "None / custom" },
		],
	});
	if (isCancel(uiRes)) process.exit(0);
	const uiSystem = uiRes === "None" ? "" : uiRes;

	let shadcnConfig = null;
	if (uiSystem === "shadcn/ui") {
		const styleRes = await select({
			message: "shadcn/ui style",
			options: [
				{ value: "new-york", label: "New York", hint: "recommended" },
				{ value: "default", label: "Default" },
			],
			initialValue: "new-york",
		});
		if (isCancel(styleRes)) process.exit(0);

		const colorRes = await select({
			message: "Base color",
			options: [
				{ value: "zinc", label: "Zinc" },
				{ value: "slate", label: "Slate" },
				{ value: "stone", label: "Stone" },
				{ value: "gray", label: "Gray" },
				{ value: "neutral", label: "Neutral" },
				{ value: "red", label: "Red" },
				{ value: "rose", label: "Rose" },
				{ value: "orange", label: "Orange" },
				{ value: "blue", label: "Blue" },
				{ value: "green", label: "Green" },
				{ value: "yellow", label: "Yellow" },
				{ value: "violet", label: "Violet" },
			],
			initialValue: "zinc",
		});
		if (isCancel(colorRes)) process.exit(0);

		shadcnConfig = {
			base: "radix" as const,
			style: styleRes,
			baseColor: colorRes,
			components: [],
		};
	}

	// ── TanStack add-ons ──────────────────────────────────────────────────
	const tanstackRes = await multiselect({
		message: "TanStack add-ons",
		options: [
			{ value: "query", label: "TanStack Query" },
			{ value: "router", label: "TanStack Router" },
			{ value: "form", label: "TanStack Form" },
			{ value: "table", label: "TanStack Table" },
			{ value: "store", label: "TanStack Store" },
			{ value: "devtools", label: "Query Devtools" },
		],
		required: false,
	});
	if (isCancel(tanstackRes)) process.exit(0);
	const tanstackPackages = tanstackRes as string[];

	// ── Database ──────────────────────────────────────────────────────────
	const dbRes = await select({
		message: "Database",
		options: [
			{ value: "None", label: "None" },
			{ value: "Neon", label: "Neon", hint: "serverless Postgres" },
			{ value: "Convex", label: "Convex", hint: "real-time document DB" },
			{ value: "SQLite", label: "SQLite / Turso" },
		],
		initialValue: "None",
	});
	if (isCancel(dbRes)) process.exit(0);
	const database = dbRes === "None" ? undefined : dbRes;

	// ── ORM ───────────────────────────────────────────────────────────────
	let orm = undefined;
	if (database && database !== "Convex") {
		const ormRes = await select({
			message: "ORM",
			options: [
				{ value: "Drizzle", label: "Drizzle ORM", hint: "lightweight + typesafe" },
				{ value: "Prisma", label: "Prisma", hint: "full-featured ORM" },
			],
			initialValue: "Drizzle",
		});
		if (isCancel(ormRes)) process.exit(0);
		orm = ormRes;
	}

	// ── Auth ──────────────────────────────────────────────────────────────
	const authRes = await select({
		message: "Auth",
		options: [
			{ value: "None", label: "None" },
			{ value: "BetterAuth", label: "BetterAuth", hint: "open-source" },
			{ value: "Clerk", label: "Clerk", hint: "hosted auth" },
			{ value: "WorkOS", label: "WorkOS", hint: "enterprise auth" },
		],
		initialValue: "None",
	});
	if (isCancel(authRes)) process.exit(0);
	const auth = authRes === "None" ? undefined : authRes;

	// ── API Layer ─────────────────────────────────────────────────────────
	const apiLayerRes = await select({
		message: "API layer",
		options: [
			{ value: "None", label: "None" },
			{ value: "tRPC", label: "tRPC", hint: "type-safe RPC" },
			{ value: "ORPC", label: "oRPC", hint: "OpenAPI-compatible RPC" },
			{ value: "Apollo Client", label: "Apollo Client", hint: "GraphQL" },
		],
		initialValue: "None",
	});
	if (isCancel(apiLayerRes)) process.exit(0);
	const apiLayer = apiLayerRes === "None" ? undefined : apiLayerRes;

	// ── Git & install ─────────────────────────────────────────────────────
	const gitRes = await confirm({ message: "Initialize git?", initialValue: true });
	if (isCancel(gitRes)) process.exit(0);

	const installRes = await confirm({ message: "Install dependencies?", initialValue: true });
	if (isCancel(installRes)) process.exit(0);

	// ── Build manifest with Zod validation ─────────────────────────────────
	const rawManifest = {
		version: 1 as const,
		project: {
			name,
			packageManager,
			git: gitRes,
			install: installRes,
		},
		starter: {
			framework,
			runtime,
			id: "",
			...(nextjsOptions && { nextjs: nextjsOptions }),
			...(tanstackOptions && { tanstack: tanstackOptions }),
		},
		frontend: {
			uiSystem,
			shadcn: shadcnConfig,
			tanstackAddons: tanstackPackages,
		},
		backend: {
			database,
			orm,
			auth,
			apiLayer,
		},
	};

	const manifestResult = validateManifest(rawManifest);
	if (!manifestResult) {
		log.error("Failed to build manifest. Please try again.");
		process.exit(1);
	}
	const manifest = manifestResult;

	// ── Confirm & save ────────────────────────────────────────────────────
	const steps = buildPlan(manifest, name, null);
	note(formatOverview(manifest, name, steps, null), pc.inverse(" Your stack "));

	const okRes = await confirm({ message: "Save this template and get an ID?", initialValue: true });
	if (isCancel(okRes) || !okRes) {
		log.warn("Cancelled — nothing was saved.");
		process.exit(0);
	}

	const s = spinner();
	s.start("Saving template…");
	let id: string;
	try {
		id = await saveManifest(manifest, apiBase);
		s.stop(pc.green("Saved!"));
	} catch (err) {
		s.stop(pc.red("Failed to save."));
		log.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	}

	// ── Save local stacker.json ───────────────────────────────────────────
	await writeFile("stacker.json", JSON.stringify(manifest, null, 2), "utf8");

	log.success(
		[
			`Template ID: ${pc.bold(pc.cyan(id))}`,
			``,
			`${pc.bold("Scaffold it anywhere:")}`,
			`  ${pc.cyan(`bunx @stacker/cli ${id}`)}`,
			``,
			`${pc.bold("Or open in the browser:")}`,
			`  ${pc.cyan(`https://stacker.ranveersoni.me/create?t=${id}`)}`,
		].join("\n"),
	);

	log.message(pc.dim(`Also saved stacker.json to ${path.resolve("stacker.json")}`));
}
