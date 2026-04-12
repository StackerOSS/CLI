import { spawnSync } from "node:child_process";
import type { StackerManifest } from "./types.ts";
import { TANSTACK_ADDON_PACKAGES } from "./constants.ts";
import { getPackageRunner } from "./pm.ts";

export function resolveTanstackCreateAddOns(manifest: StackerManifest): string[] {
	const addons: string[] = [];
	const unique = <T>(arr: T[]) => [...new Set(arr.filter(Boolean))];

	const tanstackMap: Record<string, string> = {
		query: "tanstack-query",
		form: "form",
		table: "table",
		store: "store",
		db: "db",
	};
	for (const id of manifest.frontend.tanstackAddons) {
		const mapped = tanstackMap[id];
		if (mapped) addons.push(mapped);
	}

	const b = manifest.backend;
	if (b?.database === "Convex") addons.push("convex");
	if (b?.database === "Neon") addons.push("neon");
	if (b?.orm === "Prisma") addons.push("prisma");
	if (b?.orm === "Drizzle") addons.push("drizzle");
	if (b?.auth === "Clerk") addons.push("clerk");
	if (b?.auth === "WorkOS") addons.push("workos");
	if (b?.auth === "BetterAuth") addons.push("better-auth");
	if (b?.apiLayer === "MCP") addons.push("mcp");
	if (b?.apiLayer === "ORPC") addons.push("oRPC");
	if (b?.apiLayer === "tRPC") addons.push("tRPC");
	if (b?.apiLayer === "Apollo Client") addons.push("apollo-client");

	for (const integration of manifest.addons?.integrations ?? []) {
		const lower = integration.toLowerCase();
		if (lower === "cloudflare") addons.push("cloudflare");
		if (lower === "netlify") addons.push("netlify");
		if (lower === "railway") addons.push("railway");
		if (lower === "sentry") addons.push("sentry");
		if (lower === "clerk") addons.push("clerk");
		if (lower === "workos") addons.push("workos");
		if (lower === "neon") addons.push("neon");
		if (lower === "prisma") addons.push("prisma");
	}

	const deployment = manifest.addons?.deployment?.toLowerCase();
	if (deployment === "cloudflare") addons.push("cloudflare");
	if (deployment === "netlify") addons.push("netlify");
	if (deployment === "railway") addons.push("railway");
	if (deployment === "nitro") addons.push("nitro");

	const monitoring = manifest.addons?.monitoring?.toLowerCase();
	if (monitoring === "sentry") addons.push("sentry");
	if (monitoring === "posthog") addons.push("posthog");

	if (manifest.addons?.i18n?.toLowerCase() === "paraglide") addons.push("paraglide");

	for (const tool of manifest.addons?.devTooling ?? []) {
		const lower = tool.toLowerCase();
		if (lower === "storybook") addons.push("storybook");
		if (lower === "biome") addons.push("biome");
		if (lower === "eslint") addons.push("eslint");
		if (lower === "t3env") addons.push("t3env");
		if (lower === "compiler") addons.push("compiler");
	}

	if (manifest.frontend.uiSystem === "shadcn/ui") addons.push("shadcn");

	return unique(addons) as string[];
}

export function discoverSupportedTanstackAddOns(
	pm: StackerManifest["project"]["packageManager"],
): Set<string> | null {
	const runner = getPackageRunner(pm);
	const result = spawnSync(
		`${runner} @tanstack/cli@latest create --list-add-ons`,
		{ shell: true, encoding: "utf8" },
	);
	if (result.status !== 0) return null;
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	const ids = [...output.matchAll(/^\s*\*?\s*([A-Za-z0-9-]+):/gm)].map(
		(m) => m[1]!,
	);
	if (ids.length === 0) return null;
	return new Set(ids);
}

export { TANSTACK_ADDON_PACKAGES };
