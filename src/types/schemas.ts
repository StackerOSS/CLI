import { z } from "zod";

export const PackageManagerSchema = z.enum(["bun", "pnpm", "npm", "yarn"]);
export type PackageManager = z.infer<typeof PackageManagerSchema>;

export const FrameworkSchema = z.enum([
	"Next.js",
	"Vite",
	"TanStack Start",
	"React Router",
	"Astro",
	"Laravel",
]);
export type Framework = z.infer<typeof FrameworkSchema>;

export const RuntimeSchema = z.enum(["React", "Solid"]);
export type Runtime = z.infer<typeof RuntimeSchema>;

export const UiSystemSchema = z.enum(["shadcn/ui", ""]);
export type UiSystem = z.infer<typeof UiSystemSchema>;

export const ShadcnBaseSchema = z.enum(["radix", "base"]);
export type ShadcnBase = z.infer<typeof ShadcnBaseSchema>;

export const ShadcnStyleSchema = z.enum([
	"new-york",
	"default",
	"vega",
	"nova",
	"maia",
	"lyra",
	"mira",
	"luma",
]);
export type ShadcnStyle = z.infer<typeof ShadcnStyleSchema>;

export const ShadcnBorderRadiusSchema = z.enum([
	"default",
	"none",
	"sm",
	"md",
	"lg",
]);
export type ShadcnBorderRadius = z.infer<typeof ShadcnBorderRadiusSchema>;

export const NextJsLinterSchema = z.enum(["eslint", "biome", "none"]);
export type NextJsLinter = z.infer<typeof NextJsLinterSchema>;

export const NextJsBundlerSchema = z.enum(["turbopack", "webpack"]);
export type NextJsBundler = z.infer<typeof NextJsBundlerSchema>;

export const TanStackToolchainSchema = z.enum([
	"eslint",
	"biome",
	"rome",
	"none",
]);
export type TanStackToolchain = z.infer<typeof TanStackToolchainSchema>;

export const TanStackDeploymentSchema = z.enum([
	"cloudflare-pages",
	"cloudflare-workers",
	"deno-deploy",
	"netlify",
	"vercel",
	"node",
	"none",
]);
export type TanStackDeployment = z.infer<typeof TanStackDeploymentSchema>;

export const DatabaseSchema = z.enum(["Neon", "Convex", "SQLite"]);
export type Database = z.infer<typeof DatabaseSchema>;

export const OrmSchema = z.enum(["Drizzle", "Prisma"]);
export type Orm = z.infer<typeof OrmSchema>;

export const AuthSchema = z.enum(["BetterAuth", "Clerk", "WorkOS"]);
export type Auth = z.infer<typeof AuthSchema>;

export const ApiLayerSchema = z.enum(["tRPC", "ORPC", "Apollo Client"]);
export type ApiLayer = z.infer<typeof ApiLayerSchema>;

export const TypingsSchema = z.enum(["Zod", "ArkType"]);
export type Typings = z.infer<typeof TypingsSchema>;

export const AnimationsSchema = z.enum([
	"Framer Motion",
	"Motion",
	"AutoAnimate",
	"GSAP",
]);
export type Animations = z.infer<typeof AnimationsSchema>;

export const NextJsOptionsSchema = z.object({
	srcDir: z.boolean().default(false),
	importAlias: z.string().default("@/*"),
	linter: NextJsLinterSchema.default("eslint"),
	bundler: NextJsBundlerSchema.default("turbopack"),
	reactCompiler: z.boolean().default(false),
	agentsMd: z.boolean().default(true),
});
export type NextJsOptions = z.infer<typeof NextJsOptionsSchema>;

export const TanStackCliOptionsSchema = z.object({
	routerOnly: z.boolean().default(false),
	toolchain: TanStackToolchainSchema.default("eslint"),
	deployment: TanStackDeploymentSchema.default("none"),
	examples: z.boolean().default(true),
});
export type TanStackCliOptions = z.infer<typeof TanStackCliOptionsSchema>;

export const ShadcnConfigSchema = z.object({
	base: ShadcnBaseSchema.default("radix"),
	style: z.string().default("new-york"),
	baseColor: z.string().default("zinc"),
	borderRadius: z.string().default("default"),
	iconLibrary: z.string().default("Lucide"),
	font: z.string().default("Geist"),
	tweakcnTheme: z.string().optional(),
	components: z.array(z.string()).default([]),
});

export const StackerManifestSchema = z.object({
	version: z.literal(1),
	project: z.object({
		name: z
			.string()
			.min(1, "Project name is required")
			.regex(/^[a-z0-9-_]+$/i, {
				message:
					"Project name must contain only letters, numbers, hyphens, and underscores",
			}),
		packageManager: PackageManagerSchema,
		git: z.boolean(),
		install: z.boolean(),
	}),
	starter: z.object({
		framework: FrameworkSchema,
		runtime: RuntimeSchema,
		id: z.string().optional().default(""),
		nextjs: NextJsOptionsSchema.optional(),
		tanstack: TanStackCliOptionsSchema.optional(),
	}),
	frontend: z.object({
		uiSystem: z.string(),
		shadcn: ShadcnConfigSchema.nullable().default(null),
		tanstackAddons: z.array(z.string()).default([]),
	}),
	backend: z
		.object({
			database: z.string().optional(),
			orm: z.string().optional(),
			auth: z.string().optional(),
			apiLayer: z.string().optional(),
		})
		.optional(),
	addons: z
		.object({
			integrations: z.array(z.string()).optional().default([]),
			deployment: z.string().optional().default(""),
			monitoring: z.string().optional().default(""),
			i18n: z.string().optional().default(""),
			devTooling: z.array(z.string()).optional().default([]),
			typings: z.string().optional().default(""),
			animations: z.string().optional().default(""),
			packages: z.array(z.string()).optional().default([]),
		})
		.optional(),
});

export type StackerManifest = z.infer<typeof StackerManifestSchema>;

export function validateManifest(data: unknown): StackerManifest {
	return StackerManifestSchema.parse(data);
}

export function safeValidateManifest(data: unknown) {
	return StackerManifestSchema.safeParse(data);
}

export function getZodErrorMessage(error: z.ZodError): string {
	return error.issues
		.map((e) => `${e.path.join(".")}: ${e.message}`)
		.join("\n");
}

export const ProjectNameSchema = z
	.string()
	.min(1, "Project name is required")
	.regex(/^[a-z0-9-_]+$/i, {
		message:
			"Project name must contain only letters, numbers, hyphens, and underscores",
	})
	.refine((v) => !v.startsWith("-") && !v.endsWith("-"), {
		message: "Project name cannot start or end with a hyphen",
	});

export const PackageNameSchema = z
	.string()
	.regex(/^[a-z@][a-z0-9-_.]*$/i, {
		message: "Invalid package name format",
	})
	.or(z.string().regex(/^@([a-z0-9-_.]+)\/([a-z0-9-_.]+)$/i));

export const UrlSchema = z.string().url().or(z.string().startsWith("https://")).or(z.string().startsWith("http://"));
