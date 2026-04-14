export type PackageManager = "bun" | "pnpm" | "npm" | "yarn";

export type StackerManifest = {
	version: 1;
	project: {
		name: string;
		packageManager: PackageManager;
		git: boolean;
		install: boolean;
	};
	starter: {
		framework: string;
		runtime: string;
		id: string;
	};
	frontend: {
		uiSystem: string;
		shadcn: null | {
			base: "radix" | "base";
			style?: string;
			baseColor?: string;
			borderRadius?: string;
			iconLibrary?: string;
			font?: string;
			tweakcnTheme?: string;
			components: string[];
		};
		tanstackAddons: string[];
	};
	backend?: {
		database?: string;
		orm?: string;
		auth?: string;
		apiLayer?: string;
	};
	addons?: {
		integrations?: string[];
		deployment?: string;
		monitoring?: string;
		i18n?: string;
		devTooling?: string[];
		typings?: string;
		animations?: string;
		packages?: string[];
	};
};

export type PlanStep = {
	title: string;
	cwd?: string;
} & (
	| { command: string; writeFile?: never }
	| { writeFile: { path: string; content: string }; command?: never }
);