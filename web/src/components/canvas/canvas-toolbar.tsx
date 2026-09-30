import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { canvasThemes, type CanvasBackgroundMode } from "@/lib/canvas-theme";
import { listNodeDefinitions, useNodeRegistryVersion } from "@/lib/canvas/node-registry";
import { useCanvasSidePanelStore } from "@/stores/use-canvas-side-panel-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { Eraser, Hand, Images, Info, MoreHorizontal, MousePointer2, Palette, Plus, Redo2, Trash2, Undo2, Upload } from "lucide-react";
import { useState } from "react";

export function CanvasToolbar({
    selectedCount,
    canvasTool,
    canUndo,
    canRedo,
    backgroundMode,
    showImageInfo,
    onCreateNode,
    onUndo,
    onRedo,
    onUpload,
    onDelete,
    onClear,
    onCanvasToolChange,
    onBackgroundModeChange,
    onShowImageInfoChange,
}: {
    selectedCount: number;
    canvasTool: "select" | "pan";
    canUndo: boolean;
    canRedo: boolean;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    onCreateNode: (type: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onUpload: () => void;
    onDelete: () => void;
    onClear: () => void;
    onCanvasToolChange: (tool: "select" | "pan") => void;
    onBackgroundModeChange: (mode: CanvasBackgroundMode) => void;
    onShowImageInfoChange: (show: boolean) => void;
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const colorTheme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const theme = canvasThemes[colorTheme];
    const panelOpen = useCanvasSidePanelStore((state) => state.panelOpen);
    const togglePanel = useCanvasSidePanelStore((state) => state.togglePanel);
    useNodeRegistryVersion();
    const definitions = listNodeDefinitions().filter((definition) => definition.showInCreateMenu !== false);

    return (
        <div data-canvas-no-zoom className="absolute bottom-4 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2" aria-label="画布工具栏">
            <div className="flex h-12 items-center gap-1 rounded-xl border px-2" style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border }}>
                <Popover open={createOpen} onOpenChange={setCreateOpen}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <Button size="icon-sm" aria-label="添加节点">
                                    <Plus data-icon="inline-start" aria-hidden />
                                </Button>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">添加节点</TooltipContent>
                    </Tooltip>
                    <PopoverContent side="top" align="start" sideOffset={12} className="w-64 max-h-[min(70dvh,480px)] overflow-y-auto" data-canvas-no-zoom>
                        <p className="mb-3 text-sm font-medium">添加节点</p>
                        <div className="grid grid-cols-2 gap-1">
                            {definitions.map((definition) => (
                                <Button
                                    key={definition.type}
                                    variant="ghost"
                                    className="justify-start"
                                    onClick={() => {
                                        onCreateNode(definition.type);
                                        setCreateOpen(false);
                                    }}
                                >
                                    {definition.icon}
                                    {definition.title}
                                </Button>
                            ))}
                        </div>
                        <Separator className="my-3" />
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                                onUpload();
                                setCreateOpen(false);
                            }}
                        >
                            <Upload data-icon="inline-start" aria-hidden />
                            上传图片、视频或音频
                        </Button>
                    </PopoverContent>
                </Popover>
                <ToggleGroup
                    type="single"
                    value={canvasTool}
                    onValueChange={(value) => {
                        if (value) onCanvasToolChange(value as "select" | "pan");
                    }}
                    aria-label="画布操作模式"
                >
                    <ToggleGroupItem value="select" aria-label="选择工具" title="选择工具">
                        <MousePointer2 data-icon="inline-start" aria-hidden />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pan" aria-label="移动工具" title="移动工具">
                        <Hand data-icon="inline-start" aria-hidden />
                    </ToggleGroupItem>
                </ToggleGroup>
                <Separator orientation="vertical" className="h-5" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="资产管理" aria-pressed={panelOpen} onClick={togglePanel}>
                            <Images data-icon="inline-start" aria-hidden />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">资产管理</TooltipContent>
                </Tooltip>
                <div className="hidden items-center @min-[560px]/canvas:flex">
                    <Button variant="ghost" size="icon-sm" aria-label="撤销" title="撤销" disabled={!canUndo} onClick={onUndo}>
                        <Undo2 data-icon="inline-start" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="重做" title="重做" disabled={!canRedo} onClick={onRedo}>
                        <Redo2 data-icon="inline-start" aria-hidden />
                    </Button>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="画布外观" title="画布外观">
                            <Palette data-icon="inline-start" aria-hidden />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" sideOffset={12} className="w-64" data-canvas-no-zoom>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>主题</FieldLabel>
                                <ToggleGroup
                                    type="single"
                                    value={colorTheme}
                                    onValueChange={(value) => {
                                        if (value) setTheme(value as "light" | "dark");
                                    }}
                                    aria-label="主题"
                                >
                                    <ToggleGroupItem value="light">浅色</ToggleGroupItem>
                                    <ToggleGroupItem value="dark">深色</ToggleGroupItem>
                                </ToggleGroup>
                            </Field>
                            <Field>
                                <FieldLabel>画布背景</FieldLabel>
                                <ToggleGroup
                                    type="single"
                                    value={backgroundMode}
                                    onValueChange={(value) => {
                                        if (value) onBackgroundModeChange(value as CanvasBackgroundMode);
                                    }}
                                    aria-label="画布背景"
                                >
                                    <ToggleGroupItem value="dots">点阵</ToggleGroupItem>
                                    <ToggleGroupItem value="lines">网格</ToggleGroupItem>
                                    <ToggleGroupItem value="blank">纯色</ToggleGroupItem>
                                </ToggleGroup>
                            </Field>
                            <Field orientation="horizontal">
                                <FieldLabel htmlFor="canvas-image-info">
                                    <Info />
                                    图片信息
                                </FieldLabel>
                                <Switch id="canvas-image-info" checked={showImageInfo} onCheckedChange={onShowImageInfoChange} />
                            </Field>
                        </FieldGroup>
                    </PopoverContent>
                </Popover>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="更多画布操作">
                            <MoreHorizontal data-icon="inline-start" aria-hidden />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end">
                        <DropdownMenuGroup>
                            <DropdownMenuItem disabled={!canUndo} onSelect={onUndo}>
                                <Undo2 aria-hidden />
                                撤销
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canRedo} onSelect={onRedo}>
                                <Redo2 aria-hidden />
                                重做
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" disabled={!selectedCount} onSelect={onDelete}>
                                <Trash2 aria-hidden />
                                删除选中
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={onClear}>
                                <Eraser aria-hidden />
                                清空画布
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
