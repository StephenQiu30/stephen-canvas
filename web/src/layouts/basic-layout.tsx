import type { ReactNode } from "react";

import { AgentPanel } from "@/components/agent/agent-panel";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";

export function BasicLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <AppHeader />
                <div id="app-main-content" className="min-h-0 flex-1 overflow-hidden">
                    {children}
                </div>
                <AppFooter />
            </div>
            <AgentPanel />
        </div>
    );
}
