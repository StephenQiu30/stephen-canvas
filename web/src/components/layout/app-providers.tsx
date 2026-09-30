"use client";

import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { AppFeedbackProvider } from "@/components/ui/app-feedback-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemeStore } from "@/stores/use-theme-store";

export function AppProviders({ children }: { children: ReactNode }) {
    const theme = useThemeStore((state) => state.theme);
    const dark = theme === "dark";
    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
        document.documentElement.style.colorScheme = theme;
    }, [dark, theme]);

    useEffect(() => {
        dayjs.locale("zh-cn");
    }, []);

    return (
        <MotionConfig reducedMotion="user">
            <TooltipProvider>
                <AppFeedbackProvider>{children}</AppFeedbackProvider>
            </TooltipProvider>
        </MotionConfig>
    );
}
