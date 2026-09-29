export type CanvasColorTheme = "light" | "dark";
export type CanvasBackgroundMode = "dots" | "lines" | "blank";

export const canvasThemes = {
    light: {
        canvas: {
            background: "#fafafa",
            dot: "rgba(23,23,23,.16)",
            line: "rgba(23,23,23,.1)",
            selectionStroke: "#171717",
            selectionFill: "rgba(23,23,23,.06)",
        },
        node: {
            label: "#4d4d4d",
            fill: "#f5f5f5",
            panel: "#ffffff",
            stroke: "#ebebeb",
            activeStroke: "#171717",
            placeholder: "#888888",
            text: "#171717",
            muted: "#737373",
            faint: "#a3a3a3",
        },
        toolbar: {
            panel: "rgba(255,255,255,.96)",
            border: "#ebebeb",
            item: "#4d4d4d",
            itemHover: "rgba(23,23,23,.05)",
            activeBg: "#f5f5f5",
            activeText: "#171717",
        },
    },
    dark: {
        canvas: {
            background: "#171717",
            dot: "rgba(250,250,250,.18)",
            line: "rgba(250,250,250,.08)",
            selectionStroke: "#fafafa",
            selectionFill: "rgba(250,250,250,.10)",
        },
        node: {
            label: "#d4d4d4",
            fill: "#262626",
            panel: "#1f1f1f",
            stroke: "#333333",
            activeStroke: "#fafafa",
            placeholder: "#a3a3a3",
            text: "#fafafa",
            muted: "#a3a3a3",
            faint: "#737373",
        },
        toolbar: {
            panel: "rgba(31,31,31,.96)",
            border: "#333333",
            item: "#d4d4d4",
            itemHover: "rgba(250,250,250,.08)",
            activeBg: "#262626",
            activeText: "#fafafa",
        },
    },
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
