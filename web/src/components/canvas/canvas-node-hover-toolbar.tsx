import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Download, Ellipsis, FolderPlus, Image as ImageIcon, Info, MessageSquare, Minus, Music2, Plus, RefreshCw, Settings2, Trash2, Ungroup, Upload, Video } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useCopyText } from "@/hooks/use-copy-text";
import { canvasThemes } from "@/lib/canvas-theme";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { formatBytes, getDataUrlByteSize } from "@/lib/image-utils";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type CanvasNodeData, type ViewportTransform } from "@/types/canvas";
import type { CanvasNodeToolbarItem } from "@/types/canvas-plugin";
import { ImageToolSettingsModal, type ImageToolbarSettingsTool } from "./canvas-image-toolbar-settings-modal";
import { IMAGE_QUICK_TOOLS_STORAGE_KEY, buildImageToolbarTools, defaultImageQuickToolIds, readImageQuickToolsConfig, type ImageQuickToolId } from "./canvas-image-toolbar-tools";

type CanvasNodeHoverToolbarProps = {
    node: CanvasNodeData | null;
    inline?: boolean;
    onDismiss: () => void;
    viewport: ViewportTransform;
    onKeep: (nodeId: string) => void;
    onLeave: () => void;
    onInfo: (node: CanvasNodeData) => void;
    onDecreaseFont: (node: CanvasNodeData) => void;
    onIncreaseFont: (node: CanvasNodeData) => void;
    onToggleDialog: (node: CanvasNodeData) => void;
    onEditText: (node: CanvasNodeData) => void;
    onGenerateImage: (node: CanvasNodeData) => void;
    onUpload: (node: CanvasNodeData) => void;
    onDownload: (node: CanvasNodeData) => void;
    onSaveAsset: (node: CanvasNodeData) => void;
    onMaskEdit: (node: CanvasNodeData) => void;
    onCrop: (node: CanvasNodeData) => void;
    onSplit: (node: CanvasNodeData) => void;
    onUpscale: (node: CanvasNodeData) => void;
    onSuperResolve: (node: CanvasNodeData) => void;
    onAngle: (node: CanvasNodeData) => void;
    onViewImage: (node: CanvasNodeData) => void;
    onReversePrompt: (node: CanvasNodeData) => void;
    onRetry: (node: CanvasNodeData) => void;
    onToggleFreeResize: (node: CanvasNodeData) => void;
    onDelete: (node: CanvasNodeData) => void;
    onUngroup?: (node: CanvasNodeData) => void;
    extraTools?: CanvasNodeToolbarItem[];
};

type ToolbarTool = {
    id: string;
    title: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
};

export function CanvasNodeHoverToolbar({
    node,
    inline = false,
    onDismiss,
    viewport,
    onKeep,
    onLeave,
    onInfo,
    onDecreaseFont,
    onIncreaseFont,
    onToggleDialog,
    onEditText,
    onGenerateImage,
    onUpload,
    onDownload,
    onSaveAsset,
    onMaskEdit,
    onCrop,
    onSplit,
    onUpscale,
    onSuperResolve,
    onAngle,
    onViewImage,
    onReversePrompt,
    onRetry,
    onToggleFreeResize,
    onDelete,
    onUngroup,
    extraTools = [],
}: CanvasNodeHoverToolbarProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [quickImageToolIds, setQuickImageToolIds] = useState<ImageQuickToolId[]>(defaultImageQuickToolIds);
    const [showImageToolLabels, setShowImageToolLabels] = useState(false);
    const [draftImageToolIds, setDraftImageToolIds] = useState<ImageQuickToolId[]>(defaultImageQuickToolIds);
    const [draftShowImageToolLabels, setDraftShowImageToolLabels] = useState(false);
    const [imageToolSettingsOpen, setImageToolSettingsOpen] = useState(false);
    const { message } = useAppFeedback();
    const copyText = useCopyText();

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(IMAGE_QUICK_TOOLS_STORAGE_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored) as unknown;
            const config = readImageQuickToolsConfig(parsed);
            setQuickImageToolIds(config.ids);
            setShowImageToolLabels(config.showLabels);
        } catch {
            window.localStorage.removeItem(IMAGE_QUICK_TOOLS_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        setImageToolSettingsOpen(false);
    }, [node?.id]);

    if (!node) return null;

    const activeNode = node;
    const left = viewport.x + node.position.x * viewport.k;
    const top = viewport.y + node.position.y * viewport.k;
    const isImage = node.type === CanvasNodeType.Image;
    const isVideo = node.type === CanvasNodeType.Video;
    const isAudio = node.type === CanvasNodeType.Audio;
    const hasImage = isImage && Boolean(node.metadata?.content);
    const hasVideo = isVideo && Boolean(node.metadata?.content);
    const hasAudio = isAudio && Boolean(node.metadata?.content);
    const isText = node.type === CanvasNodeType.Text;
    const isConfig = node.type === CanvasNodeType.Config;
    const canRetry = node.metadata?.status === "error" && !(isVideo && Boolean(node.metadata?.videoTaskId) && !hasVideo);
    const canQueryVideoTask = isVideo && Boolean(node.metadata?.videoTaskId) && !hasVideo && node.metadata?.status !== "loading";
    const quickImageToolIdSet = new Set(quickImageToolIds);
    const copyImagePrompt = (target: CanvasNodeData) => {
        const prompt = target.metadata?.prompt?.trim();
        if (!prompt) {
            message.warning("暂无可复制的提示词");
            return;
        }
        copyText(prompt, "提示词已复制");
    };
    const imageTools = buildImageToolbarTools(node, { onUpload, onToggleFreeResize, onMaskEdit, onCrop, onSplit, onUpscale, onSuperResolve, onAngle, onViewImage, onCopyPrompt: copyImagePrompt, onReversePrompt });

    function openImageToolSettings() {
        onKeep(activeNode.id);
        setDraftImageToolIds(quickImageToolIds);
        setDraftShowImageToolLabels(showImageToolLabels);
        setImageToolSettingsOpen(true);
    }

    const baseToolbarTools: ToolbarTool[] = [
        { id: "info", title: "查看节点信息", label: "信息", icon: <Info data-icon="inline-start" aria-hidden />, onClick: () => onInfo(node) },
        ...(node.type === CanvasNodeType.Group && onUngroup ? [{ id: "ungroup", title: "取消节点分组", label: "解散组", icon: <Ungroup data-icon="inline-start" aria-hidden />, onClick: () => onUngroup(node) }] : []),
        { id: "delete", title: "移除节点", label: "删除", icon: <Trash2 data-icon="inline-start" aria-hidden />, onClick: () => onDelete(node), danger: true },
    ];
    const nodeToolbarTools: ToolbarTool[] = [
        ...(canQueryVideoTask ? [{ id: "queryVideoTask", title: "使用任务 ID 查询视频生成状态", label: "获取任务状态", icon: <RefreshCw data-icon="inline-start" aria-hidden />, onClick: () => onRetry(node) }] : []),
        ...(canRetry ? [{ id: "retry", title: "重新生成", label: "重试", icon: <RefreshCw data-icon="inline-start" aria-hidden />, onClick: () => onRetry(node) }] : []),
        ...(hasImage || hasVideo || hasAudio || isText ? [{ id: "saveAsset", title: "加入我的资产", label: "存资产", icon: <FolderPlus data-icon="inline-start" aria-hidden />, onClick: () => onSaveAsset(node) }] : []),
        ...(hasImage || hasVideo || hasAudio ? [{ id: "download", title: hasAudio ? "下载音频" : hasVideo ? "下载视频" : "下载图片", label: "下载", icon: <Download data-icon="inline-start" aria-hidden />, onClick: () => onDownload(node) }] : []),
        ...(isImage || isVideo || isAudio || isText
            ? [{ id: "edit", title: isText ? "编辑节点文本" : "编辑", label: "编辑", icon: <MessageSquare data-icon="inline-start" aria-hidden />, onClick: () => (isText ? onEditText(node) : onToggleDialog(node)) }]
            : []),
        ...(isText ? [{ id: "generateImage", title: "用文本生图", label: "生图", icon: <ImageIcon data-icon="inline-start" aria-hidden />, onClick: () => onGenerateImage(node) }] : []),
        ...(isConfig ? [{ id: "config", title: "生成配置", label: "生成配置", icon: <Settings2 data-icon="inline-start" aria-hidden />, onClick: () => onToggleDialog(node) }] : []),
        ...(isText ? [{ id: "decreaseFont", title: "减小字号", label: "缩小", icon: <Minus data-icon="inline-start" aria-hidden />, onClick: () => onDecreaseFont(node) }] : []),
        ...(isText ? [{ id: "increaseFont", title: "增大字号", label: "放大", icon: <Plus data-icon="inline-start" aria-hidden />, onClick: () => onIncreaseFont(node) }] : []),
        ...(isImage && !hasImage ? [{ id: "uploadImage", title: "上传图片", label: "上传图片", icon: <Upload data-icon="inline-start" aria-hidden />, onClick: () => onUpload(node) }] : []),
        ...(isVideo ? [{ id: "uploadVideo", title: hasVideo ? "替换视频" : "上传视频", label: hasVideo ? "替换视频" : "上传视频", icon: <Video data-icon="inline-start" aria-hidden />, onClick: () => onUpload(node) }] : []),
        ...(isAudio ? [{ id: "uploadAudio", title: hasAudio ? "替换音频" : "上传音频", label: hasAudio ? "替换音频" : "上传音频", icon: <Music2 data-icon="inline-start" aria-hidden />, onClick: () => onUpload(node) }] : []),
        ...(hasImage ? imageTools.map((tool) => ({ id: tool.id, title: tool.title, label: tool.label, icon: tool.icon, active: tool.active, onClick: tool.onClick })) : []),
    ];
    const toolbarTools = hasImage ? [...baseToolbarTools, ...nodeToolbarTools].filter((tool) => quickImageToolIdSet.has(tool.id as ImageQuickToolId)) : [...baseToolbarTools, ...nodeToolbarTools, ...extraTools];
    const selectableImageToolbarTools = [...baseToolbarTools, ...nodeToolbarTools].filter((tool) => tool.id !== "retry") as ImageToolbarSettingsTool[];

    const closeImageToolSettings = () => {
        setImageToolSettingsOpen(false);
        onLeave();
    };

    const setDraftImageToolVisible = (id: ImageQuickToolId, visible: boolean) => {
        setDraftImageToolIds((current) => {
            const selected = new Set(current);
            if (visible) selected.add(id);
            else selected.delete(id);
            return selectableImageToolbarTools.filter((tool) => selected.has(tool.id)).map((tool) => tool.id);
        });
    };

    const saveImageToolSettings = () => {
        const config = { ids: draftImageToolIds, showLabels: draftShowImageToolLabels };
        setQuickImageToolIds(config.ids);
        setShowImageToolLabels(config.showLabels);
        window.localStorage.setItem(IMAGE_QUICK_TOOLS_STORAGE_KEY, JSON.stringify(config));
        closeImageToolSettings();
    };

    const actions = (
        <div
            data-node-toolbar
            data-canvas-no-zoom
            className="flex flex-wrap items-center gap-1 px-1"
            onMouseEnter={() => onKeep(node.id)}
            onMouseLeave={() => {
                if (!imageToolSettingsOpen) onLeave();
            }}
        >
            {toolbarTools.map((tool) => (
                <ToolbarAction key={tool.id} {...tool} showLabel={inline ? false : isImage ? showImageToolLabels : true} />
            ))}
            {hasImage ? (
                <ToolbarAction id="more" title="配置快捷工具" label="更多" icon={<Ellipsis data-icon="inline-start" aria-hidden />} active={imageToolSettingsOpen} onClick={openImageToolSettings} showLabel={inline ? false : showImageToolLabels} />
            ) : null}
        </div>
    );
    return (
        <>
            {inline ? (
                actions
            ) : (
                <Popover
                    open
                    onOpenChange={(open) => {
                        if (!open) onDismiss();
                    }}
                >
                    <PopoverAnchor asChild>
                        <div className="pointer-events-none absolute" style={{ left, top, width: node.width * viewport.k, height: node.height * viewport.k }} />
                    </PopoverAnchor>
                    <PopoverContent
                        role="toolbar"
                        aria-label="节点操作"
                        side="top"
                        sideOffset={14}
                        collisionPadding={{ top: 72, bottom: 88, left: 16, right: 16 }}
                        updatePositionStrategy="always"
                        className="z-[70] w-auto max-w-[calc(100vw-2rem)] p-0"
                        data-node-toolbar
                        data-canvas-no-zoom
                        onOpenAutoFocus={(event) => event.preventDefault()}
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            (document.querySelector<HTMLElement>("[data-canvas-node-editor] [role='textbox']") || document.querySelector<HTMLElement>("[data-canvas-viewport]"))?.focus({ preventScroll: true });
                        }}
                        onInteractOutside={(event) => event.preventDefault()}
                    >
                        {actions}
                    </PopoverContent>
                </Popover>
            )}
            {hasImage ? (
                <ImageToolSettingsModal
                    open={imageToolSettingsOpen}
                    tools={selectableImageToolbarTools}
                    selectedIds={draftImageToolIds}
                    showLabels={draftShowImageToolLabels}
                    onToggle={setDraftImageToolVisible}
                    onShowLabelsChange={setDraftShowImageToolLabels}
                    onCancel={closeImageToolSettings}
                    onSave={saveImageToolSettings}
                />
            ) : null}
        </>
    );
}

export function CanvasNodeInfoModal({ node, open, onClose }: { node: CanvasNodeData | null; open: boolean; onClose: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [view, setView] = useState<"info" | "json">("info");
    const imageBytes = node?.type === CanvasNodeType.Image && node.metadata?.content ? getDataUrlByteSize(node.metadata.content) : 0;
    const batchCount = node?.type === CanvasNodeType.Image ? node.metadata?.images?.length || 0 : 0;
    const json = useMemo(() => {
        if (!node) return "";
        return JSON.stringify(
            node,
            (key, value) => {
                if (key === "content" && typeof value === "string" && value.startsWith("data:image/")) {
                    return "[base64 image]";
                }
                return value;
            },
            2,
        );
    }, [node]);

    useEffect(() => {
        if (open) setView("info");
    }, [node?.id, open]);

    const title = (
        <div className="flex items-center justify-between gap-4 pr-12">
            <span>{"节点信息"}</span>
            <ToggleGroup
                type="single"
                variant="outline"
                value={String(view)}
                size="sm"
                onValueChange={(value) => {
                    if (value) ((value) => setView(value as "info" | "json"))(value);
                }}
            >
                {[
                    { label: "信息", value: "info" },
                    { label: "JSON", value: "json" },
                ].map((item) => {
                    const option = typeof item === "object" ? item : { value: item, label: item };
                    return (
                        <ToggleGroupItem key={String(option.value)} value={String(option.value)}>
                            {option.label}
                        </ToggleGroupItem>
                    );
                })}
            </ToggleGroup>
        </div>
    );

    return (
        <Dialog
            open={open && Boolean(node)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={cn("max-h-[90dvh] overflow-y-auto", "canvas-node-info-modal")}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div>
                    {node ? (
                        <div className="h-[56vh] min-h-[360px] select-text text-sm" data-canvas-shortcuts-ignore>
                            {view === "info" ? (
                                <div className="thin-scrollbar h-full flex flex-col gap-3 overflow-auto pr-1">
                                    <InfoRow label="ID" value={node.id} />
                                    <InfoRow label={"名称"} value={node.title || "未命名节点"} />
                                    <InfoRow
                                        label={"类型"}
                                        value={
                                            node.type === CanvasNodeType.Group
                                                ? "组"
                                                : node.type === CanvasNodeType.Config
                                                  ? "生成配置"
                                                  : [CanvasNodeType.Image, CanvasNodeType.Video, CanvasNodeType.Audio, CanvasNodeType.Text].includes(node.type as CanvasNodeType)
                                                    ? ({ text: "文本", image: "图片", video: "视频", audio: "音频" } as Record<string, string>)[String(node.type)] || String(node.type)
                                                    : getNodeDefinition(node.type)?.title || node.type
                                        }
                                    />
                                    <InfoRow label={"尺寸"} value={`${Math.round(node.width)} x ${Math.round(node.height)}`} />
                                    <InfoRow label={"位置"} value={`${Math.round(node.position.x)}, ${Math.round(node.position.y)}`} />
                                    <InfoRow label={"状态"} value={node.metadata?.status || "idle"} />
                                    {batchCount > 1 ? <InfoRow label={"图片组"} value={`${batchCount} 张`} /> : null}
                                    {node.metadata?.prompt ? <InfoRow label={"提示词"} value={node.metadata.prompt} /> : null}
                                    {node.metadata?.videoTaskId ? <InfoRow label={"任务 ID"} value={node.metadata.videoTaskId} /> : null}
                                    {imageBytes ? <InfoRow label={"图片大小"} value={formatBytes(imageBytes)} /> : null}
                                    {node.metadata?.errorDetails ? (
                                        <Alert variant="destructive">
                                            <AlertDescription>{node.metadata.errorDetails}</AlertDescription>
                                        </Alert>
                                    ) : null}
                                </div>
                            ) : (
                                <pre className="thin-scrollbar h-full overflow-auto rounded-lg border p-3 text-xs leading-5" style={{ background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text }}>
                                    {json}
                                </pre>
                            )}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ToolbarAction({ title, label, icon, onClick, showLabel, active = false, danger = false }: ToolbarTool & { showLabel: boolean }) {
    const hasText = showLabel && Boolean(label);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" type="button" className="group relative flex h-12 items-center whitespace-nowrap px-1.5" style={{ color: danger ? "var(--destructive)" : theme.node.text }} onClick={onClick} aria-label={title}>
                    <span className={cn("flex h-9 items-center", hasText ? "gap-2 px-2.5" : "justify-center px-2", "rounded-lg transition group-hover:bg-accent")} style={active ? { background: theme.toolbar.activeBg } : undefined}>
                        {icon}
                        {hasText ? <span>{label}</span> : null}
                    </span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{title}</TooltipContent>
        </Tooltip>
    );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
            <span className="opacity-50">{label}</span>
            <span className="min-w-0 whitespace-pre-wrap break-words">{value}</span>
        </div>
    );
}
