import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { CanvasLayoutAction } from "@/lib/canvas/canvas-node-actions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlignLeft, Group, LayoutGrid, Ungroup } from "lucide-react";
import type { ReactNode } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { nodeBounds } from "@/lib/canvas/canvas-node-geometry";
import { useThemeStore } from "@/stores/use-theme-store";
import type { CanvasNodeData, ViewportTransform } from "@/types/canvas";

const SELECTION_PAD = 14;

export function CanvasSelectionToolbar({
    nodes,
    viewport,
    showToolbar,
    canGroup,
    canUngroup,
    onGroup,
    onUngroup,
    onLayout,
    onDismiss,
}: {
    nodes: CanvasNodeData[];
    viewport: ViewportTransform;
    showToolbar: boolean;
    canGroup: boolean;
    canUngroup: boolean;
    onGroup: () => void;
    onDismiss: () => void;
    onLayout: (action: CanvasLayoutAction) => void;
    onUngroup: () => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    if (nodes.length < 2) return null;

    const bounds = nodeBounds(nodes);
    const left = viewport.x + bounds.left * viewport.k - SELECTION_PAD;
    const top = viewport.y + bounds.top * viewport.k - SELECTION_PAD;
    const width = (bounds.right - bounds.left) * viewport.k + SELECTION_PAD * 2;
    const height = (bounds.bottom - bounds.top) * viewport.k + SELECTION_PAD * 2;
    const showActions = showToolbar;

    return (
        <>
            <svg className="pointer-events-none absolute z-[65] overflow-visible" style={{ left, top, width, height }}>
                <rect
                    x={1}
                    y={1}
                    width={Math.max(width - 2, 0)}
                    height={Math.max(height - 2, 0)}
                    rx={16}
                    ry={16}
                    fill={theme.canvas.selectionFill}
                    stroke={theme.canvas.selectionStroke}
                    strokeOpacity={0.55}
                    strokeWidth={1.5}
                    strokeDasharray="7 5"
                    strokeLinecap="round"
                />
            </svg>
            {showActions ? (
                <Popover
                    open
                    onOpenChange={(open) => {
                        if (!open) onDismiss();
                    }}
                >
                    <PopoverAnchor asChild>
                        <div className="pointer-events-none absolute" style={{ left, top, width, height }} />
                    </PopoverAnchor>
                    <PopoverContent
                        role="toolbar"
                        aria-label="选区操作"
                        side="top"
                        sideOffset={8}
                        collisionPadding={{ top: 72, bottom: 88, left: 16, right: 16 }}
                        updatePositionStrategy="always"
                        className="flex w-auto max-w-[calc(100vw-2rem)] flex-row items-center gap-1 overflow-x-auto p-1"
                        data-canvas-no-zoom
                        onOpenAutoFocus={(event) => event.preventDefault()}
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            (document.querySelector<HTMLElement>("[data-canvas-node-editor] [role='textbox']") || document.querySelector<HTMLElement>("[data-canvas-viewport]"))?.focus({ preventScroll: true });
                        }}
                        onInteractOutside={(event) => event.preventDefault()}
                    >
                        <SelectionAction title="整理选中节点" label="整理" icon={<LayoutGrid data-icon="inline-start" aria-hidden />} onClick={() => onLayout("arrange")} />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost">
                                    <AlignLeft data-icon="inline-start" aria-hidden />
                                    对齐
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuGroup>
                                    {(
                                        [
                                            { value: "left", label: "左对齐" },
                                            { value: "right", label: "右对齐" },
                                            { value: "top", label: "顶部对齐" },
                                            { value: "bottom", label: "底部对齐" },
                                            { value: "horizontal", label: "水平分布" },
                                            { value: "vertical", label: "垂直分布" },
                                        ] as const
                                    ).map((item) => (
                                        <DropdownMenuItem key={item.value} disabled={(item.value === "horizontal" || item.value === "vertical") && nodes.length < 3} onSelect={() => onLayout(item.value)}>
                                            {item.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {canGroup ? <SelectionAction title={"用组节点包住选中节点"} label={"打组"} icon={<Group data-icon="inline-start" aria-hidden />} onClick={onGroup} /> : null}
                        {canUngroup ? <SelectionAction title={"取消节点分组"} label={"解散组"} icon={<Ungroup data-icon="inline-start" aria-hidden />} onClick={onUngroup} /> : null}
                    </PopoverContent>
                </Popover>
            ) : null}
        </>
    );
}

function SelectionAction({ title, label, icon, onClick }: { title: string; label: string; icon: ReactNode; onClick: () => void }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" type="button" className="group relative flex h-12 items-center whitespace-nowrap px-1.5" onClick={onClick} aria-label={title}>
                    <span className="flex h-9 items-center gap-2 rounded-lg px-2.5 transition group-hover:bg-accent">
                        {icon}
                        <span>{label}</span>
                    </span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{title}</TooltipContent>
        </Tooltip>
    );
}
