import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { SquareCheck, ChevronRight, Download, Eye, FileText, Image as ImageIcon, ListChecks, Music2, Plus, Search, Settings2, Square, Trash2, Type, Video, X } from "lucide-react";
import { motion } from "motion/react";
import { memo, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";

import { canvasThemes, type CanvasTheme } from "@/lib/canvas-theme";
import { exportCanvasNodes } from "@/lib/canvas/canvas-export";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { cn } from "@/lib/utils";
import { uploadMediaFile } from "@/services/file-storage";
import { getImagePreviewRevision, previewUrlFor, subscribeImagePreviews, uploadImage } from "@/services/image-storage";
import { useAssetStore, type Asset, type AssetKind } from "@/stores/use-asset-store";
import { CANVAS_SIDE_PANEL_MAX_WIDTH, CANVAS_SIDE_PANEL_MIN_WIDTH, CANVAS_SIDE_PANEL_MOTION_MS, useCanvasSidePanelStore } from "@/stores/use-canvas-side-panel-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

import type { InsertAssetPayload } from "./asset-picker-modal";

const PANEL_MOTION_SECONDS = CANVAS_SIDE_PANEL_MOTION_MS / 1000;
const PANEL_EASE = [0.22, 1, 0.36, 1] as const;

type PanelTab = "canvas" | "assets";

type Props = {
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    onFocusNode: (nodeId: string) => void;
    onPreviewNode: (nodeId: string) => void;
    onInsertAsset: (payload: InsertAssetPayload) => void;
};

const NODE_TYPE_ICON: Record<string, typeof Square> = {
    [CanvasNodeType.Image]: ImageIcon,
    [CanvasNodeType.Video]: Video,
    [CanvasNodeType.Audio]: Music2,
    [CanvasNodeType.Text]: Type,
    [CanvasNodeType.Config]: Settings2,
    [CanvasNodeType.Group]: Square,
};

export function CanvasSidePanel({ nodes, selectedNodeIds, onFocusNode, onPreviewNode, onInsertAsset }: Props) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [tab, setTab] = useState<PanelTab>("canvas");
    const isMobile = useIsMobile();
    const closePanel = useCanvasSidePanelStore((state) => state.closePanel);
    const width = useCanvasSidePanelStore((state) => state.width);
    const panelOpen = useCanvasSidePanelStore((state) => state.panelOpen);
    const panelMounted = useCanvasSidePanelStore((state) => state.panelMounted);
    const panelClosing = useCanvasSidePanelStore((state) => state.panelClosing);
    const setWidth = useCanvasSidePanelStore((state) => state.setWidth);
    const [resizing, setResizing] = useState(false);

    const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = width;
        let nextWidth = startWidth;
        const onMove = (moveEvent: PointerEvent) => {
            nextWidth = Math.min(CANVAS_SIDE_PANEL_MAX_WIDTH, Math.max(CANVAS_SIDE_PANEL_MIN_WIDTH, startWidth + moveEvent.clientX - startX));
            setWidth(nextWidth);
        };
        const onUp = () => {
            localStorage.setItem("canvas-side-panel-width", String(nextWidth));
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            setResizing(false);
        };
        setResizing(true);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    const panelContent = (
        <Tabs value={tab} onValueChange={(value) => setTab(value as PanelTab)} className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 px-4 pt-3">
                <TabsList className="flex-1">
                    <TabsTrigger value="canvas">画布</TabsTrigger>
                    <TabsTrigger value="assets">资产</TabsTrigger>
                </TabsList>
                {!isMobile ? (
                    <Button variant="ghost" size="icon-sm" aria-label="收起资产管理" onClick={closePanel}>
                        <X data-icon="inline-start" aria-hidden />
                    </Button>
                ) : null}
            </div>
            <TabsContent value="canvas" className="min-h-0 flex-1 overflow-hidden">
                <CanvasNodesTab
                    nodes={nodes}
                    selectedNodeIds={selectedNodeIds}
                    onFocusNode={(id) => {
                        onFocusNode(id);
                        if (isMobile) closePanel();
                    }}
                    onPreviewNode={onPreviewNode}
                    theme={theme}
                />
            </TabsContent>
            <TabsContent value="assets" className="min-h-0 flex-1 overflow-hidden">
                <CanvasAssetsTab onInsert={onInsertAsset} theme={theme} />
            </TabsContent>
        </Tabs>
    );
    if (isMobile)
        return (
            <Sheet
                open={panelOpen}
                onOpenChange={(open) => {
                    if (!open) closePanel();
                }}
            >
                <SheetContent side="left" aria-describedby={undefined} className="gap-0 p-0">
                    <SheetHeader>
                        <SheetTitle>资产管理</SheetTitle>
                    </SheetHeader>
                    {panelContent}
                </SheetContent>
            </Sheet>
        );
    if (!panelMounted) return null;

    return (
        <motion.div
            className="relative z-[60] flex h-full shrink-0"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelOpen ? width + 1 : 0, opacity: panelOpen ? 1 : 0 }}
            transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: PANEL_EASE }}
            style={{ overflow: "clip", pointerEvents: panelClosing ? "none" : undefined }}
        >
            <motion.aside
                className="relative flex h-full shrink-0 flex-col overflow-hidden border-r"
                initial={{ x: -48 }}
                animate={{ x: panelClosing ? -28 : 0 }}
                transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: PANEL_EASE }}
                style={{ width, background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
                data-canvas-no-zoom
            >
                {panelContent}
                <Button variant="ghost" type="button" className="absolute inset-y-0 right-0 z-40 w-4 translate-x-1/2 cursor-col-resize" onPointerDown={startResize} aria-label={"调整左侧面板宽度"} />
            </motion.aside>
        </motion.div>
    );
}

// ---------------------------------------------------------------------------
// Canvas tab: list nodes and center, zoom, and select the clicked node.
// ---------------------------------------------------------------------------

const NODE_FILTER_VALUES = ["all", CanvasNodeType.Image, CanvasNodeType.Video, CanvasNodeType.Text, CanvasNodeType.Audio, CanvasNodeType.Config, CanvasNodeType.Group];

function nodePreviewText(node: CanvasNodeData) {
    if (node.type === CanvasNodeType.Text) return node.metadata?.content || node.metadata?.prompt || "";
    return getNodeDefinition(node.type)?.title || node.type;
}

function CanvasNodesTab({ nodes, selectedNodeIds, onFocusNode, onPreviewNode, theme }: { nodes: CanvasNodeData[]; selectedNodeIds: Set<string>; onFocusNode: (nodeId: string) => void; onPreviewNode: (nodeId: string) => void; theme: CanvasTheme }) {
    const { message } = useAppFeedback();
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision);
    const [keyword, setKeyword] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [selectMode, setSelectMode] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return nodes.filter((node) => (typeFilter === "all" || node.type === typeFilter) && (!query || [node.title, node.metadata?.content, node.metadata?.prompt].filter(Boolean).join(" ").toLowerCase().includes(query)));
    }, [nodes, keyword, typeFilter]);
    const treeRows = useMemo(() => {
        const filteredIds = new Set(filtered.map((node) => node.id));
        const groups = new Set(nodes.filter((node) => node.type === CanvasNodeType.Group).map((node) => node.id));
        const children = new Map<string, CanvasNodeData[]>();
        filtered.forEach((node) => {
            const groupId = node.metadata?.groupId;
            if (groupId && groups.has(groupId)) children.set(groupId, [...(children.get(groupId) || []), node]);
        });
        return nodes.flatMap((node) => {
            if (node.metadata?.groupId && groups.has(node.metadata.groupId)) return [];
            if (node.type !== CanvasNodeType.Group) return filteredIds.has(node.id) ? [{ node, depth: 0, hasChildren: false }] : [];
            const groupChildren = children.get(node.id) || [];
            if (!filteredIds.has(node.id) && !groupChildren.length) return [];
            return [{ node, depth: 0, hasChildren: groupChildren.length > 0 }, ...(collapsedGroups.has(node.id) ? [] : groupChildren.map((child) => ({ node: child, depth: 1, hasChildren: false })))];
        });
    }, [collapsedGroups, filtered, nodes]);

    const exitSelect = () => {
        setSelectMode(false);
        setChecked(new Set());
    };
    const toggleChecked = (id: string) =>
        setChecked((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const allChecked = filtered.length > 0 && filtered.every((node) => checked.has(node.id));
    const toggleAll = () => setChecked(allChecked ? new Set() : new Set(filtered.map((node) => node.id)));

    const handleExport = async () => {
        const targets = nodes.filter((node) => checked.has(node.id));
        if (!targets.length) return;
        setExporting(true);
        const hide = message.loading("正在导出选中元素…");
        try {
            await exportCanvasNodes(targets, `画布元素-${targets.length}个`);
            message.success(`已导出 ${targets.length} 个元素`);
            exitSelect();
        } catch (error) {
            console.error(error);
            message.error("导出失败，请重试");
        } finally {
            hide();
            setExporting(false);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
                <span className="text-xs font-medium opacity-60">{"画布元素"}</span>
                {filtered.length ? <span className="text-xs opacity-35">{filtered.length}</span> : null}
                <Button
                    variant="ghost"
                    type="button"
                    onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                    className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium opacity-70 transition hover:bg-accent hover:opacity-100"
                    style={selectMode ? { color: theme.toolbar.activeText, opacity: 1 } : undefined}
                >
                    <ListChecks data-icon="inline-start" aria-hidden />
                    {selectMode ? "取消" : "选择"}
                </Button>
                {selectMode ? null : (
                    <Select
                        value={String(typeFilter ?? "")}
                        onValueChange={(value) => {
                            const option = NODE_FILTER_VALUES.map((value) => ({
                                value,
                                label: value === "all" ? "全部" : ({ image: "图片", video: "视频", text: "文本", audio: "音频", config: "配置", group: "分组" } as Record<string, string>)[String(value)] || String(value),
                            })).find((item) => String(item.value) === value);
                            if (option) setTypeFilter(option.value);
                        }}
                    >
                        <SelectTrigger aria-label="节点类型" className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {NODE_FILTER_VALUES.map((value) => ({
                                    value,
                                    label: value === "all" ? "全部" : ({ image: "图片", video: "视频", text: "文本", audio: "音频", config: "配置", group: "分组" } as Record<string, string>)[String(value)] || String(value),
                                })).map((option) => (
                                    <SelectItem key={String(option.value)} value={String(option.value)}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div className="px-3 pb-2.5">
                <InputGroup>
                    <InputGroupAddon>{<Search className="text-muted-foreground" aria-hidden />}</InputGroupAddon>
                    <InputGroupInput aria-label="搜索节点" placeholder={"搜索节点"} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton aria-label="清空" onClick={() => setKeyword("")}>
                            <X aria-hidden data-icon="inline-start" />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {treeRows.length ? (
                    <div className="flex flex-col gap-1.5">
                        {treeRows.map(({ node, depth, hasChildren }) => {
                            const Icon = NODE_TYPE_ICON[node.type] || FileText;
                            const isImage = node.type === CanvasNodeType.Image && node.metadata?.content;
                            const isChecked = checked.has(node.id);
                            const active = selectMode ? isChecked : selectedNodeIds.has(node.id);
                            return (
                                <div key={node.id} className={cn("group relative flex items-center rounded-lg transition", depth && "ml-5", active ? "" : "hover:bg-accent")} style={active ? { background: theme.toolbar.activeBg } : undefined}>
                                    {depth ? <span className="pointer-events-none absolute -left-3 top-[calc(-50%-0.4rem)] h-[calc(100%+0.4rem)] w-3 rounded-bl-md border-b border-l opacity-45" style={{ borderColor: theme.node.stroke }} /> : null}
                                    {node.type === CanvasNodeType.Group && hasChildren ? (
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            onClick={() => setCollapsedGroups((prev) => (prev.has(node.id) ? new Set([...prev].filter((id) => id !== node.id)) : new Set(prev).add(node.id)))}
                                            className="ml-1 grid size-6 shrink-0 place-items-center opacity-55 transition hover:opacity-100"
                                            aria-label={node.title}
                                        >
                                            <ChevronRight className={cn("transition-transform", !collapsedGroups.has(node.id) && "rotate-90")} data-icon="inline-start" aria-hidden />
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        onClick={() => (selectMode ? toggleChecked(node.id) : onFocusNode(node.id))}
                                        className={cn("flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 text-left", node.type === CanvasNodeType.Group && hasChildren ? "pl-0" : "pl-2")}
                                        title={selectMode ? undefined : "定位到节点"}
                                        aria-pressed={selectMode ? isChecked : undefined}
                                    >
                                        {selectMode ? isChecked ? <SquareCheck aria-hidden data-icon="inline-start" /> : <Square aria-hidden data-icon="inline-start" /> : null}
                                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md">
                                            {isImage ? (
                                                <img src={previewUrlFor(node.metadata?.storageKey) || node.metadata?.content} alt={node.title} className="size-full object-cover" />
                                            ) : (
                                                <Icon className="opacity-60" data-icon="inline-start" aria-hidden />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1 flex flex-col gap-0.5">
                                            <span className="block truncate text-sm font-medium leading-snug">{node.title || getNodeDefinition(node.type)?.title || "未命名节点"}</span>
                                            <span className="block truncate text-xs leading-snug opacity-50">{nodePreviewText(node)}</span>
                                        </span>
                                        {node.metadata?.status && node.metadata.status !== "idle" ? (
                                            <Badge variant={node.metadata.status === "error" ? "destructive" : "secondary"}>{node.metadata.status === "loading" ? "生成中" : node.metadata.status === "error" ? "失败" : "完成"}</Badge>
                                        ) : null}
                                    </Button>
                                    {selectMode || !isImage ? null : (
                                        <div className="flex shrink-0 flex-col items-center gap-0.5 pr-1.5">
                                            <Button
                                                variant="ghost"
                                                type="button"
                                                onClick={() => onPreviewNode(node.id)}
                                                className="grid size-7 place-items-center rounded-md opacity-55 transition hover:bg-accent hover:opacity-100"
                                                aria-label={"放大预览"}
                                                title={"放大预览"}
                                            >
                                                <Eye data-icon="inline-start" aria-hidden />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Empty>
                        <EmptyHeader>
                            <EmptyDescription>画布暂无节点</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
            {selectMode ? (
                <div className="flex items-center gap-2 border-t px-3 py-2.5" style={{ borderColor: theme.toolbar.border }}>
                    <Button variant="ghost" type="button" onClick={toggleAll} className="rounded-md px-2 py-1 text-xs font-medium opacity-70 transition hover:bg-accent hover:opacity-100">
                        {allChecked ? "取消全选" : "全选"}
                    </Button>
                    <span className="text-xs opacity-45">{`已选 ${checked.size}`}</span>
                    <Button
                        variant="ghost"
                        type="button"
                        onClick={() => void handleExport()}
                        disabled={!checked.size || exporting}
                        className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                        style={{ color: theme.node.text }}
                    >
                        <Download data-icon="inline-start" aria-hidden />
                        {"导出选中"}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Assets tab: collapsible type groups, tag filtering, and click-to-insert.
// ---------------------------------------------------------------------------

const ASSET_GROUPS: { kind: AssetKind; icon: typeof Square }[] = [
    { kind: "image", icon: ImageIcon },
    { kind: "video", icon: Video },
    { kind: "text", icon: FileText },
];

function buildInsertPayload(asset: Asset): InsertAssetPayload {
    if (asset.kind === "text") return { kind: "text", content: asset.data.content, title: asset.title };
    if (asset.kind === "video") return { kind: "video", url: asset.data.url, storageKey: asset.data.storageKey, title: asset.title, width: asset.data.width, height: asset.data.height };
    return { kind: "image", dataUrl: asset.data.dataUrl, storageKey: asset.data.storageKey, title: asset.title };
}

const CanvasAssetsTab = memo(function CanvasAssetsTab({ onInsert, theme }: { onInsert: (payload: InsertAssetPayload) => void; theme: CanvasTheme }) {
    const { message } = useAppFeedback();
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const removeAsset = useAssetStore((state) => state.removeAsset);
    const [keyword, setKeyword] = useState("");
    const [tagFilter, setTagFilter] = useState<string>("all");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allTags = useMemo(() => Array.from(new Set(assets.flatMap((asset) => asset.tags || []))).slice(0, 20), [assets]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return assets.filter((asset) => (tagFilter === "all" || (asset.tags || []).includes(tagFilter)) && (!query || [asset.title, ...(asset.tags || [])].join(" ").toLowerCase().includes(query)));
    }, [assets, keyword, tagFilter]);

    const groups = useMemo(() => ASSET_GROUPS.map((group) => ({ ...group, items: filtered.filter((asset) => asset.kind === group.kind) })).filter((group) => group.items.length > 0), [filtered]);

    const handleFiles = async (fileList: FileList | null) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        setUploading(true);
        const hide = message.loading("正在添加资产…");
        let added = 0;
        try {
            for (const file of files) {
                if (file.type.startsWith("image/")) {
                    const image = await uploadImage(file);
                    addAsset({ kind: "image", title: file.name || "图片", coverUrl: image.url, tags: [], data: { dataUrl: image.url, storageKey: image.storageKey, width: image.width, height: image.height, bytes: image.bytes, mimeType: image.mimeType } });
                    added += 1;
                } else if (file.type.startsWith("video/")) {
                    const media = await uploadMediaFile(file, "video");
                    addAsset({ kind: "video", title: file.name || "视频", coverUrl: "", tags: [], data: { url: media.url, storageKey: media.storageKey, width: media.width || 0, height: media.height || 0, bytes: media.bytes, mimeType: media.mimeType } });
                    added += 1;
                }
            }
            if (added) message.success(`已添加 ${added} 个资产`);
            else message.warning("仅支持图片或视频文件");
        } catch (error) {
            console.error(error);
            message.error("添加失败，请重试");
        } finally {
            hide();
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                <InputGroup>
                    <InputGroupAddon>{<Search className="text-muted-foreground" aria-hidden />}</InputGroupAddon>
                    <InputGroupInput aria-label="搜索资产" placeholder={"搜索资产"} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton aria-label="清空" onClick={() => setKeyword("")}>
                            <X aria-hidden data-icon="inline-start" />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                <Button
                    variant="ghost"
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
                    style={{ color: theme.node.text }}
                >
                    <Plus data-icon="inline-start" aria-hidden />
                    {"添加"}
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
            </div>
            {allTags.length ? (
                <ToggleGroup type="single" value={tagFilter} onValueChange={(value) => setTagFilter(value || "all")} className="flex-wrap px-3 pb-2" aria-label="素材标签">
                    <ToggleGroupItem value="all">全部</ToggleGroupItem>
                    {allTags.map((tag) => (
                        <ToggleGroupItem key={tag} value={tag}>
                            {tag}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {groups.length ? (
                    <div className="flex flex-col gap-1">
                        {groups.map((group) => {
                            const isCollapsed = collapsed[group.kind];
                            return (
                                <div key={group.kind}>
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        onClick={() => setCollapsed((prev) => ({ ...prev, [group.kind]: !prev[group.kind] }))}
                                        className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs font-semibold opacity-75 transition hover:opacity-100"
                                    >
                                        <ChevronRight className={cn("transition-transform", !isCollapsed && "rotate-90")} data-icon="inline-start" aria-hidden />
                                        <group.icon className="size-3.5" />
                                        <span>{({ text: "文本", image: "图片", video: "视频", audio: "音频" } as Record<string, string>)[String(group.kind)] || String(group.kind)}</span>
                                        <span className="opacity-50">{group.items.length}</span>
                                    </Button>
                                    {isCollapsed ? null : (
                                        <div className="grid grid-cols-2 gap-2 px-1 pb-2 pt-1">
                                            {group.items.map((asset) => (
                                                <AssetCard key={asset.id} asset={asset} theme={theme} onInsert={() => onInsert(buildInsertPayload(asset))} onRemove={() => (removeAsset(asset.id), message.success("资产已移除"))} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Empty className={"pt-16"}>
                        <EmptyHeader>
                            <EmptyDescription>{"暂无资产"}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </div>
    );
});

function AssetCard({ asset, theme, onInsert, onRemove }: { asset: Asset; theme: CanvasTheme; onInsert: () => void; onRemove: () => void }) {
    return (
        <div className="group relative aspect-square overflow-hidden rounded-xl border transition duration-200 hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: theme.node.stroke, background: theme.node.panel }}>
            <AssetCover asset={asset} />
            <div className="absolute inset-0 flex items-center justify-center gap-2.5 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                <Button variant="secondary" size="icon" type="button" onClick={onInsert} aria-label={"插入画布"}>
                    <Plus data-icon="inline-start" aria-hidden />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" type="button" aria-label={"移除资产"}>
                            <Trash2 data-icon="inline-start" aria-hidden />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{"移除该资产？"}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{"取消"}</AlertDialogCancel>
                            <AlertDialogAction onClick={onRemove}>{"移除"}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

function AssetCover({ asset }: { asset: Asset }) {
    if (asset.kind === "text") return <div className="size-full overflow-hidden whitespace-pre-wrap break-words p-2.5 text-[11px] leading-snug opacity-80">{asset.data.content}</div>;
    if (asset.kind === "video") {
        if (asset.coverUrl) return <img src={asset.coverUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />;
        return <video src={`${asset.data.url}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />;
    }
    return <img src={asset.coverUrl || asset.data.dataUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />;
}
