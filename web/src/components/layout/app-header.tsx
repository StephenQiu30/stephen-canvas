"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppConfigModal } from "@/components/layout/app-config-modal";
import { AppToolbarActions } from "@/components/layout/app-toolbar-actions";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";

export function AppHeader() {
    const pathname = usePathname();
    const hideHeader = /^\/canvas\/[^/]+$/.test(pathname);
    const slug = pathname.split("/").filter(Boolean)[0];
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;

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
                                  ? ({ canvas: "我的项目", image: "图片生成", video: "视频生成", assets: "我的素材", config: "模型与服务配置" } as Record<string, string>)[String(activeToolSlug)] || String(activeToolSlug)
                                  : "创作工作台"}
                        </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <AppToolbarActions />
                    </div>
                </header>
            ) : null}

            <AppConfigModal />
        </>
    );
}
