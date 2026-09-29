"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";

export function MobileNavSheet({ activeToolSlug }: { activeToolSlug?: NavigationToolSlug }) {
    const { t } = useTranslation();

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-3 md:hidden" aria-label={t("topNav.openMenu")}>
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="data-[side=left]:w-[280px]" aria-describedby={undefined}>
                <SheetHeader>
                    <SheetTitle>{t("topNav.navigation")}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label={t("topNav.navigation")}>
                    {navigationTools.map((tool) => {
                        const Icon = tool.icon;
                        const active = tool.slug === activeToolSlug;
                        return (
                            <SheetClose key={tool.slug} asChild>
                                <Button asChild variant={active ? "secondary" : "ghost"} size="lg" className="justify-start">
                                    <Link href={`/${tool.slug}`} aria-current={active ? "page" : undefined}>
                                        <Icon data-icon="inline-start" />
                                        {t(`navigation.${tool.slug}`)}
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
