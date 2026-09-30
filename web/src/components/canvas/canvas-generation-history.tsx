import { useState, useSyncExternalStore } from "react";
import { MediaPreview } from "@/components/media-preview";
import { getImagePreviewRevision, previewUrlFor, subscribeImagePreviews } from "@/services/image-storage";
import { History, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buildGenerationConfig } from "@/lib/canvas/canvas-generation-helpers";
import { useCanvasGenerationStore, type CanvasGenerationRecord } from "@/stores/canvas/use-canvas-generation-store";
import { useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";

const modes = { image: "图片", video: "视频", audio: "音频", text: "文本" };
const statuses = { loading: "生成中", success: "已完成", error: "失败", canceled: "已取消" };

export function CanvasGenerationHistory({
    open,
    projectId,
    onClose,
    onReuse,
    onInsert,
    onRetry,
}: {
    open: boolean;
    projectId: string;
    onClose: () => void;
    onReuse: (record: CanvasGenerationRecord) => void;
    onInsert: (record: CanvasGenerationRecord) => void;
    onRetry: (record: CanvasGenerationRecord) => void;
}) {
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision, () => 0);
    const records = useCanvasGenerationStore((state) => state.records);
    const hydrated = useCanvasGenerationStore((state) => state.hydrated);
    const config = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const [query, setQuery] = useState("");
    const [scope, setScope] = useState("project");
    const [mode, setMode] = useState("all");
    const [status, setStatus] = useState("all");
    const filtered = records
        .filter(
            (record) =>
                (scope === "all" || record.projectId === projectId) &&
                (mode === "all" || record.mode === mode) &&
                (status === "all" || record.status === status) &&
                [record.prompt, record.projectTitle, record.parameters.model].join(" ").toLowerCase().includes(query.trim().toLowerCase()),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) onClose();
            }}
        >
            <DialogContent
                aria-describedby={undefined}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    (document.querySelector<HTMLElement>("[data-canvas-node-editor] [role='textbox']") || document.querySelector<HTMLElement>("[data-canvas-viewport]"))?.focus({ preventScroll: true });
                }}
                className="flex max-h-[85dvh] w-[min(860px,calc(100vw-2rem))] flex-col overflow-hidden sm:max-w-none"
            >
                <DialogHeader>
                    <DialogTitle>生成历史</DialogTitle>
                </DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                    <InputGroup className="min-w-48 flex-1">
                        <InputGroupInput aria-label="搜索生成历史" placeholder="搜索提示词、模型或项目" value={query} onChange={(event) => setQuery(event.target.value)} />
                        <InputGroupAddon>
                            <Search aria-hidden />
                        </InputGroupAddon>
                    </InputGroup>
                    <ToggleGroup
                        type="single"
                        value={scope}
                        onValueChange={(value) => {
                            if (value) setScope(value);
                        }}
                        aria-label="历史来源"
                    >
                        <ToggleGroupItem value="project">当前画布</ToggleGroupItem>
                        <ToggleGroupItem value="all">全部创作</ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger aria-label="生成类型">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">全部类型</SelectItem>
                                {Object.entries(modes).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger aria-label="生成状态">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">全部状态</SelectItem>
                                {Object.entries(statuses).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                    {!hydrated ? (
                        <Spinner aria-label="正在加载生成历史" />
                    ) : (
                        filtered.map((record) => {
                            const generationConfig = buildGenerationConfig(config, { ...record.source, metadata: { ...record.source.metadata, ...record.parameters } }, record.mode);
                            const ready = isAiConfigReady(generationConfig, generationConfig.model);
                            const parameterKeys =
                                record.mode === "image" ? ["size", "quality", "count"] : record.mode === "video" ? ["size", "seconds", "vquality"] : record.mode === "audio" ? ["audioVoice", "audioFormat", "audioSpeed"] : ["textCount", "reasoningEffort"];
                            const parameterNames: Record<string, string> = {
                                size: "比例",
                                quality: "质量",
                                count: "数量",
                                seconds: "时长",
                                vquality: "分辨率",
                                audioVoice: "声音",
                                audioFormat: "格式",
                                audioSpeed: "语速",
                                textCount: "数量",
                                reasoningEffort: "推理",
                            };
                            return (
                                <article key={record.id} className="flex flex-col gap-3 rounded-lg border p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">{modes[record.mode]}</Badge>
                                        <Badge variant={record.status === "error" ? "destructive" : "outline"}>{statuses[record.status]}</Badge>
                                        <span className="text-xs text-muted-foreground">{record.projectTitle}</span>
                                        <time className="ml-auto text-xs text-muted-foreground" dateTime={record.createdAt}>
                                            {new Date(record.createdAt).toLocaleString("zh-CN")}
                                        </time>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words text-sm">{record.prompt || "无提示词"}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span>模型：{record.parameters.model || "未指定"}</span>
                                        {parameterKeys.flatMap((key) => {
                                            const value = record.parameters[key as keyof typeof record.parameters];
                                            return value
                                                ? [
                                                      <span key={key}>
                                                          {parameterNames[key]}：{String(value)}
                                                      </span>,
                                                  ]
                                                : [];
                                        })}
                                        <span>参考：{record.references.filter((node) => node.type !== "config" && node.type !== "group").length} 个</span>
                                    </div>
                                    {record.references.length ? <p className="truncate text-xs text-muted-foreground">参考节点：{record.references.map((node) => node.title).join("、")}</p> : null}
                                    {record.error ? (
                                        <Alert variant={record.status === "error" ? "destructive" : "default"}>
                                            <AlertDescription>{record.error}</AlertDescription>
                                        </Alert>
                                    ) : null}
                                    {record.results.map((node) => (
                                        <div key={node.id} className="flex flex-col gap-2">
                                            {record.mode === "image" ? (
                                                node.metadata?.images?.length ? (
                                                    node.metadata.images
                                                        .filter((item) => item.status === "success" && item.content)
                                                        .map((item) => (
                                                            <MediaPreview
                                                                key={item.id}
                                                                src={previewUrlFor(item.storageKey) || item.content}
                                                                previewSrc={item.content}
                                                                alt={node.title}
                                                                className="max-h-64 max-w-full self-start rounded-md object-contain"
                                                                loading="lazy"
                                                            />
                                                        ))
                                                ) : (
                                                    <MediaPreview
                                                        src={previewUrlFor(node.metadata?.storageKey) || node.metadata?.content}
                                                        previewSrc={node.metadata?.content}
                                                        alt={node.title}
                                                        className="max-h-64 max-w-full self-start rounded-md object-contain"
                                                        loading="lazy"
                                                    />
                                                )
                                            ) : node.type === "video" ? (
                                                <video src={node.metadata?.content} controls preload="metadata" className="max-h-64 max-w-full self-start rounded-md" />
                                            ) : node.type === "audio" ? (
                                                <audio src={node.metadata?.content} controls preload="metadata" className="w-full" />
                                            ) : (
                                                <p className="max-h-48 overflow-auto whitespace-pre-wrap text-sm">{node.metadata?.texts?.length ? node.metadata.texts.map((item) => item.content).join("\n\n") : node.metadata?.content}</p>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => onReuse(record)}>
                                            复用参数
                                        </Button>
                                        <Button variant="ghost" size="sm" disabled={!record.results.length} onClick={() => onInsert(record)}>
                                            插入结果
                                        </Button>
                                        <Button variant="ghost" size="sm" disabled={!ready || record.status === "loading"} title={ready ? "使用当前生成服务重试" : "生成服务尚未接入"} onClick={() => onRetry(record)}>
                                            重试生成
                                        </Button>
                                    </div>
                                </article>
                            );
                        })
                    )}
                    {hydrated && !filtered.length ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia>
                                    <History className="size-8" aria-hidden />
                                </EmptyMedia>
                                <EmptyTitle>暂无生成记录</EmptyTitle>
                                <EmptyDescription>生成后可在这里复用参数和结果；记录保存在当前浏览器。</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
