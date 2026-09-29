import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

import { parseChangelog } from "./src/lib/release";

const webDir = dirname(fileURLToPath(import.meta.url));
const changelog = readFileSync(resolve(webDir, "../CHANGELOG.md"), "utf8");
const releases = parseChangelog(changelog);
const appVersion = releases.find((release) => release.version !== "Unreleased")?.version || "dev";
const basePath = process.env.NEXT_BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
    output: "standalone",
    devIndicators: false,
    basePath: basePath || undefined,
    poweredByHeader: false,
    images: { unoptimized: true },
    env: {
        NEXT_PUBLIC_APP_VERSION: appVersion,
        NEXT_PUBLIC_APP_RELEASES: JSON.stringify(releases),
        NEXT_PUBLIC_BASE_PATH: basePath,
        NEXT_PUBLIC_PLUGIN_REGISTRY_URL: process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL || "https://cdn.jsdelivr.net/gh/StephenQiu30/stephen-canvas@plugins-dist/official-plugins.json",
        NEXT_PUBLIC_DEV_PLUGINS: process.env.NEXT_PUBLIC_DEV_PLUGINS || "",
    },
};

export default nextConfig;
