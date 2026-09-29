import { parseChangelog } from "@/lib/release";
import type { ReleaseInfo } from "@/lib/release";

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
export const APP_RELEASES = JSON.parse(process.env.NEXT_PUBLIC_APP_RELEASES || "[]") as ReleaseInfo[];
export const DOCS_URL = process.env.NEXT_PUBLIC_DOC_URL || "https://github.com/StephenQiu30/stephen-canvas/tree/main/docs/content/docs";

// Official plugin registry URL: CI publishes to plugins-dist for jsDelivr delivery; an environment variable may override it for self-hosting.
export const PLUGIN_REGISTRY_URL = process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL || "https://cdn.jsdelivr.net/gh/StephenQiu30/stephen-canvas@plugins-dist/official-plugins.json";
