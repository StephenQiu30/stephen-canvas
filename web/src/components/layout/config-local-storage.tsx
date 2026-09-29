import { Alert, Button, Progress, Spin } from "@/components/ui/app-primitives";
import { Database, HardDrive, Layers3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { readLocalStorageUsage, type LocalStorageUsage } from "@/services/local-storage-usage";

const storeLabelKeys: Record<string, string> = {
    app_state: "appState",
    image_files: "images",
    image_previews: "imagePreviews",
    media_files: "media",
    image_generation_logs: "imageLogs",
    video_generation_logs: "videoLogs",
    agent_chat_messages: "agentMessages",
};

export function ConfigLocalStorage({ active }: { active: boolean }) {
    const [usage, setUsage] = useState<LocalStorageUsage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setUsage(await readLocalStorageUsage());
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "读取本地存储失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (active && !usage) void refresh();
    }, [active, refresh, usage]);

    const indexedDbBytes = usage?.contentBytes ?? 0;
    const percent = usage ? Math.min(100, (usage.usage / usage.quota) * 100) : 0;

    return (
        <div className="space-y-3">
            <section className="rounded-lg border border-border p-4 ">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Database className="size-4" />
                            {"IndexedDB 存储使用情况"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{"查看 Stephen Canvas 在浏览器中保存的数据量，并按对象仓库统计内容体积。"}</div>
                    </div>
                    <Button icon={<RefreshCw className="size-4" />} loading={loading} onClick={() => void refresh()}>
                        {"刷新统计"}
                    </Button>
                </div>
                {error ? <Alert className="mt-4" type="error" showIcon message={"读取本地存储失败"} description={error} /> : null}
                {!usage && loading ? (
                    <div className="flex min-h-48 items-center justify-center"><Spin /></div>
                ) : usage ? (
                    <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <StorageMetric icon={<Database className="size-4" />} label={"IndexedDB 占用"} value={formatStorageBytes(indexedDbBytes)} hint={"按仓库内容估算"} />
                            <StorageMetric icon={<HardDrive className="size-4" />} label={"站点总占用"} value={formatStorageBytes(usage.usage)} hint={"包含 IndexedDB 等站点数据"} />
                            <StorageMetric icon={<Layers3 className="size-4" />} label={"可用配额"} value={formatStorageBytes(usage.quota)} hint={"由浏览器动态分配"} />
                        </div>
                        <div className="mt-4">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                                <span>{"站点配额使用率"}</span>
                                <span className="tabular-nums">{percent.toFixed(2)}%</span>
                            </div>
                            <Progress percent={percent} showInfo={false} />
                        </div>
                    </>
                ) : null}
            </section>
            {usage?.databases.map((database) => (
                <section key={database.name} className="overflow-hidden rounded-lg border border-border ">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 ">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{"Stephen Canvas 主数据"}</div>
                            <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{database.name} · v{database.version}</div>
                        </div>
                        <div className="shrink-0 text-sm font-medium tabular-nums">{formatStorageBytes(database.bytes)}</div>
                    </div>
                    <div className="divide-y divide-border">
                        {database.stores.map((store) => (
                            <div key={store.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3 text-sm">
                                <div className="min-w-0">
                                    <div className="truncate font-medium">{storeLabel(store.name)}</div>
                                    <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{store.name}</div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground tabular-nums">{`${store.records} 条`}</div>
                                <div className="w-20 text-right font-medium tabular-nums">{formatStorageBytes(store.bytes)}</div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function StorageMetric({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
    return (
        <div className="rounded-lg bg-muted/70 p-3 ">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
            <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
        </div>
    );
}

function storeLabel(name: string) {
    const key = storeLabelKeys[name];
    return key ? (({ "appState":"应用状态", "images":"图片文件", "imagePreviews":"图片缩略图", "media":"音视频文件", "imageLogs":"生图记录", "videoLogs":"视频记录", "agentMessages":"Agent 消息" } as Record<string, string>)[String(key)] || String(key)) : name;
}

function formatStorageBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
