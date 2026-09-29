import { readdir } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
    const pluginsDirectory = join(process.cwd(), "public/plugins");
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    let plugins: string[] = [];

    try {
        plugins = (await readdir(pluginsDirectory))
            .filter((file) => file.endsWith(".js"))
            .sort()
            .map((file) => `${basePath}/plugins/${file}`);
    } catch {
        // An empty manifest keeps the plugin loader usable when no local plugins are bundled.
    }

    return Response.json(plugins);
}
