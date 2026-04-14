import type { StackerManifest, PlanStep } from "../types";
import {
	resolveTanstackCreateAddOns,
	discoverSupportedTanstackAddOns,
	TANSTACK_ADDON_PACKAGES,
} from "./resolve.ts";
import {
	getPackageRunner,
	getInstallCommand,
} from "./pm.ts";

export { discoverSupportedTanstackAddOns };

export function buildPlan(
	manifest: StackerManifest,
	targetDir: string,
	supportedTanstackAddOns?: Set<string> | null,
): PlanStep[] {
	const runner = getPackageRunner(manifest.project.packageManager);
	const plan: PlanStep[] = [];

	const requestedAddOns = resolveTanstackCreateAddOns(manifest);
	const tanstackCreateAddOns =
		supportedTanstackAddOns && supportedTanstackAddOns.size > 0
			? requestedAddOns.filter((id) => supportedTanstackAddOns.has(id))
			: requestedAddOns;

	switch (manifest.starter.framework) {
		case "Next.js": {
			const nx = manifest.starter.nextjs;
			const srcDir = nx?.srcDir ? "--src-dir" : "";
			const importAlias = nx?.importAlias && nx.importAlias !== "@/*" ? `--import-alias ${nx.importAlias}` : "";
			const linter = nx?.linter === "none" ? "--no-linter" : nx?.linter === "biome" ? "--biome" : "--eslint";
			const bundler = nx?.bundler === "webpack" ? "--webpack" : "--turbopack";
			const reactCompiler = nx?.reactCompiler ? "--react-compiler" : "";
			const agentsMd = nx?.agentsMd === false ? "--no-agents-md" : "";

			const titleParts = ["App Router", "TypeScript", "Tailwind"];
			if (nx?.linter === "biome") titleParts.push("Biome");
			else if (nx?.linter !== "none") titleParts.push("ESLint");
			if (nx?.srcDir) titleParts.push("src/");
			if (nx?.reactCompiler) titleParts.push("React Compiler");

			plan.push({
				title: `Scaffold Next.js (${titleParts.join(", ")})`,
				command: [
					runner,
					"create-next-app@latest",
					targetDir,
					"--ts",
					"--tailwind",
					"--app",
					linter,
					bundler,
					srcDir,
					importAlias,
					reactCompiler,
					agentsMd,
					"--yes",
					manifest.project.install ? "" : "--skip-install",
					manifest.project.git ? "" : "--disable-git",
				]
					.filter(Boolean)
					.join(" "),
			});
			break;
		}

		case "Vite":
			plan.push({
				title: `Scaffold Vite + ${manifest.starter.runtime}`,
				command: `${runner} create-vite@latest ${targetDir} --template ${
					manifest.starter.runtime === "Solid" ? "solid-ts" : "react-ts"
				}${manifest.project.install ? "" : " --no-install"}`,
			});
			break;

		case "TanStack Start": {
			const ts = manifest.starter.tanstack;
			const routerOnly = ts?.routerOnly ? "--router-only" : "";
			const toolchain = ts?.toolchain && ts.toolchain !== "none" ? `--toolchain ${ts.toolchain}` : "";
			const deployment = ts?.deployment && ts.deployment !== "none" ? `--deployment ${ts.deployment}` : "";
			const examples = ts?.examples === false ? "--no-examples" : "";
			const addOns = tanstackCreateAddOns.length > 0 ? `--add-ons ${tanstackCreateAddOns.join(",")}` : "";

			const titleParts = ["TanStack Start", manifest.starter.runtime];
			if (ts?.routerOnly) titleParts.push("Router-only");
			if (ts?.toolchain && ts.toolchain !== "none") titleParts.push(ts.toolchain);
			if (ts?.deployment && ts.deployment !== "none") titleParts.push(ts.deployment);

			plan.push({
				title: `Scaffold ${titleParts.join(", ")}`,
				command: [
					runner,
					"@tanstack/cli@latest",
					"create",
					targetDir,
					"--framework",
					manifest.starter.runtime.toLowerCase(),
					"--package-manager",
					manifest.project.packageManager,
					addOns,
					toolchain,
					deployment,
					routerOnly,
					examples,
					"--yes",
					manifest.project.install ? "" : "--no-install",
					manifest.project.git ? "" : "--no-git",
				]
					.filter(Boolean)
					.join(" "),
			});
			break;
		}

		case "React Router":
			plan.push({
				title: "Scaffold React Router (framework mode)",
				command: `${runner} create-react-router@latest ${targetDir}${
					manifest.project.install ? "" : " --no-install"
				} --yes`,
			});
			break;

		case "Astro":
			plan.push({
				title: "Scaffold Astro",
				command: `${runner} create astro@latest ${targetDir} --yes`,
			});
			break;

		case "Laravel":
			plan.push({
				title: "Scaffold Laravel",
				command: `laravel new ${targetDir}`,
			});
			break;
	}

	if (manifest.frontend.uiSystem === "shadcn/ui") {
		const shadcn = manifest.frontend.shadcn;

		if (shadcn) {
			const cssPathMap: Record<string, string> = {
				"Next.js": manifest.starter.nextjs?.srcDir ? "src/app/globals.css" : "app/globals.css",
				"React Router": "src/app/globals.css",
				"TanStack Start": "src/app/globals.css",
			};
			const cssPath = cssPathMap[manifest.starter.framework] ?? "src/styles.css";

			const tailwindConfigMap: Record<string, string> = {
				"TanStack Start": "tailwind.config.ts",
				"Next.js": "tailwind.config.ts",
				"Vite": "tailwind.config.ts",
				"React Router": "tailwind.config.ts",
				"Astro": "tailwind.config.mjs",
				"Laravel": "tailwind.config.js",
			};

			const componentsJson = {
				$schema: "https://ui.shadcn.com/schema.json",
				style: shadcn.style ?? "new-york",
				tailwind: {
					config: tailwindConfigMap[manifest.starter.framework] ?? "tailwind.config.ts",
					css: cssPath,
					baseColor: shadcn.baseColor ?? "zinc",
					cssVariables: true,
				},
				aliases: {
	components: "src/components",
	utils: "src/lib/utils",
	ui: "src/components/ui",
	lib: "src/lib",
	hooks: "src/hooks",
},
				iconLibrary: shadcn.iconLibrary?.toLowerCase() ?? "lucide",
			};

			plan.push({
				title: "Write shadcn/ui components.json",
				writeFile: {
					path: "components.json",
					content: JSON.stringify(componentsJson, null, 2),
				},
				cwd: targetDir,
			});
		}

		plan.push({
			title: "Initialize shadcn/ui",
			command: `${runner} shadcn@latest init --yes --defaults`,
			cwd: targetDir,
		});

		if (shadcn?.tweakcnTheme) {
			const theme = shadcn.tweakcnTheme;

			const command = theme.startsWith("http")
				? `${runner} shadcn@latest add ${theme} --yes`
				: `${runner} shadcn@latest add https://tweakcn.com/r/themes/${theme}.json --yes`;

			plan.push({
				title: `Apply tweakcn theme (${theme})`,
				command,
				cwd: targetDir,
			});
		}

		const components = shadcn?.components ?? [];
		if (components.length > 0) {
			plan.push({
				title: `Adding ${components.length} shadcn component(s)`,
				command: `${runner} shadcn@latest add ${components.join(" ")} --yes`,
				cwd: targetDir,
			});
		}
	}

	const packages = manifest.addons?.packages ?? [];

	const tanstackPkgs =
		manifest.starter.framework === "TanStack Start"
			? []
			: manifest.frontend.tanstackAddons
					.map((id) => TANSTACK_ADDON_PACKAGES[id])
					.filter((v): v is string => Boolean(v));

	const allPackages = [...new Set([...tanstackPkgs, ...packages])];

	if (allPackages.length > 0) {
		plan.push({
			title: `Install npm packages (${allPackages.length})`,
			command: `${getInstallCommand(manifest.project.packageManager)} ${allPackages.join(" ")}`,
			cwd: targetDir,
		});
	}

	return plan;
}