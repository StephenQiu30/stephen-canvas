import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { Download, Home, Images, Menu, Plus, Redo2, Trash2, Undo2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppToolbarActions } from "@/components/layout/app-toolbar-actions";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

export function CanvasTopBar({
    title,
    titleDraft,
    isTitleEditing,
    onTitleDraftChange,
    onStartTitleEditing,
    onFinishTitleEditing,
    onCancelTitleEditing,
    canUndo,
    canRedo,
    onHome,
    onProjects,
    onCreateProject,
    onDeleteProject,
    onExportProject,
    onImportImage,
    onOpenPlugins,
    onUndo,
    onRedo,
}: {
    title: string;
    titleDraft: string;
    isTitleEditing: boolean;
    onTitleDraftChange: (value: string) => void;
    onStartTitleEditing: () => void;
    onFinishTitleEditing: () => void;
    onCancelTitleEditing: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onHome: () => void;
    onProjects: () => void;
    onCreateProject: () => void;
    onDeleteProject: () => void;
    onExportProject: () => void;
    onImportImage: () => void;
    onOpenPlugins: () => void;
    onUndo: () => void;
    onRedo: () => void;
}) {
    const colorTheme = useThemeStore((state) => state.theme);
    const theme = canvasThemes[colorTheme];
    const titleRef = useRef<HTMLDivElement>(null);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const titleCancelledRef = useRef(false);

    useEffect(() => {
        if (!isTitleEditing) return;
        const close = (event: PointerEvent) => {
            if (!titleRef.current?.contains(event.target as Node)) onFinishTitleEditing();
        };
        document.addEventListener("pointerdown", close, true);
        return () => document.removeEventListener("pointerdown", close, true);
    }, [isTitleEditing, onFinishTitleEditing]);

    return (
        <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-2 px-4">
                <div className="pointer-events-auto flex min-w-0 items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" type="button" className="grid size-7 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10" style={{ color: theme.node.text }} aria-label={"打开画布菜单"}>
                                <Menu className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="start">
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        onHome();
                                    }}
                                >
                                    {<Home className="size-4" />}
                                    {"主页"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        onProjects();
                                    }}
                                >
                                    {<Images className="size-4" />}
                                    {"我的画布"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        onCreateProject();
                                    }}
                                >
                                    {<Plus className="size-4" />}
                                    {"新建画布"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => {
                                        onDeleteProject();
                                    }}
                                >
                                    {<Trash2 className="size-4" />}
                                    {"删除当前画布"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        onImportImage();
                                    }}
                                >
                                    {<Upload className="size-4" />}
                                    {"导入资产"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => {
                                        onExportProject();
                                    }}
                                >
                                    {<Download className="size-4" />}
                                    {"导出当前画布"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={!canUndo}
                                    onSelect={() => {
                                        onUndo();
                                    }}
                                >
                                    {<Undo2 className="size-4" />}
                                    {<MenuLabel text={"撤销"} shortcut="⌘ Z" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={!canRedo}
                                    onSelect={() => {
                                        onRedo();
                                    }}
                                >
                                    {<Redo2 className="size-4" />}
                                    {<MenuLabel text={"重做"} shortcut="⌘ ⇧ Z / ⌘ Y" />}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div ref={titleRef} className="flex min-w-0 items-center gap-2">
                        {isTitleEditing ? (
                            <Input
                                autoFocus
                                value={titleDraft}
                                onChange={(event) => onTitleDraftChange(event.target.value)}
                                aria-label="项目名称"
                                onBlur={() => {
                                    if (!titleCancelledRef.current) onFinishTitleEditing();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") onFinishTitleEditing();
                                    if (event.key === "Escape") {
                                        titleCancelledRef.current = true;
                                        onCancelTitleEditing();
                                    }
                                }}
                                className="w-40 @min-[760px]/canvas:w-64"
                                style={{ color: theme.node.text }}
                            />
                        ) : (
                            <Button
                                variant="ghost"
                                type="button"
                                className="max-w-32 truncate @min-[760px]/canvas:max-w-64"
                                onClick={() => {
                                    titleCancelledRef.current = false;
                                    onStartTitleEditing();
                                }}
                                title="修改画布名称"
                            >
                                {title}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5">
                    <AppToolbarActions variant="canvas" onOpenShortcuts={() => setShortcutsOpen(true)} onOpenPlugins={onOpenPlugins} />
                </div>
            </div>
            <Dialog
                open={shortcutsOpen}
                onOpenChange={(open) => {
                    if (!open) (() => setShortcutsOpen(false))();
                }}
            >
                <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"}>
                    <DialogHeader>
                        <DialogTitle>{"快捷键"}</DialogTitle>
                    </DialogHeader>
                    <div>
                        <div className="flex flex-col gap-2 border-t pt-4 text-sm" style={{ borderColor: theme.node.stroke }}>
                            <Shortcut keys={["Ctrl / Space", "拖动"]} value={"临时切换选择 / 移动"} />
                            <Shortcut keys={["滚轮"]} value={"缩放画布"} />
                            <Shortcut keys={["Ctrl / Cmd", "0"]} value="适合屏幕" />
                            <Shortcut keys={["Ctrl / Cmd", "+ / −"]} value="放大 / 缩小画布" />
                            <Shortcut keys={["拖动"]} value={"框选多个节点"} />
                            <Shortcut keys={["Shift / Cmd", "点击"]} value={"追加选择节点"} />
                            <Shortcut keys={["Ctrl / Cmd", "A"]} value={"全选节点"} />
                            <Shortcut keys={["Ctrl / Cmd", "C / V"]} value={"复制 / 粘贴节点，或粘贴剪切板文本/图片"} />
                            <Shortcut keys={["Ctrl / Cmd", "G"]} value={"将选中节点打组"} />
                            <Shortcut keys={["Ctrl / Cmd", "Shift", "G"]} value={"解散选中的组"} />
                            <Shortcut keys={["Ctrl / Cmd", "Z"]} value={"撤销"} />
                            <Shortcut keys={["Ctrl / Cmd", "Shift", "Z"]} value={"重做"} />
                            <Shortcut keys={["Ctrl / Cmd", "Y"]} value={"重做"} />
                            <Shortcut keys={["Delete / Backspace"]} value={"删除选中"} />
                            <Shortcut keys={["Esc"]} value={"取消选择并关闭浮层"} />
                            <Shortcut keys={["拖入图片/视频/音频"]} value={"上传到画布"} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function MenuLabel({ text, shortcut }: { text: string; shortcut: string }) {
    return (
        <span className="flex min-w-36 items-center justify-between gap-8">
            <span>{text}</span>
            <span className="text-xs opacity-45">{shortcut}</span>
        </span>
    );
}

function Shortcut({ keys, value }: { keys: string[]; value: string }) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-6 rounded-lg px-1 py-1.5">
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                {keys.map((key, index) => (
                    <span key={`${key}-${index}`} className="flex items-center gap-1.5">
                        {index ? <span className="text-xs opacity-35">+</span> : null}
                        <kbd className="min-w-9 rounded-md border bg-muted px-2.5 py-1.5 text-center text-xs font-medium leading-none text-muted-foreground">{key}</kbd>
                    </span>
                ))}
            </span>
            <span className="text-right text-sm opacity-55">{value}</span>
        </div>
    );
}
