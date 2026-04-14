import pc from "picocolors";
import type { StackerManifest, PlanStep } from "../types";
import {
	resolveTanstackCreateAddOns,
	TANSTACK_ADDON_PACKAGES,
} from "./resolve.ts";
import { resolveShadcnCliStyle } from "./pm.ts";

export function wrapWords(text: string, width: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let line = "";
	for (const w of words) {
		const next = line ? `${line} ${w}` : w;
		if (next.length <= width) {
			line = next;
		} else {
			if (line) lines.push(line);
			line = w.length > width ? w.slice(0, width) : w;
		}
	}
	if (line) lines.push(line);
	return lines;
}

export function formatOverview(
	manifest: StackerManifest,
	targetDir: string,
	steps: PlanStep[],
	supportedTanstackAddOns?: Set<string> | null,
): string {
	const rows: string[] = [];
	const add = (label: string, value: string) => {
		rows.push(`${pc.dim(label.padEnd(16))} ${value}`);
	};

	add("Folder", pc.cyan(targetDir));
	add("Framework", `${manifest.starter.framework} · ${manifest.starter.runtime}`);
	add("Package mgr", manifest.project.packageManager);
	add("Git", manifest.project.git ? pc.green("yes") : pc.dim("no"));
	add("Install deps", manifest.project.install ? pc.green("yes") : pc.dim("no"));
	add("UI", manifest.frontend.uiSystem || pc.dim("none"));

	const shadcn = manifest.frontend.shadcn;
	if (shadcn?.components?.length) {
		rows.push("");
		rows.push(pc.bold("shadcn/ui"));
		rows.push(pc.dim(`  Base: ${shadcn.base}`));
		if (shadcn.style) {
			rows.push(pc.dim(`  Style: ${shadcn.style} → ${resolveShadcnCliStyle(shadcn.style)}`));
		}
		if (shadcn.baseColor) rows.push(pc.dim(`  Color: ${shadcn.baseColor}`));
		if (shadcn.tweakcnTheme) rows.push(pc.dim(`  Theme: ${shadcn.tweakcnTheme}`));
		rows.push(pc.dim(`  Components (${shadcn.components.length}):`));
		for (const line of wrapWords(shadcn.components.join(", "), 64)) {
			rows.push(`  ${pc.cyan(line)}`);
		}
	}

	if (manifest.frontend.tanstackAddons.length > 0) {
		rows.push("");
		rows.push(pc.bold("TanStack add-ons"));
		rows.push(`  ${pc.cyan(manifest.frontend.tanstackAddons.join(", "))}`);
		if (manifest.starter.framework === "TanStack Start") {
			const requested = resolveTanstackCreateAddOns(manifest);
			const resolved =
				supportedTanstackAddOns && supportedTanstackAddOns.size > 0
					? requested.filter((id) => supportedTanstackAddOns.has(id))
					: requested;
			rows.push(pc.dim(`  CLI add-ons: ${resolved.join(", ") || "none"}`));
		}
	}

	const pkgs = manifest.addons?.packages ?? [];
	const tanstackPkgs =
		manifest.starter.framework === "TanStack Start"
			? []
			: manifest.frontend.tanstackAddons
					.map((id) => TANSTACK_ADDON_PACKAGES[id])
					.filter((v): v is string => Boolean(v));
	const installPkgs = [...new Set([...tanstackPkgs, ...pkgs])];
	if (installPkgs.length > 0) {
		rows.push("");
		rows.push(pc.bold("Extra packages"));
		rows.push(`  ${pc.cyan(installPkgs.join(", "))}`);
	}

	const b = manifest.backend;
	if (b && (b.database || b.orm || b.auth || b.apiLayer)) {
		rows.push("");
		rows.push(pc.bold("Backend"));
		if (b.database) add("  Database", b.database);
		if (b.orm) add("  ORM", b.orm);
		if (b.auth) add("  Auth", b.auth);
		if (b.apiLayer) add("  API layer", b.apiLayer);
	}

	rows.push("");
	rows.push(pc.bold("Plan"));
	for (let i = 0; i < steps.length; i++) {
		rows.push(`  ${pc.dim(`${i + 1}.`)} ${steps[i]!.title}`);
	}

	return rows.join("\n");
}
