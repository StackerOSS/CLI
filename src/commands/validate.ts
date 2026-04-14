import { log } from "@clack/prompts";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pc from "picocolors";
import { safeValidateManifest, getZodErrorMessage } from "../types/schemas.ts";

interface ValidateOptions {
	file?: string;
}

export async function validateCommand(options: ValidateOptions) {
	const filePath = options.file ?? resolve("stacker.json");

	log.info(pc.dim(`Validating ${filePath}...\n`));

	let content: string;
	try {
		content = await readFile(filePath, "utf-8");
	} catch (err) {
		log.error(`Could not read file: ${filePath}`);
		log.message(pc.dim("Make sure the file exists or use --file to specify a path."));
		process.exit(1);
	}

	let data: unknown;
	try {
		data = JSON.parse(content);
	} catch {
		log.error("Invalid JSON - could not parse file.");
		process.exit(1);
	}

	const result = safeValidateManifest(data);

	if (!result.success) {
		log.error(pc.red("✗ Validation failed\n"));
		log.message(pc.red(getZodErrorMessage(result.error)));
		process.exit(1);
	}

	log.success(pc.green("✓ Manifest is valid\n"));

	const manifest = result.data;

	log.message(pc.bold("Manifest summary:"));
	log.message(`  Framework:    ${pc.cyan(manifest.starter.framework)}`);
	log.message(`  Runtime:      ${pc.cyan(manifest.starter.runtime)}`);
	log.message(`  Package Mgr:  ${pc.cyan(manifest.project.packageManager)}`);
	log.message(`  UI System:    ${pc.cyan(manifest.frontend.uiSystem || "none")}`);
	log.message(`  Git:          ${pc.cyan(manifest.project.git ? "yes" : "no")}`);
	log.message(`  Install:      ${pc.cyan(manifest.project.install ? "yes" : "no")}`);

	if (manifest.starter.nextjs) {
		log.message(pc.bold("\nNext.js options:"));
		const nx = manifest.starter.nextjs;
		log.message(`  src-dir:        ${pc.cyan(nx.srcDir ? "yes" : "no")}`);
		log.message(`  linter:         ${pc.cyan(nx.linter)}`);
		log.message(`  bundler:        ${pc.cyan(nx.bundler)}`);
		log.message(`  react-compiler: ${pc.cyan(nx.reactCompiler ? "yes" : "no")}`);
		log.message(`  import-alias:   ${pc.cyan(nx.importAlias)}`);
	}

	if (manifest.starter.tanstack) {
		log.message(pc.bold("\nTanStack CLI options:"));
		const ts = manifest.starter.tanstack;
		log.message(`  router-only:  ${pc.cyan(ts.routerOnly ? "yes" : "no")}`);
		log.message(`  toolchain:    ${pc.cyan(ts.toolchain)}`);
		log.message(`  deployment:   ${pc.cyan(ts.deployment)}`);
		log.message(`  examples:     ${pc.cyan(ts.examples ? "yes" : "no")}`);
	}

	if (manifest.frontend.shadcn) {
		log.message(pc.bold("\nshadcn/ui:"));
		log.message(`  style:      ${pc.cyan(manifest.frontend.shadcn.style)}`);
		log.message(`  base-color: ${pc.cyan(manifest.frontend.shadcn.baseColor)}`);
		log.message(`  components: ${pc.cyan(manifest.frontend.shadcn.components.length)} selected`);
	}

	if (manifest.backend) {
		log.message(pc.bold("\nBackend:"));
		if (manifest.backend.database) log.message(`  Database:  ${pc.cyan(manifest.backend.database)}`);
		if (manifest.backend.orm) log.message(`  ORM:       ${pc.cyan(manifest.backend.orm)}`);
		if (manifest.backend.auth) log.message(`  Auth:      ${pc.cyan(manifest.backend.auth)}`);
		if (manifest.backend.apiLayer) log.message(`  API Layer: ${pc.cyan(manifest.backend.apiLayer)}`);
	}

	if (manifest.frontend.tanstackAddons.length > 0) {
		log.message(pc.bold("\nTanStack add-ons:"));
		for (const addon of manifest.frontend.tanstackAddons) {
			log.message(`  • ${pc.cyan(addon)}`);
		}
	}

	if (manifest.addons?.packages && manifest.addons.packages.length > 0) {
		log.message(pc.bold("\nExtra packages:"));
		for (const pkg of manifest.addons.packages) {
			log.message(`  • ${pc.cyan(pkg)}`);
		}
	}
}
