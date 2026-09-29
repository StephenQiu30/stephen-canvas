"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppFeedbackProvider } from "@/components/ui/app-feedback-provider";
import { ClientRootInit } from "@/components/layout/client-root-init";
import { useThemeStore } from "@/stores/use-theme-store";

export function AppProviders({ children }: { children: ReactNode }) {
    const theme = useThemeStore((state) => state.theme);
    const dark = theme === "dark";
    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
        document.documentElement.style.colorScheme = theme;
    }, [dark, theme]);

    useEffect(() => {
        document.documentElement.lang = "zh-CN";
        document.title = "Stephen Canvas";
        document.querySelector('meta[name="description"]')?.setAttribute("content", "一个无限画布创作工具");
        dayjs.locale("zh-cn");
    }, []);

    return (
        <TooltipProvider>
            <AppFeedbackProvider>
                <ClientRootInit>{children}</ClientRootInit>
            </AppFeedbackProvider>
        </TooltipProvider>
    );
}
