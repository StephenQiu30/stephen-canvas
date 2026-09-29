import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

import { parseChangelog } from "./src/lib/release";

const webDir = dirname(fileURLToPath(import.meta.url));
const appVersion = readFileSync(resolve(webDir, "../VERSION"), "utf8").trim() || "dev";
const changelog = readFileSync(resolve(webDir, "../CHANGELOG.md"), "utf8");
const basePath = process.env.NEXT_BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
    output: "standalone",
    basePath: basePath || undefined,
    poweredByHeader: false,
    images: { unoptimized: true },
    env: {
        NEXT_PUBLIC_APP_VERSION: appVersion,
        NEXT_PUBLIC_APP_RELEASES: JSON.stringify(parseChangelog(changelog)),
        NEXT_PUBLIC_BASE_PATH: basePath,
        NEXT_PUBLIC_DOC_URL: process.env.NEXT_PUBLIC_DOC_URL || "https://github.com/StephenQiu30/stephen-canvas/tree/main/docs/content/docs",
        NEXT_PUBLIC_PLUGIN_REGISTRY_URL: process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL || "https://cdn.jsdelivr.net/gh/StephenQiu30/stephen-canvas@plugins-dist/official-plugins.json",
        NEXT_PUBLIC_DEV_PLUGINS: process.env.NEXT_PUBLIC_DEV_PLUGINS || "",
    },
};

export default nextConfig;
