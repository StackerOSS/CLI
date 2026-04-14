import { confirm, log, note, spinner, text } from "@clack/prompts";
import path from "node:path";
import fs from "node:fs";
import pc from "picocolors";

import { fetchManifest, normalizeApiBase } from "../lib/api.ts";
import { buildPlan, discoverSupportedTanstackAddOns } from "../lib/plan.ts";
import { formatOverview } from "../lib/format.ts";
import { runStep, formatMs } from "../lib/run.ts";
import type { StackerManifest, PlanStep } from "../types";

export async function initCommand(
	initialTemplateId?: string,
	dir?: string,
	apiBase?: string,
	autoYes = false,
) {
	const isTTY = process.stdout.isTTY === true;
	const nonInteractive = autoYes || !isTTY;

	let templateId = initialTemplateId;

	if (!templateId) {
		if (nonInteractive) {
			log.error("No template ID provided. Pass one as an argument: stacker <templateId>");
			process.exit(1);
		}
		const res = await text({
			message: "Template ID from stacker.ranveersoni.me/create",
			placeholder: "e.g. xCjNK1",
			validate: (v) => (!v ? "Template ID is required." : undefined),
		});
		if (typeof res === "symbol") process.exit(0);
		templateId = res;
	}

	const s = isTTY ? spinner() : null;

	s?.start(`Loading template ${pc.cyan(templateId)}…`);
	if (!isTTY) log.message(`Loading template ${pc.cyan(templateId)}…`);

	let manifest: StackerManifest;
	let supportedAddOns: Set<string> | null;
	let steps: PlanStep[];
	let targetDir: string;

	try {
		// 1. Fetch
		manifest = await fetchManifest(templateId, apiBase);

		// 2. Resolve add-ons
		s?.message("Resolving add-ons…");
		supportedAddOns =
			manifest.starter.framework === "TanStack Start"
				? discoverSupportedTanstackAddOns(manifest.project.packageManager)
				: null;

		// 3. Build plan
		targetDir = (dir?.trim() || manifest.project.name || "my-stacker-app").trim();

		s?.message("Building execution plan…");
		steps = buildPlan(manifest, targetDir, supportedAddOns);

		s?.stop("Template loaded.");
		if (!isTTY) log.message("Template loaded.");
	} catch (err) {
		const base = normalizeApiBase(apiBase);
		s?.stop(pc.red("Failed to load template."));
		log.error(`${err instanceof Error ? err.message : String(err)}`);
		log.info(`Generate one at ${pc.cyan(`${base}/create`)}`);
		process.exit(1);
	}

	//  Overview
	note(formatOverview(manifest, targetDir, steps, supportedAddOns), pc.inverse(" Your scaffold "));

	//  Folder exists warning
	const targetPath = path.resolve(targetDir);
	if (fs.existsSync(targetPath)) {
		const files = fs.readdirSync(targetPath);
		log.warn(
			pc.red(
				`Warning: Folder "${targetDir}" already exists (${files.length} items inside). Files may be overwritten.`
			)
		);
	}

	//  Confirm
	if (nonInteractive) {
		log.message(pc.dim(autoYes ? "Auto-confirmed (--yes)" : "Non-interactive mode — proceeding automatically."));
	} else {
		const ok = await confirm({
			message: "Run these steps now?",
			initialValue: true,
		});
		if (!ok || typeof ok === "symbol") {
			log.warn("Cancelled — nothing was changed.");
			process.exit(0);
		}
	}

	const startedAll = Date.now();

	//  Execute steps with spinner
	for (let i = 0; i < steps.length; i++) {
	const step = steps[i]!;
	const label = `[${i + 1}/${steps.length}] ${step.title}`;

	if (isTTY) {
		const s = spinner();
		s.start(label);

		try {
			const elapsed = await runStep(step);

			s.stop(pc.green(`${label} — Done in ${formatMs(elapsed)}`));
		} catch (e) {
			s.stop(pc.red(`${label} — Failed`));
			log.error(e instanceof Error ? e.message : "Step failed");
			process.exit(1);
		}
	} else {
		log.step(label);

		try {
			const elapsed = await runStep(step);
			log.success(`${label} — Done in ${formatMs(elapsed)}`);
		} catch (e) {
			log.error(e instanceof Error ? e.message : "Step failed");
			process.exit(1);
		}
	}
}

	//  Save manifest
	await Bun.write(
		path.join(targetDir, "stacker.json"),
		JSON.stringify(manifest, null, 2),
	);

	const elapsed = formatMs(Date.now() - startedAll);

	log.success(`Saved ${pc.cyan("stacker.json")} in ${pc.cyan(targetDir)} (${elapsed})`);
	log.message(
		`${pc.bold("Next steps:")}\n  ${pc.cyan(`cd ${targetDir}`)}\n  ${pc.cyan(`${manifest.project.packageManager} run dev`)}`
	);
}