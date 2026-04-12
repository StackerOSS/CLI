import type { StackerManifest, PlanStep } from "./types.ts";
import {
	resolveTanstackCreateAddOns,
	discoverSupportedTanstackAddOns,
	TANSTACK_ADDON_PACKAGES,
} from "./resolve.ts";
import {
	getPackageRunner,
	getInstallCommand,
	resolveShadcnCliStyle,
} from "./pm.ts";

export { discoverSupportedTanstackAddOns };

export function buildPlan(
	manifest: StackerManifest,
	targetDir: string,
	supportedTanstackAddOns?: Set<string> | null,
): PlanStep[] {
	const runner = getPackageRunner(manifest.project.packageManager);
	const plan: PlanStep[] = [];
	const installFlag = manifest.project.install ? "" : " --skip-install";
	const gitFlag = manifest.project.git ? "" : " --disable-git";
	const requestedAddOns = resolveTanstackCreateAddOns(manifest);
	const tanstackCreateAddOns =
		supportedTanstackAddOns && supportedTanstackAddOns.size > 0
			? requestedAddOns.filter((id) => supportedTanstackAddOns.has(id))
			: requestedAddOns;

	switch (manifest.starter.framework) {
		case "Next.js":
			plan.push({
				title: "Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint)",
				command: `${runner} create-next-app@latest ${targetDir} --ts --tailwind --app --eslint --yes${installFlag}${gitFlag}`,
			});
			break;
		case "Vite":
			plan.push({
				title: `Scaffold Vite + ${manifest.starter.runtime}`,
				command: `${runner} create-vite@latest ${targetDir} --template ${manifest.starter.runtime === "Solid" ? "solid-ts" : "react-ts"}${manifest.project.install ? "" : " --no-install"}`,
			});
			break;
		case "TanStack Start":
			plan.push({
				title: "Scaffold TanStack Start",
				command: `${runner} @tanstack/cli@latest create ${targetDir} --framework ${manifest.starter.runtime.toLowerCase()} --package-manager ${manifest.project.packageManager}${tanstackCreateAddOns.length > 0 ? ` --add-ons ${tanstackCreateAddOns.join(",")}` : ""}${manifest.project.install ? "" : " --no-install"}${manifest.project.git ? "" : " --no-git"} --yes`,
			});
			break;
		case "React Router":
			plan.push({
				title: "Scaffold React Router (framework mode)",
				command: `${runner} create-react-router@latest ${targetDir}${manifest.project.install ? "" : " --no-install"} --yes`,
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
		const cliStyle = resolveShadcnCliStyle(manifest.frontend.shadcn?.style);
		const shadcnFlags = [
			"--yes",
			"--defaults",
			`--style ${cliStyle}`,
			manifest.frontend.shadcn?.base
				? `--base ${manifest.frontend.shadcn.base}`
				: "",
			manifest.frontend.shadcn?.baseColor
				? `--base-color ${manifest.frontend.shadcn.baseColor}`
				: "",
		]
			.filter(Boolean)
			.join(" ");

		plan.push({
			title: "Initialize shadcn/ui",
			command: `${runner} shadcn@latest init ${shadcnFlags}`,
			cwd: targetDir,
		});

		if (manifest.frontend.shadcn?.tweakcnTheme) {
			plan.push({
				title: `Apply tweakcn theme (${manifest.frontend.shadcn.tweakcnTheme})`,
				command: `${runner} tweakcn@latest add ${manifest.frontend.shadcn.tweakcnTheme}`,
				cwd: targetDir,
			});
		}

		const components = manifest.frontend.shadcn?.components ?? [];
		if (components.length > 0) {
			plan.push({
				title: `Add ${components.length} shadcn component(s)`,
				command: `${runner} shadcn@latest add ${components.join(" ")}`,
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
