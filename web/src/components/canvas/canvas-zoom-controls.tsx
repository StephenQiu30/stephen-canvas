import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Compass, Focus, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

type CanvasZoomControlsProps = {
    scale: number;
    onScaleChange: (scale: number) => void;
    onReset: () => void;
    isMiniMapOpen: boolean;
    onToggleMiniMap: () => void;
};

export function CanvasZoomControls({ scale, onScaleChange, onReset, isMiniMapOpen, onToggleMiniMap }: CanvasZoomControlsProps) {
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const colorTheme = useThemeStore((state) => state.theme);
    const theme = canvasThemes[colorTheme];
    const dockStyle = { background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.toolbar.item, boxShadow: colorTheme === "dark" ? "0 18px 45px rgba(0,0,0,.32)" : "0 16px 40px rgba(28,25,23,.12)" };
    const activeStyle = { background: theme.toolbar.activeBg, color: theme.toolbar.activeText };

    return (
        <div className="absolute bottom-5 left-5 z-50" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex h-14 items-center gap-1 rounded-xl border px-2 shadow-lg backdrop-blur" style={dockStyle}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            style={isMiniMapOpen ? activeStyle : { color: theme.toolbar.item }}
                            onClick={onToggleMiniMap}
                            aria-label={isMiniMapOpen ? "关闭小地图" : "打开小地图"}
                            type={"button"}
                            variant={"ghost"}
                            size="icon"
                            className={"!h-8 !w-8 !min-w-8 !p-0"}
                        >
                            {<Compass data-icon="inline-start" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{isMiniMapOpen ? "关闭小地图" : "打开小地图"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button style={{ color: theme.toolbar.item }} onClick={onReset} aria-label={"重置视图"} type={"button"} variant={"ghost"} size="icon" className={"!h-8 !w-8 !min-w-8 !p-0"}>
                            {<Focus data-icon="inline-start" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{"重置视图"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Slider min={5} max={500} step={1} value={[Math.round(scale * 100)]} className="w-24" onValueChange={([value]) => onScaleChange(value / 100)} aria-label="放大/缩小画布" />
                    </TooltipTrigger>
                    <TooltipContent side="top">{"放大/缩小画布"}</TooltipContent>
                </Tooltip>
                <span className="w-10 text-right text-xs tabular-nums" style={{ color: theme.node.muted }}>
                    {Math.round(scale * 100)}%
                </span>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button style={shortcutsOpen ? activeStyle : { color: theme.toolbar.item }} onClick={() => setShortcutsOpen(true)} aria-label={"快捷键"} type={"button"} variant={"ghost"} size="icon" className={"!h-8 !w-8 !min-w-8 !p-0"}>
                            {<HelpCircle data-icon="inline-start" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{"快捷键"}</TooltipContent>
                </Tooltip>
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
                        <div className="flex flex-col gap-3 border-t pt-4 text-sm" style={{ borderColor: theme.node.stroke }}>
                            <Shortcut label={`Ctrl / Space + ${"拖动"}`} value={"临时切换选择 / 移动"} />
                            <Shortcut label={"滚轮"} value={"缩放画布"} />
                            <Shortcut label={"拖动"} value={"框选多个节点"} />
                            <Shortcut label={`Shift / Cmd + ${"点击"}`} value={"追加选择节点"} />
                            <Shortcut label="Ctrl / Cmd + C / V" value={"复制 / 粘贴节点"} />
                            <Shortcut label="Ctrl / Cmd + G" value={"将选中节点打组"} />
                            <Shortcut label="Ctrl / Cmd + Shift + G" value={"解散选中的组"} />
                            <Shortcut label="Delete / Backspace" value={"删除选中"} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Shortcut({ label, value }: { label: ReactNode; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-base font-medium">{label}</span>
            <span className="opacity-60">{value}</span>
        </div>
    );
}
