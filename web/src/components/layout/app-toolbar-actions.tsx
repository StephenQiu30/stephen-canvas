"use client";

import { Button } from "@/components/ui/button";
import { Keyboard, Moon, Puzzle, Settings2, Sun } from "lucide-react";
import type { CSSProperties } from "react";

import { GitHubLink } from "@/components/layout/github-link";
import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { canvasThemes } from "@/lib/canvas-theme";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";

type AppToolbarActionsProps = {
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
    onOpenPlugins?: () => void;
};

export function AppToolbarActions({ variant = "default", onOpenShortcuts, onOpenPlugins }: AppToolbarActionsProps) {
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const canvasTheme = canvasThemes[theme];
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? { color: canvasTheme.node.text } : undefined;

    return (
        <div className="inline-flex shrink-0 items-center gap-1">
            {onOpenPlugins ? (
                <Button type="button" variant="ghost" size="icon-sm" style={iconStyle} onClick={onOpenPlugins} aria-label={"节点插件"} title={"节点插件"}>
                    <Puzzle />
                </Button>
            ) : null}
            {variant === "canvas" ? (
                <Button type="button" variant="ghost" size="icon-sm" style={iconStyle} onClick={() => openConfigDialog(false)} aria-label={"配置"} title={"配置"}>
                    <Settings2 />
                </Button>
            ) : null}
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="transition-none active:translate-y-0"
                style={iconStyle}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
                title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            >
                {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            {variant === "canvas" ? <VersionReleaseModal style={iconStyle} /> : null}
            <GitHubLink style={iconStyle} />
            {onOpenShortcuts ? (
                <Button type="button" variant="ghost" size="icon-sm" style={iconStyle} onClick={onOpenShortcuts} aria-label={"快捷键"} title={"快捷键"}>
                    <Keyboard />
                </Button>
            ) : null}
        </div>
    );
}
