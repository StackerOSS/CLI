import { confirm, log, note, spinner, text } from "@clack/prompts";
import path from "node:path";
import pc from "picocolors";
import { fetchManifest, normalizeApiBase } from "../lib/api.ts";
import { buildPlan, discoverSupportedTanstackAddOns } from "../lib/plan.ts";
import { formatOverview } from "../lib/format.ts";
import { runStep, formatMs } from "../lib/run.ts";
import type { StackerManifest } from "../lib/types.ts";

export async function initCommand(
	initialTemplateId?: string,
	dir?: string,
	apiBase?: string,
	autoYes = false,
) {
	const nonInteractive = autoYes || !process.stdout.isTTY;
	let templateId = initialTemplateId;

	if (!templateId) {
		const res = await text({
			message: "Template ID from stacker.ranveersoni.me/create",
			placeholder: "e.g. xCjNK1",
			validate: (v) => (!v ? "Template ID is required." : undefined),
		});
		if (typeof res === "symbol") process.exit(0);
		templateId = res;
	}

	const s = nonInteractive ? null : spinner();
	s?.start(`Fetching template ${pc.cyan(templateId)}…`);
	let manifest: StackerManifest;
	try {
		manifest = await fetchManifest(templateId, apiBase);
		s?.stop("Template loaded.");
	} catch (err) {
		const base = normalizeApiBase(apiBase);
		s?.stop(pc.red("Failed to load template."));
		log.error(`${err instanceof Error ? err.message : String(err)}`);
		log.info(`Generate one at ${pc.cyan(`${base}/create`)}`);
		process.exit(1);
	}

	const supportedAddOns =
		manifest.starter.framework === "TanStack Start"
			? discoverSupportedTanstackAddOns(manifest.project.packageManager)
			: null;

	const targetDir = (dir?.trim() || manifest.project.name || "my-stacker-app").trim();
	const steps = buildPlan(manifest, targetDir, supportedAddOns);

	note(formatOverview(manifest, targetDir, steps, supportedAddOns), pc.inverse(" Your scaffold "));

	if (!autoYes && !nonInteractive) {
		const ok = await confirm({
			message: "Run these steps now?",
			initialValue: true,
		});
		if (!ok || typeof ok === "symbol") {
			log.warn("Cancelled — nothing was changed.");
			process.exit(0);
		}
	} else {
		log.message(pc.dim("Auto-confirmed (--yes)"));
	}

	const startedAll = Date.now();
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i]!;
		log.step(`[${i + 1}/${steps.length}] ${step.title}`);
		try {
			const elapsed = await runStep(step);
			log.success(`Done in ${formatMs(elapsed)}`);
		} catch (e) {
			log.error(e instanceof Error ? e.message : "Step failed");
			process.exit(1);
		}
	}

	await Bun.write(
		path.join(targetDir, "stacker.json"),
		JSON.stringify(manifest, null, 2),
	);

	const elapsed = formatMs(Date.now() - startedAll);
	log.success(`Saved ${pc.cyan("stacker.json")} in ${pc.cyan(targetDir)} (${elapsed})`);
	log.message(
		`${pc.bold("Next steps:")}\n  ${pc.cyan(`cd ${targetDir}`)}\n  ${pc.cyan(`${manifest.project.packageManager} run dev`)}`,
	);
}
