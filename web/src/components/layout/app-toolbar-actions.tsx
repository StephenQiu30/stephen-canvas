"use client";

import type { CSSProperties } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Keyboard, Moon, Puzzle, Settings2, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GitHubLink } from "@/components/layout/github-link";
import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { changeAppLocale, type AppLocale } from "@/i18n";
import { canvasThemes } from "@/lib/canvas-theme";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";

type AppToolbarActionsProps = {
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
    onOpenPlugins?: () => void;
};

export function AppToolbarActions({ variant = "default", onOpenShortcuts, onOpenPlugins }: AppToolbarActionsProps) {
    const { i18n, t } = useTranslation();
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const canvasTheme = canvasThemes[theme];
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? { color: canvasTheme.node.text } : undefined;
    const locale = i18n.resolvedLanguage as AppLocale;
    const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
    const languageLabel = t("topNav.switchLanguage", { language: t(nextLocale === "zh-CN" ? "locale.zhCN" : "locale.enUS") });

    return (
        <div className="inline-flex shrink-0 items-center gap-1">
            {onOpenPlugins ? (
                <Button type="button" variant="ghost" size="icon-sm" style={iconStyle} onClick={onOpenPlugins} aria-label={t("topNav.plugins")} title={t("topNav.plugins")}>
                    <Puzzle />
                </Button>
            ) : null}
            {variant === "canvas" ? (
                <Button type="button" variant="ghost" size="icon-sm" style={iconStyle} onClick={() => openConfigDialog(false)} aria-label={t("navigation.config")} title={t("navigation.config")}>
                    <Settings2 />
                </Button>
            ) : null}
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-sm" style={iconStyle} onClick={() => void changeAppLocale(nextLocale)} aria-label={languageLabel}>
                        {locale === "zh-CN" ? "中" : "EN"}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{languageLabel}</TooltipContent>
            </Tooltip>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="transition-none active:translate-y-0"
                style={iconStyle}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme")}
                title={t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme")}
            >
                {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            {variant === "canvas" ? <VersionReleaseModal style={iconStyle} /> : null}
            <GitHubLink style={iconStyle} />
            {onOpenShortcuts ? (
                <Button type="button" variant="ghost" size="icon-sm" style={iconStyle} onClick={onOpenShortcuts} aria-label={t("topNav.shortcuts")} title={t("topNav.shortcuts")}>
                    <Keyboard />
                </Button>
            ) : null}
        </div>
    );
}
