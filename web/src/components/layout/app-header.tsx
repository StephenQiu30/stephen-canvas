"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppConfigModal } from "@/components/layout/app-config-modal";
import { AppToolbarActions } from "@/components/layout/app-toolbar-actions";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";
import { useAgentStore } from "@/stores/use-agent-store";
import { useEffect, useRef } from "react";

export function AppHeader() {
    const pathname = usePathname();
    const autoConnectRef = useRef(false);
    const agentToken = useAgentStore((state) => state.token);
    const agentEnabled = useAgentStore((state) => state.enabled);
    const agentConnected = useAgentStore((state) => state.connected);
    const connectAgent = useAgentStore((state) => state.connectAgent);
    const togglePanel = useAgentStore((state) => state.togglePanel);
    const panelOpen = useAgentStore((state) => state.panelOpen);
    const hideHeader = /^\/canvas\/[^/]+$/.test(pathname);
    const isWorkspaceRoute = pathname === "/" || hideHeader || navigationTools.some((tool) => pathname === `/${tool.slug}`);
    const slug = pathname.split("/").filter(Boolean)[0];
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;

    useEffect(() => {
        if (!isWorkspaceRoute || autoConnectRef.current || agentEnabled || agentConnected || !agentToken.trim()) return;
        autoConnectRef.current = true;
        connectAgent({ silent: true });
    }, [agentConnected, agentEnabled, agentToken, connectAgent, isWorkspaceRoute]);

    return (
        <>
            {!hideHeader ? (
                <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 lg:px-10">
                    <div className="flex min-w-0 items-center gap-3">
                        <SidebarTrigger aria-label="切换导航" />
                        <Link href={activeToolSlug ? `/${activeToolSlug}` : "/"} className="truncate text-sm text-muted-foreground">
                            {activeToolSlug === "canvas"
                                ? "项目空间"
                                : activeToolSlug
                                  ? ({ canvas: "我的画布", image: "生图工作台", video: "视频创作台", assets: "我的资产", config: "配置" } as Record<string, string>)[String(activeToolSlug)] || String(activeToolSlug)
                                  : "创作工作台"}
                        </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={togglePanel} aria-pressed={panelOpen} aria-label={panelOpen ? "收起 Agent" : "打开 Agent"}>
                                    <Bot />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{panelOpen ? "收起 Agent" : "打开 Agent"}</TooltipContent>
                        </Tooltip>
                        <AppToolbarActions />
                    </div>
                </header>
            ) : null}

            <AppConfigModal />
        </>
    );
}
