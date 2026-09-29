"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "motion/react";
import { useState, type PointerEvent as ReactPointerEvent } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { CANVAS_AGENT_PANEL_MOTION_MS, useAgentStore } from "@/stores/use-agent-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { LocalAgentPanel } from "./local-agent-panel";

const PANEL_MOTION_SECONDS = CANVAS_AGENT_PANEL_MOTION_MS / 1000;

export function AgentPanel() {
    const isMobile = useIsMobile();
    const togglePanel = useAgentStore((state) => state.togglePanel);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const width = useAgentStore((state) => state.width);
    const [resizing, setResizing] = useState(false);
    const panelMounted = useAgentStore((state) => state.panelMounted);
    const panelOpen = useAgentStore((state) => state.panelOpen);
    const panelClosing = useAgentStore((state) => state.panelClosing);
    const setAgentState = useAgentStore((state) => state.setAgentState);
    const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = width;
        let nextWidth = startWidth;
        const onMove = (moveEvent: PointerEvent) => {
            nextWidth = Math.min(760, Math.max(360, startWidth + startX - moveEvent.clientX));
            setAgentState({ width: nextWidth });
        };
        const onUp = () => {
            localStorage.setItem("canvas-agent-panel-width", String(nextWidth));
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            setResizing(false);
        };
        setResizing(true);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    if (!panelMounted) return null;

    if (isMobile)
        return (
            <Sheet
                open={panelOpen}
                onOpenChange={(open) => {
                    if (!open && panelOpen) togglePanel();
                }}
            >
                <SheetContent aria-describedby={undefined} className="p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none" showCloseButton={false}>
                    <SheetHeader className="sr-only">
                        <SheetTitle>Canvas Agent</SheetTitle>
                    </SheetHeader>
                    <LocalAgentPanel embedded />
                </SheetContent>
            </Sheet>
        );

    return (
        <motion.div
            inert={!panelOpen}
            aria-hidden={!panelOpen}
            className="relative flex h-full max-w-full shrink-0"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelOpen ? width + 1 : 0, opacity: panelOpen ? 1 : 0 }}
            transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "clip", pointerEvents: panelOpen && !panelClosing ? undefined : "none" }}
        >
            <motion.aside
                className="relative flex h-full max-w-[100vw] shrink-0 flex-col border-l"
                data-canvas-shortcuts-ignore
                initial={{ x: 48 }}
                animate={{ x: panelClosing ? 28 : 0 }}
                transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
                style={{ width, background: theme.node.panel, borderColor: theme.node.stroke, color: theme.node.text }}
            >
                <Button variant="ghost" type="button" className="absolute inset-y-0 left-0 hidden h-full w-4 md:block -translate-x-1/2 cursor-col-resize" onPointerDown={startResize} aria-label={"调整右侧面板宽度"} />
                <LocalAgentPanel embedded />
            </motion.aside>
        </motion.div>
    );
}
