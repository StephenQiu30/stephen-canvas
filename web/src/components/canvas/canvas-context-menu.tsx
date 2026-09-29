import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BetweenHorizontalStart, GalleryHorizontal, GalleryHorizontalEnd, Group, Plus, Trash2, Ungroup } from "lucide-react";

import type { VideoFramePosition } from "@/lib/canvas/canvas-video-frame";
import type { ContextMenuState } from "@/types/canvas";

export function CanvasNodeContextMenu({
    menu,
    canCaptureVideoFrame,
    canGroup,
    canUngroup,
    onClose,
    onCaptureVideoFrame,
    onDuplicate,
    onGroup,
    onUngroup,
    onDelete,
}: {
    menu: ContextMenuState;
    canCaptureVideoFrame: boolean;
    canGroup?: boolean;
    canUngroup?: boolean;
    onClose: () => void;
    onCaptureVideoFrame: (position: VideoFramePosition) => void;
    onDuplicate: () => void;
    onGroup?: () => void;
    onUngroup?: () => void;
    onDelete: () => void;
}) {
    return (
        <DropdownMenu
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DropdownMenuTrigger asChild>
                <span className="fixed size-px" style={{ left: menu.x, top: menu.y }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent onPointerDown={(event) => event.stopPropagation()} align="start" sideOffset={0} onCloseAutoFocus={(event) => event.preventDefault()}>
                {canCaptureVideoFrame ? (
                    <>
                        <DropdownMenuItem onSelect={() => onCaptureVideoFrame("first")}>
                            <BetweenHorizontalStart className="size-4" />
                            截取首帧
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onCaptureVideoFrame("last")}>
                            <GalleryHorizontalEnd className="size-4" />
                            截取尾帧
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onCaptureVideoFrame("current")}>
                            <GalleryHorizontal className="size-4" />
                            截取当前帧
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                ) : null}
                {menu.type === "node" && canGroup ? (
                    <DropdownMenuItem onSelect={onGroup}>
                        <Group className="size-4" />
                        打组
                    </DropdownMenuItem>
                ) : null}
                {menu.type === "node" && canUngroup ? (
                    <DropdownMenuItem onSelect={onUngroup}>
                        <Ungroup className="size-4" />
                        解散组
                    </DropdownMenuItem>
                ) : null}
                {menu.type === "node" ? (
                    <DropdownMenuItem onSelect={onDuplicate}>
                        <Plus className="size-4" />
                        复制
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 className="size-4" />
                    删除
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
