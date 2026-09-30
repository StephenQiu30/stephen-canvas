"use client";

import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { FolderOpen, Home, ImagePlus, Images, Plus, Video } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const groups = [
    {
        label: "工作空间",
        pages: [
            { href: "/", label: "首页", icon: Home },
            { href: "/canvas", label: "项目", icon: FolderOpen },
            { href: "/assets", label: "我的素材", icon: Images },
        ],
    },
    {
        label: "创作工具",
        pages: [
            { href: "/image", label: "图片生成", icon: ImagePlus },
            { href: "/video", label: "视频生成", icon: Video },
        ],
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { setOpenMobile, state, isMobile } = useSidebar();
    const [createTooltipOpen, setCreateTooltipOpen] = useState(false);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const navigate = () => setOpenMobile(false);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="gap-5 px-4 pb-3 pt-5 group-data-[collapsible=icon]:px-2">
                <Link
                    href="/"
                    onClick={navigate}
                    aria-label="Stephen Canvas 首页"
                    className="flex h-10 min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center"
                >
                    <span aria-hidden="true" className="size-7 shrink-0 bg-current" style={{ mask: "url(/logo.svg) center / contain no-repeat", WebkitMask: "url(/logo.svg) center / contain no-repeat" }} />
                    <span className="truncate text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">Stephen Canvas</span>
                </Link>
                <Tooltip open={createTooltipOpen && state === "collapsed" && !isMobile} onOpenChange={setCreateTooltipOpen}>
                    <TooltipTrigger asChild>
                        <Button
                            className="h-10 w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
                            disabled={!hydrated}
                            aria-label="新建项目"
                            onClick={() => {
                                navigate();
                                router.push("/canvas?mode=new");
                            }}
                        >
                            <Plus data-icon="inline-start" aria-hidden />
                            <span className="group-data-[collapsible=icon]:hidden">新建项目</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">新建项目</TooltipContent>
                </Tooltip>
            </SidebarHeader>
            <SidebarContent>
                <nav aria-label="主导航">
                    {groups.map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarMenu>
                                {group.pages.map(({ href, label, icon: Icon }) => (
                                    <SidebarMenuItem key={href}>
                                        <SidebarMenuButton asChild className="h-10" tooltip={label} isActive={pathname === href}>
                                            <Link href={href} onClick={navigate} aria-current={pathname === href ? "page" : undefined}>
                                                <Icon />
                                                <span>{label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    ))}
                </nav>
            </SidebarContent>
            <SidebarFooter className="gap-3 px-2 pb-4">
                <SidebarSeparator className="mx-0" />
                <p className="px-2 text-xs leading-5 text-muted-foreground group-data-[collapsible=icon]:hidden">项目与素材保存在当前浏览器。</p>
            </SidebarFooter>
        </Sidebar>
    );
}
