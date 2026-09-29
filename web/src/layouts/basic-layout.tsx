"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AgentPanel } from "@/components/agent/agent-panel";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function BasicLayout({ children }: { children: ReactNode }) {
    const canvasEditor = /^\/canvas\/[^/]+$/.test(usePathname());
    const content = (
        <div className="flex h-dvh w-full min-h-0 overflow-hidden bg-background text-foreground">
            {!canvasEditor && <AppSidebar />}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <AppHeader />
                <div id="app-main-content" className="@container isolate min-h-0 flex-1 overflow-hidden">
                    {children}
                </div>
                <AppFooter />
            </div>
            <AgentPanel />
        </div>
    );
    return <SidebarProvider className="min-h-0 h-dvh">{content}</SidebarProvider>;
}
