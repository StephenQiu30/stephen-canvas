import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Cloud, Download, Pencil, Plus, RefreshCw, Trash2, Upload, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChannelEditorDrawer } from "@/components/layout/channel-editor-drawer";
import { ConfigLocalProxy } from "@/components/layout/config-local-proxy";
import { ConfigLocalStorage } from "@/components/layout/config-local-storage";
import { ModelPicker } from "@/components/model-picker";
import { audioFormatOptions, audioVoiceOptions, normalizeAudioSpeedValue } from "@/lib/audio-generation";
import { syncAppDataToWebdav, type AppSyncDomainKey, type AppSyncProgressEvent } from "@/services/app-sync";
import { exportAppConfig, importAppConfig } from "@/services/config-file";
import { testWebdavConnection, WEBDAV_MANIFEST_FILE_NAME } from "@/services/webdav-sync";
import {
    createModelChannel,
    modelOptionsFromChannels,
    normalizeModelOptionValue,
    selectableModelsByCapability,
    useConfigStore,
    type AiConfig,
    type ApiCallFormat,
    type ConfigTabKey,
    type ModelCapability,
    type ModelChannel,
} from "@/stores/use-config-store";

type ModelGroup = {
    capability: ModelCapability;
    modelKey: "imageModel" | "videoModel" | "textModel" | "audioModel";
    label: string;
};

type WebdavDomainProgress = {
    stage: string;
    current?: number;
    total?: number;
    status?: "active" | "success" | "exception";
};

const modelGroups: ModelGroup[] = [
    { capability: "image", modelKey: "imageModel", label: "默认生图模型" },
    { capability: "video", modelKey: "videoModel", label: "默认视频模型" },
    { capability: "text", modelKey: "textModel", label: "默认文本模型" },
    { capability: "audio", modelKey: "audioModel", label: "默认音频模型" },
];

const webdavDomainKeys: AppSyncDomainKey[] = ["canvas", "assets", "image-workbench", "video-workbench"];
function createWebdavDomainProgress(): Record<AppSyncDomainKey, WebdavDomainProgress> {
    return webdavDomainKeys.reduce(
        (progress, key) => ({
            ...progress,
            [key]: { stage: "等待同步" },
        }),
        {} as Record<AppSyncDomainKey, WebdavDomainProgress>,
    );
}

export function AppConfigPanel({ showDoneButton = false, initialTab = "channels" }: { showDoneButton?: boolean; initialTab?: ConfigTabKey }) {
    const { message } = useAppFeedback();
    const configInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<ConfigTabKey>(initialTab);
    const [editingChannelId, setEditingChannelId] = useState("");
    const [testingWebdav, setTestingWebdav] = useState(false);
    const [syncingWebdav, setSyncingWebdav] = useState(false);
    const [webdavSyncStatus, setWebdavSyncStatus] = useState("");
    const [webdavDomainProgress, setWebdavDomainProgress] = useState(createWebdavDomainProgress);
    const config = useConfigStore((state) => state.config);
    const webdav = useConfigStore((state) => state.webdav);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const updateWebdavConfig = useConfigStore((state) => state.updateWebdavConfig);
    const shouldPromptContinue = useConfigStore((state) => state.shouldPromptContinue);
    const setConfigDialogOpen = useConfigStore((state) => state.setConfigDialogOpen);
    const clearPromptContinue = useConfigStore((state) => state.clearPromptContinue);
    const webdavReady = Boolean(webdav.url.trim());
    const editingChannel = config.channels.find((channel) => channel.id === editingChannelId) || null;
    useEffect(() => setActiveTab(initialTab), [initialTab]);

    const saveConfig = (nextConfig: AiConfig) => {
        (Object.keys(nextConfig) as Array<keyof AiConfig>).forEach((key) => updateConfig(key, nextConfig[key]));
    };

    const finishConfig = () => {
        const ready = config.channels.some((channel) => channel.baseUrl.trim() && channel.apiKey.trim() && channel.models.length);
        setConfigDialogOpen(false);
        if (!ready) return;
        message.success(shouldPromptContinue ? "配置已保存，请继续刚才的请求" : "配置已保存");
        clearPromptContinue();
    };

    const loadConfigFile = async (file: File) => {
        try {
            await importAppConfig(file);
            message.success("配置与用户偏好已导入");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "配置文件读取失败");
        } finally {
            if (configInputRef.current) configInputRef.current.value = "";
        }
    };

    const updateChannels = (channels: ModelChannel[]) => saveConfig(withChannels(config, channels));

    const addChannel = () => {
        const channel = createModelChannel({ name: `渠道 ${config.channels.length + 1}` });
        updateChannels([...config.channels, channel]);
        setEditingChannelId(channel.id);
    };

    const deleteChannel = (id: string) => {
        if (config.channels.length <= 1) {
            message.warning("至少保留一个渠道");
            return;
        }
        updateChannels(config.channels.filter((channel) => channel.id !== id));
    };

    const saveChannel = (channel: ModelChannel) => {
        updateChannels(config.channels.map((item) => (item.id === channel.id ? channel : item)));
    };

    const testWebdav = async () => {
        if (!webdavReady) {
            message.error("请先填写 WebDAV 地址");
            return;
        }
        setTestingWebdav(true);
        try {
            await testWebdavConnection(webdav);
            message.success("WebDAV 连接可用");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "WebDAV 连接测试失败");
        } finally {
            setTestingWebdav(false);
        }
    };

    const updateWebdavProgress = (event: AppSyncProgressEvent) => {
        setWebdavSyncStatus(event.stage);
        if (!event.domain) return;
        setWebdavDomainProgress((current) => ({
            ...current,
            [event.domain as AppSyncDomainKey]: {
                stage: event.stage,
                current: event.current,
                total: event.total,
                status: event.status,
            },
        }));
    };

    const syncWebdav = async () => {
        if (!webdavReady) {
            message.error("请先填写 WebDAV 地址");
            return;
        }
        setSyncingWebdav(true);
        setWebdavDomainProgress(createWebdavDomainProgress());
        setWebdavSyncStatus("准备同步");
        try {
            const result = await syncAppDataToWebdav(webdav, updateWebdavProgress);
            updateWebdavConfig("lastSyncedAt", result.syncedAt);
            message.success(`同步完成：${result.projects} 个画布，${result.assets} 个资产，${result.imageLogs + result.videoLogs} 条记录，本次上传 ${result.uploadedFiles} 个文件 ${formatBytes(result.uploadedBytes)}`);
        } catch (error) {
            setWebdavSyncStatus(error instanceof Error ? error.message : "WebDAV 同步失败");
            message.error(error instanceof Error ? error.message : "WebDAV 同步失败");
        } finally {
            setSyncingWebdav(false);
        }
    };

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 ">
                <div className="text-xs text-muted-foreground">{"JSON 文件包含 API Key 和 WebDAV 凭据，请妥善保管。"}</div>
                <div className="flex gap-2">
                    <Button onClick={() => configInputRef.current?.click()} type={"button"} variant={"secondary"} size="default">
                        {<Upload data-icon="inline-start" />}
                        {"导入配置"}
                    </Button>
                    <Button onClick={exportAppConfig} type={"button"} variant={"secondary"} size="default">
                        {<Download data-icon="inline-start" />}
                        {"导出配置"}
                    </Button>
                    <input ref={configInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => event.target.files?.[0] && void loadConfigFile(event.target.files[0])} />
                </div>
            </div>
            <Tabs value={activeTab} defaultValue={"channels"} onValueChange={(key) => setActiveTab(key as ConfigTabKey)}>
                <TabsList>
                    <TabsTrigger value={"channels"}>{"渠道"}</TabsTrigger>
                    <TabsTrigger value={"local-proxy"}>{"本地代理"}</TabsTrigger>
                    <TabsTrigger value={"preferences"}>{"偏好设置"}</TabsTrigger>
                    <TabsTrigger value={"webdav"}>{"WebDAV"}</TabsTrigger>
                    <TabsTrigger value={"local-storage"}>{"本地存储"}</TabsTrigger>
                </TabsList>
                <TabsContent value={"channels"}>
                    {
                        <div>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-muted-foreground">{"每个渠道选择一个协议并拉取模型，为每个模型指定能力（生图/视频/文本/音频），并可自定义调用脚本。"}</div>
                                <Button onClick={addChannel} type={"button"} variant={"default"} size="default">
                                    {<Plus data-icon="inline-start" />}
                                    {"新增渠道"}
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {config.channels.map((channel) => (
                                    <div key={channel.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 ">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold">{channel.name || "未命名渠道"}</div>
                                            <div className="mt-1 truncate text-xs text-muted-foreground">
                                                {apiFormatLabel(channel.apiFormat)} · {`${channel.models.length} 个模型`} · {channel.baseUrl || "未填写接口地址"}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <Button onClick={() => setEditingChannelId(channel.id)} type={"button"} variant={"secondary"} size="sm">
                                                {<Pencil data-icon="inline-start" />}
                                                {"编辑"}
                                            </Button>
                                            <Button onClick={() => deleteChannel(channel.id)} type={"button"} variant={"destructive"} size="icon-sm">
                                                {<Trash2 data-icon="inline-start" />}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    }
                </TabsContent>
                <TabsContent value={"local-proxy"}>{<ConfigLocalProxy />}</TabsContent>
                <TabsContent value={"preferences"}>
                    {
                        <FieldGroup>
                            <div className="mb-2 text-sm font-semibold">{"默认模型"}</div>
                            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {modelGroups.map((group) => (
                                    <Field key={group.modelKey} className="mb-0">
                                        <FieldLabel>{group.label}</FieldLabel>
                                        <ModelPicker config={config} value={config[group.modelKey]} onChange={(model) => updateConfig(group.modelKey, model)} capability={group.capability} fullWidth />
                                    </Field>
                                ))}
                            </div>
                            <div className="mb-2 text-sm font-semibold">{"生成偏好"}</div>
                            <div className="grid gap-4 md:grid-cols-4">
                                <Field className="mb-4">
                                    <FieldLabel>{"画布默认生图张数"}</FieldLabel>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={15}
                                        value={config.canvasImageCount}
                                        onChange={(event) => updateConfig("canvasImageCount", event.target.value)}
                                        onBlur={(event) => updateConfig("canvasImageCount", normalizeImageCount(event.target.value))}
                                    />
                                    <FieldDescription>{"新建画布生图和配置节点默认使用，单个节点仍可单独覆盖。"}</FieldDescription>
                                </Field>
                                <Field className="mb-4">
                                    <FieldLabel>{"默认音频声音"}</FieldLabel>
                                    <Select
                                        value={String(config.audioVoice ?? "")}
                                        onValueChange={(value) => {
                                            const option = audioVoiceOptions.find((item) => String(item.value) === value);
                                            if (option) ((value) => updateConfig("audioVoice", value))(option.value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {audioVoiceOptions.map((option) => (
                                                    <SelectItem key={String(option.value)} value={String(option.value)}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field className="mb-4">
                                    <FieldLabel>{"默认音频格式"}</FieldLabel>
                                    <Select
                                        value={String(config.audioFormat ?? "")}
                                        onValueChange={(value) => {
                                            const option = audioFormatOptions.find((item) => String(item.value) === value);
                                            if (option) ((value) => updateConfig("audioFormat", value))(option.value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {audioFormatOptions.map((option) => (
                                                    <SelectItem key={String(option.value)} value={String(option.value)}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field className="mb-4">
                                    <FieldLabel>{"默认音频语速"}</FieldLabel>
                                    <Input
                                        type="number"
                                        min={0.25}
                                        max={4}
                                        step={0.05}
                                        value={config.audioSpeed}
                                        onChange={(event) => updateConfig("audioSpeed", event.target.value)}
                                        onBlur={(event) => updateConfig("audioSpeed", normalizeAudioSpeedValue(event.target.value))}
                                    />
                                </Field>
                            </div>
                            <Field className="mb-4">
                                <FieldLabel>{"默认音频指令"}</FieldLabel>
                                <Textarea rows={2} value={config.audioInstructions} placeholder={"例如：自然、温暖、适合旁白。"} onChange={(event) => updateConfig("audioInstructions", event.target.value)} />
                            </Field>
                            <Field className="mb-0">
                                <FieldLabel>{"系统提示词"}</FieldLabel>
                                <Textarea rows={4} value={config.systemPrompt} placeholder={"例如：你是一位擅长电影感写实摄影的视觉导演。"} onChange={(event) => updateConfig("systemPrompt", event.target.value)} />
                            </Field>
                        </FieldGroup>
                    }
                </TabsContent>
                <TabsContent value={"webdav"}>
                    {
                        <FieldGroup>
                            <section className="rounded-lg border border-border p-3 ">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                            <Cloud className="size-4" />
                                            {"WebDAV 同步"}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">{"同步画布、我的资产、生成记录和本地媒体文件，不包含 AI API Key。开启本地代理时经本机代理转发，否则浏览器直连 WebDAV。"}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">{webdav.lastSyncedAt ? `上次同步 ${formatWebdavTime(webdav.lastSyncedAt)}` : "尚未同步"}</div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field className="mb-4">
                                        <FieldLabel>{"WebDAV 地址"}</FieldLabel>
                                        <Input value={webdav.url} placeholder="https://nas.example.com/webdav" onChange={(event) => updateWebdavConfig("url", event.target.value)} />
                                    </Field>
                                    <Field className="mb-4">
                                        <FieldLabel>{"远程目录"}</FieldLabel>
                                        <Input value={webdav.directory} placeholder="stephen-canvas" onChange={(event) => updateWebdavConfig("directory", event.target.value)} />
                                        <FieldDescription>{`会在该目录下分业务目录保存，每个目录包含 ${WEBDAV_MANIFEST_FILE_NAME} 和 files/`}</FieldDescription>
                                    </Field>
                                    <Field className="mb-0">
                                        <FieldLabel>{"用户名"}</FieldLabel>
                                        <Input value={webdav.username} autoComplete="username" onChange={(event) => updateWebdavConfig("username", event.target.value)} />
                                    </Field>
                                    <Field className="mb-0">
                                        <FieldLabel>{"密码 / 应用密码"}</FieldLabel>
                                        <Input value={webdav.password} autoComplete="current-password" onChange={(event) => updateWebdavConfig("password", event.target.value)} type="password" />
                                    </Field>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Button onClick={() => void testWebdav()} type={"button"} variant={"secondary"} size="default" disabled={Boolean(testingWebdav) || !webdavReady || syncingWebdav}>
                                        {testingWebdav ? <Spinner data-icon="inline-start" /> : <Wifi data-icon="inline-start" />}
                                        {"测试连接"}
                                    </Button>
                                    <Button onClick={() => void syncWebdav()} type={"button"} variant={"default"} size="default" disabled={Boolean(syncingWebdav) || !webdavReady || testingWebdav}>
                                        {syncingWebdav ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                                        {syncingWebdav ? "同步中" : "立即同步"}
                                    </Button>
                                    {webdavSyncStatus ? <span className="text-xs text-muted-foreground">{syncStageLabel(webdavSyncStatus)}</span> : null}
                                </div>
                                {syncingWebdav || webdavSyncStatus ? <WebdavProgressGrid progress={webdavDomainProgress} /> : null}
                            </section>
                        </FieldGroup>
                    }
                </TabsContent>
                <TabsContent value={"local-storage"}>{<ConfigLocalStorage active={activeTab === "local-storage"} />}</TabsContent>
            </Tabs>
            {showDoneButton ? (
                <div className="mt-4 flex justify-end">
                    <Button onClick={finishConfig} type={"button"} variant={"default"} size="default">
                        {"完成"}
                    </Button>
                </div>
            ) : null}
            <ChannelEditorDrawer open={Boolean(editingChannel)} channel={editingChannel} onSave={saveChannel} onClose={() => setEditingChannelId("")} />
        </>
    );
}

export function AppConfigModal() {
    const isConfigOpen = useConfigStore((state) => state.isConfigOpen);
    const configTab = useConfigStore((state) => state.configTab);
    const setConfigDialogOpen = useConfigStore((state) => state.setConfigDialogOpen);
    return (
        <Dialog
            open={isConfigOpen}
            onOpenChange={(open) => {
                if (!open) (() => setConfigDialogOpen(false))();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 980, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle>
                        {
                            <div>
                                <div className="text-lg font-semibold">{"配置与用户偏好"}</div>
                                <div className="mt-1 text-xs font-normal text-muted-foreground">{"渠道聚合、默认模型、同步与本地存储"}</div>
                            </div>
                        }
                    </DialogTitle>
                </DialogHeader>
                <div style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: 12 }}>
                    <AppConfigPanel showDoneButton initialTab={configTab} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function withChannels(config: AiConfig, channels: ModelChannel[]): AiConfig {
    const next: AiConfig = {
        ...config,
        channels,
        models: modelOptionsFromChannels(channels),
        baseUrl: channels[0]?.baseUrl || config.baseUrl,
        apiKey: channels[0]?.apiKey || config.apiKey,
        apiFormat: channels[0]?.apiFormat || config.apiFormat,
    };
    return {
        ...next,
        imageModel: pickDefaultModel(next, "image", config.imageModel),
        videoModel: pickDefaultModel(next, "video", config.videoModel),
        textModel: pickDefaultModel(next, "text", config.textModel),
        audioModel: pickDefaultModel(next, "audio", config.audioModel),
    };
}

function pickDefaultModel(config: AiConfig, capability: ModelCapability, current: string) {
    const options = selectableModelsByCapability(config, capability);
    const normalized = normalizeModelOptionValue(current, config.channels);
    return options.includes(normalized) ? normalized : options[0] || "";
}

function normalizeImageCount(value: string) {
    return String(Math.max(1, Math.min(15, Math.floor(Math.abs(Number(value)) || 3))));
}

function apiFormatLabel(apiFormat: ApiCallFormat) {
    if (apiFormat === "gemini") return "Gemini";
    return "OpenAI";
}

function formatWebdavTime(value: string) {
    return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function WebdavProgressGrid({ progress }: { progress: Record<AppSyncDomainKey, WebdavDomainProgress> }) {
    return (
        <div className="mt-3 grid gap-2">
            {webdavDomainKeys.map((key) => {
                const item = progress[key];
                const count = item.total ? `${item.current || 0}/${item.total}` : "";
                return (
                    <div key={key} className="rounded-md border border-border px-3 py-2 ">
                        <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-xs">
                            <span className="shrink-0 font-medium text-brand-body ">
                                {({ canvas: "画布", assets: "我的资产", imageWorkbench: "生图工作台", videoWorkbench: "视频创作台" } as Record<string, string>)[String(domainTranslationKey(key))] || String(domainTranslationKey(key))}
                            </span>
                            <span className="min-w-0 truncate text-right text-muted-foreground">
                                {syncStageLabel(item.stage)}
                                {count ? ` · ${count}` : ""}
                            </span>
                        </div>
                        <Progress value={getWebdavProgressPercent(item)} />
                    </div>
                );
            })}
        </div>
    );
}

function domainTranslationKey(domain: AppSyncDomainKey) {
    if (domain === "image-workbench") return "imageWorkbench";
    if (domain === "video-workbench") return "videoWorkbench";
    return domain;
}

function syncStageLabel(stage: string) {
    if (stage === "等待本地数据加载") return "等待本地数据加载";
    if (stage === "同步完成") return "同步完成";
    if (stage === "等待同步") return "等待同步";
    if (stage === "读取远端清单") return "读取远端清单";
    if (stage === "读取本地数据") return "读取本地数据";
    if (stage === "下载缺失媒体") return "下载缺失媒体";
    if (stage === "写入本地合并结果") return "写入本地合并结果";
    if (stage === "上传新增媒体") return "上传新增媒体";
    if (stage === "媒体已齐全") return "媒体已齐全";
    if (stage === "媒体无需上传") return "媒体无需上传";
    if (stage === "检查缺失媒体") return "检查缺失媒体";
    if (stage === "下载媒体") return "下载媒体";
    if (stage === "检查本地媒体") return "检查本地媒体";
    if (stage.startsWith("上传媒体 ")) return `上传媒体 ${stage.slice(5)}`;
    if (stage === "完成") return "完成";
    if (stage.startsWith("上传清单 ")) return `上传清单 ${stage.slice(5)}`;
    return stage;
}

function getWebdavProgressPercent(item: WebdavDomainProgress) {
    if (item.status === "success") return 100;
    if (item.total) return Math.min(100, Math.round(((item.current || 0) / item.total) * 100));
    if (item.status === "exception") return 100;
    if (item.stage === "等待同步") return 0;
    if (item.stage === "读取远端清单") return 12;
    if (item.stage === "读取本地数据") return 24;
    if (item.stage === "下载缺失媒体") return 36;
    if (item.stage === "写入本地合并结果") return 58;
    if (item.stage === "上传新增媒体") return 66;
    if (item.stage === "媒体已齐全" || item.stage === "媒体无需上传") return 74;
    if (item.stage.startsWith("上传清单")) return 90;
    return item.status === "active" ? 30 : 0;
}

function getWebdavProgressStatus(item: WebdavDomainProgress): "normal" | "active" | "success" | "exception" {
    if (item.status === "success" || item.status === "exception") return item.status;
    return item.status === "active" ? "active" : "normal";
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
