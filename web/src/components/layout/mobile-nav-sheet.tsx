"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";

export function MobileNavSheet({ activeToolSlug }: { activeToolSlug?: NavigationToolSlug }) {

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-3 md:hidden" aria-label={"打开导航菜单"}>
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="data-[side=left]:w-[280px]" aria-describedby={undefined}>
                <SheetHeader>
                    <SheetTitle>{"导航"}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label={"导航"}>
                    {navigationTools.map((tool) => {
                        const Icon = tool.icon;
                        const active = tool.slug === activeToolSlug;
                        return (
                            <SheetClose key={tool.slug} asChild>
                                <Button asChild variant={active ? "secondary" : "ghost"} size="lg" className="justify-start">
                                    <Link href={`/${tool.slug}`} aria-current={active ? "page" : undefined}>
                                        <Icon data-icon="inline-start" />
                                        {(({ "canvas":"我的画布", "image":"生图工作台", "video":"视频创作台", "assets":"我的资产", "config":"配置" } as Record<string, string>)[String(tool.slug)] || String(tool.slug))}
                                    </Link>
                                </Button>
                            </SheetClose>
                        );
                    })}
                </nav>
            </SheetContent>
        </Sheet>
    );
}
