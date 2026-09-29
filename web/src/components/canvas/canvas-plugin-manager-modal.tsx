import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Download, Puzzle, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { installPluginFromUrl, setPluginEnabled, uninstallPlugin, updatePlugin } from "@/lib/canvas/plugin-loader";
import { fetchOfficialPlugins, hasUpgrade, type OfficialPluginEntry } from "@/lib/canvas/plugin-registry";
import { usePluginStore, type InstalledPlugin } from "@/stores/canvas/use-plugin-store";
import { useThemeStore } from "@/stores/use-theme-store";

export function CanvasPluginManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { message } = useAppFeedback();
    const plugins = usePluginStore((state) => state.plugins);
    const [url, setUrl] = useState("");
    const [installing, setInstalling] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [official, setOfficial] = useState<OfficialPluginEntry[]>([]);
    const [loadingOfficial, setLoadingOfficial] = useState(false);
    const [officialError, setOfficialError] = useState<string | null>(null);

    const recordById = useMemo(() => new Map(plugins.map((item) => [item.id, item])), [plugins]);
    const localPlugins = useMemo(() => plugins.filter((item) => item.local), [plugins]);
    const thirdPartyPlugins = useMemo(() => plugins.filter((item) => !item.local && !item.official), [plugins]);

    const loadOfficial = useCallback(async () => {
        setLoadingOfficial(true);
        setOfficialError(null);
        try {
            setOfficial(await fetchOfficialPlugins());
        } catch (error) {
            setOfficialError(error instanceof Error ? error.message : String(error));
        } finally {
            setLoadingOfficial(false);
        }
    }, []);

    // Fetch the official registry when opening the panel, but only if it has not been loaded yet.
    useEffect(() => {
        if (open && official.length === 0 && !loadingOfficial && !officialError) void loadOfficial();
    }, [open, official.length, loadingOfficial, officialError, loadOfficial]);

    const handleInstallUrl = async () => {
        const target = url.trim();
        if (!target) return;
        setInstalling(true);
        try {
            const plugin = await installPluginFromUrl(target);
            message.success(`已安装插件 ${plugin.name}`);
            setUrl("");
        } catch (error) {
            message.error(`安装失败：${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setInstalling(false);
        }
    };

    const handleInstallOfficial = async (entry: OfficialPluginEntry) => {
        setBusyId(entry.id);
        try {
            const plugin = await installPluginFromUrl(entry.url, { official: true });
            message.success(`已安装 ${plugin.name}`);
        } catch (error) {
            message.error(`安装失败：${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setBusyId(null);
        }
    };

    const runOnPlugin = async (record: InstalledPlugin, action: () => Promise<void>, successText: string) => {
        setBusyId(record.id);
        try {
            await action();
            message.success(successText);
        } catch (error) {
            message.error(`${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setBusyId(null);
        }
    };

    // Installed plugin actions: enable toggle plus update/uninstall for non-local plugins.
    // Highlight the update action when a newer remote version is available.
    const installedControls = (record: InstalledPlugin, upgradable = false) => (
        <>
            <Switch checked={record.enabled} disabled={busyId === record.id} onCheckedChange={(checked) => runOnPlugin(record, () => setPluginEnabled(record, checked), checked ? "已启用" : "已禁用")} />
            {!record.local && (
                <>
                    <Button
                        title={upgradable ? "有新版本，点击升级" : "从来源更新"}
                        onClick={() => runOnPlugin(record, async () => void (await updatePlugin(record)), "已更新")}
                        type={"button"}
                        variant={({ primary: "default", text: "ghost", link: "link", default: "secondary", dashed: "outline" } as const)[upgradable ? "primary" : "text"]}
                        size="icon-sm"
                        disabled={Boolean(busyId === record.id) || false}
                    >
                        {busyId === record.id ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button title={"卸载"} type={"button"} variant={"destructive"} size="icon-sm">
                                {<Trash2 data-icon="inline-start" />}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{"卸载该插件？"}</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{"取消"}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => uninstallPlugin(record.id)}>{"卸载"}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </>
    );

    // Add a green dot at the icon's top-right corner when an update is available.
    // A card-colored box shadow separates the dot visually from the icon.
    const withUpgradeDot = (icon: ReactNode) => (
        <span className="relative inline-flex">
            {icon}
            <span className="absolute -right-1 -top-1 size-2 rounded-full" style={{ background: "#22c55e", boxShadow: `0 0 0 2px ${theme.node.fill}` }} title={"有新版本可升级"} />
        </span>
    );

    const versionTag = (version: string) => (
        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: theme.toolbar.activeBg, color: theme.node.muted }}>
            v{version}
        </span>
    );

    const emptyHint = (text: string) => (
        <div className="py-10 text-center text-sm" style={{ color: theme.node.muted }}>
            {text}
        </div>
    );

    // Shared plugin row: icon, title with name and version, description, and actions.
    const row = (key: string, icon: ReactNode, name: string, version: string, subtitle: string | undefined, right: ReactNode) => (
        <div key={key} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: theme.node.stroke, background: theme.node.fill }}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg text-base" style={{ background: theme.toolbar.activeBg, color: theme.node.muted }}>
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium" style={{ color: theme.node.text }}>
                    <span className="truncate">{name}</span>
                    {versionTag(version)}
                </div>
                {subtitle ? (
                    <div className="mt-0.5 truncate text-xs" style={{ color: theme.node.muted }}>
                        {subtitle}
                    </div>
                ) : null}
            </div>
            {right}
        </div>
    );

    const officialTab = (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="text-xs" style={{ color: theme.node.muted }}>
                    {"本项目官方插件，来自仓库注册表"}
                </div>
                <Button onClick={loadOfficial} type={"button"} variant={"ghost"} size="sm" disabled={loadingOfficial}>
                    {<RefreshCw data-icon="inline-start" className={`size-4 ${loadingOfficial ? "animate-spin" : ""}`} />}
                    {"刷新"}
                </Button>
            </div>
            {officialError ? (
                <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: theme.node.stroke, color: theme.node.muted }}>
                    {`加载失败：${officialError}`}
                </div>
            ) : loadingOfficial && official.length === 0 ? (
                emptyHint("正在获取官方插件…")
            ) : official.length === 0 ? (
                emptyHint("暂无官方插件")
            ) : (
                <div className="thin-scrollbar max-h-[46vh] flex flex-col gap-2 overflow-auto">
                    {official.map((entry) => {
                        const record = recordById.get(entry.id);
                        // Show the update dot and highlight the action when the remote version is newer.
                        const upgradable = Boolean(record && hasUpgrade(record.version, entry.version));
                        const icon = entry.icon || <Puzzle className="size-4" />;
                        return row(
                            entry.id,
                            upgradable ? withUpgradeDot(icon) : icon,
                            entry.name,
                            // Show local and remote versions in the title so the update target is explicit.
                            upgradable && record ? `${record.version} → ${entry.version}` : entry.version,
                            entry.description,
                            record ? (
                                installedControls(record, upgradable)
                            ) : (
                                <Button onClick={() => handleInstallOfficial(entry)} type={"button"} variant={"default"} size="sm" disabled={Boolean(busyId === entry.id) || false}>
                                    {busyId === entry.id ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />}
                                    {"安装"}
                                </Button>
                            ),
                        );
                    })}
                </div>
            )}
        </div>
    );

    const localTab = (
        <div className="thin-scrollbar max-h-[52vh] flex flex-col gap-2 overflow-auto">
            {localPlugins.map((record) => row(record.id, <Puzzle className="size-4" />, record.name, record.version, record.description || record.url, installedControls(record)))}
        </div>
    );

    const thirdPartyTab = (
        <div className="flex flex-col gap-3">
            <div className="flex gap-2">
                <InputGroup>
                    <InputGroupInput
                        placeholder={"输入插件 JS 文件 URL，例如 https://.../plugin.js"}
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                handleInstallUrl();
                            }
                        }}
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton aria-label="清空" onClick={() => setUrl("")}>
                            <X />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                <Button onClick={handleInstallUrl} type={"button"} variant={"default"} size="default" disabled={Boolean(installing) || false}>
                    {installing ? <Spinner data-icon="inline-start" /> : <Puzzle data-icon="inline-start" />}
                    {"安装"}
                </Button>
            </div>
            <div className="thin-scrollbar max-h-[42vh] flex flex-col gap-2 overflow-auto">
                {thirdPartyPlugins.length === 0
                    ? emptyHint("还没有安装第三方插件")
                    : thirdPartyPlugins.map((record) => row(record.id, <Puzzle className="size-4" />, record.name, record.version, record.description || record.url, installedControls(record)))}
            </div>
        </div>
    );

    const tabs = [{ key: "official", label: "官方插件", children: officialTab }, ...(localPlugins.length > 0 ? [{ key: "local", label: "本地插件", children: localTab }] : []), { key: "third", label: "第三方插件", children: thirdPartyTab }];

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 640, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle>{"节点插件"}</DialogTitle>
                </DialogHeader>
                <div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-5" style={{ borderColor: "#f59e0b55", background: "#f59e0b14", color: theme.node.text }}>
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                            <span>{"插件代码会在当前页面内直接执行，可访问本地数据（包含 AI API Key）。请仅安装你信任来源的插件。"}</span>
                        </div>
                        <Tabs defaultValue={"official"}>
                            <TabsList>
                                {tabs.map((item) => (
                                    <TabsTrigger key={item.key} value={item.key}>
                                        {item.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {tabs.map((item) => (
                                <TabsContent key={item.key} value={item.key}>
                                    {item.children}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
