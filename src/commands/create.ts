import {
	confirm,
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
import { saveManifest } from "../lib/api.ts";
import { buildPlan } from "../lib/plan.ts";
import { formatOverview } from "../lib/format.ts";
import type { StackerManifest, PackageManager } from "../lib/types.ts";

function sym(v: unknown): boolean {
	return typeof v === "symbol";
}

export async function createCommand(apiBase?: string) {
	log.message(pc.dim("Configure your stack interactively. We'll save it and give you a template ID.\n"));

	// ── Project name ──────────────────────────────────────────────────────
	const nameRes = await text({
		message: "Project name",
		placeholder: "my-app",
		validate: (v) => (!(v ?? "").trim() ? "Name is required." : undefined),
	});
	if (sym(nameRes)) process.exit(0);
	const name = (nameRes as string).trim();

	// ── Package manager ───────────────────────────────────────────────────
	const pmRes = await select<PackageManager>({
		message: "Package manager",
		options: [
			{ value: "bun", label: "bun", hint: "recommended" },
			{ value: "pnpm", label: "pnpm" },
			{ value: "npm", label: "npm" },
			{ value: "yarn", label: "yarn" },
		],
		initialValue: "bun",
	});
	if (sym(pmRes)) process.exit(0);
	const packageManager = pmRes as PackageManager;

	// ── Framework ─────────────────────────────────────────────────────────
	const fwRes = await select<string>({
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
	if (sym(fwRes)) process.exit(0);
	const framework = fwRes as string;

	// ── Runtime (only for Vite) ───────────────────────────────────────────
	let runtime = "React";
	if (framework === "Vite") {
		const rtRes = await select<string>({
			message: "Runtime",
			options: [
				{ value: "React", label: "React" },
				{ value: "Solid", label: "Solid" },
			],
		});
		if (sym(rtRes)) process.exit(0);
		runtime = rtRes as string;
	}

	// ── UI system ─────────────────────────────────────────────────────────
	const uiRes = await select<string>({
		message: "UI system",
		options: [
			{ value: "shadcn/ui", label: "shadcn/ui", hint: "Tailwind + Radix" },
			{ value: "None", label: "None / custom" },
		],
	});
	if (sym(uiRes)) process.exit(0);
	const uiSystem = uiRes as string;

	let shadcnConfig: StackerManifest["frontend"]["shadcn"] = null;
	if (uiSystem === "shadcn/ui") {
		const styleRes = await select<string>({
			message: "shadcn/ui style",
			options: [
				{ value: "new-york", label: "New York", hint: "recommended" },
				{ value: "default", label: "Default" },
			],
			initialValue: "new-york",
		});
		if (sym(styleRes)) process.exit(0);

		const colorRes = await select<string>({
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
		if (sym(colorRes)) process.exit(0);

		shadcnConfig = {
			base: "radix",
			style: styleRes as string,
			baseColor: colorRes as string,
			components: [],
		};
	}

	// ── TanStack add-ons ──────────────────────────────────────────────────
	const tanstackRes = await multiselect<string>({
		message: "TanStack add-ons",
		options: [
			{ value: "query", label: "TanStack Query" },
			{ value: "form", label: "TanStack Form" },
			{ value: "table", label: "TanStack Table" },
			{ value: "store", label: "TanStack Store" },
			{ value: "devtools", label: "Query Devtools" },
		],
		required: false,
	});
	if (sym(tanstackRes)) process.exit(0);
	const tanstackPackages = tanstackRes as string[];

	// ── Database ──────────────────────────────────────────────────────────
	const dbRes = await select<string>({
		message: "Database",
		options: [
			{ value: "None", label: "None" },
			{ value: "Neon", label: "Neon", hint: "serverless Postgres" },
			{ value: "Convex", label: "Convex", hint: "real-time document DB" },
			{ value: "SQLite", label: "SQLite / Turso" },
		],
		initialValue: "None",
	});
	if (sym(dbRes)) process.exit(0);
	const database = dbRes as string;

	// ── ORM ───────────────────────────────────────────────────────────────
	let orm = "None";
	if (database !== "None" && database !== "Convex") {
		const ormRes = await select<string>({
			message: "ORM",
			options: [
				{ value: "None", label: "None" },
				{ value: "Drizzle", label: "Drizzle ORM", hint: "lightweight + typesafe" },
				{ value: "Prisma", label: "Prisma", hint: "full-featured ORM" },
			],
			initialValue: "Drizzle",
		});
		if (sym(ormRes)) process.exit(0);
		orm = ormRes as string;
	}

	// ── Auth ──────────────────────────────────────────────────────────────
	const authRes = await select<string>({
		message: "Auth",
		options: [
			{ value: "None", label: "None" },
			{ value: "BetterAuth", label: "BetterAuth", hint: "open-source" },
			{ value: "Clerk", label: "Clerk", hint: "hosted auth" },
			{ value: "WorkOS", label: "WorkOS", hint: "enterprise auth" },
		],
		initialValue: "None",
	});
	if (sym(authRes)) process.exit(0);
	const auth = authRes as string;

	// ── API Layer ─────────────────────────────────────────────────────────
	const apiLayerRes = await select<string>({
		message: "API layer",
		options: [
			{ value: "None", label: "None" },
			{ value: "tRPC", label: "tRPC", hint: "type-safe RPC" },
			{ value: "ORPC", label: "oRPC", hint: "OpenAPI-compatible RPC" },
			{ value: "Apollo Client", label: "Apollo Client", hint: "GraphQL" },
		],
		initialValue: "None",
	});
	if (sym(apiLayerRes)) process.exit(0);
	const apiLayer = apiLayerRes as string;

	// ── Git & install ─────────────────────────────────────────────────────
	const gitRes = await confirm({ message: "Initialize git?", initialValue: true });
	if (sym(gitRes)) process.exit(0);

	const installRes = await confirm({ message: "Install dependencies?", initialValue: true });
	if (sym(installRes)) process.exit(0);

	// ── Build manifest ────────────────────────────────────────────────────
	const manifest: StackerManifest = {
		version: 1,
		project: {
			name,
			packageManager,
			git: gitRes as boolean,
			install: installRes as boolean,
		},
		starter: { framework, runtime, id: "" },
		frontend: {
			uiSystem: uiSystem === "None" ? "" : uiSystem,
			shadcn: shadcnConfig,
			tanstackAddons: tanstackPackages,
		},
		backend: {
			database: database === "None" ? undefined : database,
			orm: orm === "None" ? undefined : orm,
			auth: auth === "None" ? undefined : auth,
			apiLayer: apiLayer === "None" ? undefined : apiLayer,
		},
	};

	// ── Confirm & save ────────────────────────────────────────────────────
	const steps = buildPlan(manifest, name, null);
	note(formatOverview(manifest, name, steps, null), pc.inverse(" Your stack "));

	const okRes = await confirm({ message: "Save this template and get an ID?", initialValue: true });
	if (!okRes || sym(okRes)) {
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
