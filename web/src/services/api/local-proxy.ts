import { normalizeLocalProxyUrl } from "@/stores/use-config-store";

/** The proxy answers its root path with its own identity payload, which doubles as a reachability check. */
export async function testLocalProxy(proxyUrl: string) {
    const base = normalizeLocalProxyUrl(proxyUrl);
    if (!base) throw new Error("请先填写本地代理地址。");
    const response = await fetch(`${base}/`, { cache: "no-store" });
    const data = response.ok ? ((await response.json().catch(() => null)) as { proxy?: string; version?: string } | null) : null;
    if (!data?.proxy) throw new Error("无法连接本地代理，请确认命令已启动且地址填写正确。");
    return `${data.proxy} v${data.version || "?"}`;
}
