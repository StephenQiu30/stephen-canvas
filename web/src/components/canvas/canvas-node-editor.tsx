import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { X } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CanvasNodeData, ViewportTransform } from "@/types/canvas";

export function CanvasNodeEditor({ node, viewport, onClose, actions, boundary, children }: { node: CanvasNodeData; viewport: ViewportTransform; onClose: () => void; actions?: ReactNode; boundary?: Element | null; children: ReactNode }) {
    const titleId = useId();
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);
    useLayoutEffect(() => {
        if (contentRef.current) setContentHeight(contentRef.current.scrollHeight + 2);
    });
    const nodeTop = viewport.y + node.position.y * viewport.k;
    const nodeBottom = nodeTop + node.height * viewport.k;
    const canvasHeight = boundary?.clientHeight || 0;
    const editorHeight = Math.min(contentHeight, Math.max(0, canvasHeight - 72 - 88));
    // Keep the whole editor in the canvas when its node leaves too little room below it.
    const anchorBottom = contentHeight && nodeBottom > 0 && nodeTop < canvasHeight ? Math.max(72, Math.min(nodeBottom, canvasHeight - 88 - 12 - editorHeight)) : nodeBottom;
    return (
        <Popover
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <PopoverAnchor asChild>
                <div className="pointer-events-none absolute" style={{ left: viewport.x + node.position.x * viewport.k, top: Math.min(nodeTop, anchorBottom), width: node.width * viewport.k, height: Math.max(0, anchorBottom - nodeTop) }} />
            </PopoverAnchor>
            <PopoverContent
                ref={contentRef}
                side="bottom"
                sideOffset={12}
                collisionBoundary={boundary}
                hideWhenDetached
                collisionPadding={{ top: 72, bottom: 88, left: 16, right: 16 }}
                sticky="always"
                updatePositionStrategy="always"
                className="max-h-[var(--radix-popover-content-available-height)] w-[min(600px,var(--radix-popover-content-available-width))] gap-0 overflow-y-auto p-0"
                aria-labelledby={titleId}
                aria-describedby={undefined}
                data-canvas-node-editor={node.id}
                data-canvas-no-zoom
                onOpenAutoFocus={(event) => {
                    const editor = event.target instanceof HTMLElement ? event.target.querySelector<HTMLElement>("[role='textbox']") : null;
                    if (editor) {
                        event.preventDefault();
                        editor.focus({ preventScroll: true });
                    }
                }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    (document.querySelector<HTMLElement>("[data-canvas-node-editor] [role='textbox']") || document.querySelector<HTMLElement>("[data-canvas-viewport]"))?.focus({ preventScroll: true });
                }}
                onInteractOutside={(event) => {
                    const target = event.target instanceof Element ? event.target : null;
                    if (target?.closest("[data-node-id],[data-node-toolbar],[data-canvas-toolbar],[data-canvas-no-zoom],[role='dialog'],[role='alertdialog'],[role='menu'],[role='listbox'],[data-slot='popover-content']")) event.preventDefault();
                }}
            >
                <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
                    <span id={titleId} className="truncate text-sm font-medium">
                        {node.title || "节点创作"}
                    </span>
                    <Button variant="ghost" size="icon-sm" aria-label="关闭节点编辑" onClick={onClose}>
                        <X data-icon="inline-start" aria-hidden />
                    </Button>
                </div>
                {actions}
                {children}
            </PopoverContent>
        </Popover>
    );
}
