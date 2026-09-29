"use client";

import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { navigationTools } from "@/constant/navigation-tools";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useAgentStore } from "@/stores/use-agent-store";
import { FolderOpen, Home, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const hydrated = useCanvasStore((state) => state.hydrated);
    const togglePanel = useAgentStore((state) => state.togglePanel);
    const panelOpen = useAgentStore((state) => state.panelOpen);
    const navigate = () => setOpenMobile(false);
    const pages = [
        { href: "/", label: "首页", icon: Home },
        ...navigationTools.map(({ slug, icon }) => ({ href: `/${slug}`, label: { canvas: "项目", image: "生图工作台", video: "视频创作台", assets: "我的资产", config: "配置" }[slug], icon: slug === "canvas" ? FolderOpen : icon })),
    ];
    return (
        <Sidebar>
            <SidebarHeader className="gap-6 px-4 py-5">
                <Link href="/" onClick={navigate} className="flex h-10 items-center gap-2.5 text-lg font-semibold tracking-tight">
                    <span className="size-7 shrink-0 bg-current" style={{ mask: "url(/logo.svg) center / contain no-repeat", WebkitMask: "url(/logo.svg) center / contain no-repeat" }} />
                    Stephen Canvas
                </Link>
                <Button
                    disabled={!hydrated}
                    onClick={() => {
                        navigate();
                        router.push("/canvas?mode=new");
                    }}
                >
                    <Plus data-icon="inline-start" />
                    新建项目
                </Button>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                isActive={panelOpen}
                                onClick={() => {
                                    togglePanel();
                                    navigate();
                                }}
                            >
                                <Sparkles />
                                <span>Canvas Agent</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
                <SidebarGroup>
                    <nav aria-label="主导航">
                        <SidebarMenu>
                            {pages.map(({ href, label, icon: Icon }) => (
                                <SidebarMenuItem key={href}>
                                    <SidebarMenuButton asChild isActive={pathname === href}>
                                        <Link href={href} onClick={navigate} aria-current={pathname === href ? "page" : undefined}>
                                            <Icon />
                                            <span>{label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </nav>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="gap-4 px-4 py-5">
                <p className="text-xs leading-6 text-muted-foreground">
                    从一个想法开始，
                    <br />
                    让创作在画布上发生。
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
