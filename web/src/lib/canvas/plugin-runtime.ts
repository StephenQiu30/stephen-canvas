import React from "react";

import { APP_VERSION } from "@/constant/env";
import { emitCanvasEvent, onCanvasEvent } from "@/lib/canvas/canvas-event-bus";
import { canvasPluginIcons } from "@/lib/canvas/plugin-icons";
import type { CanvasPluginApp } from "@/types/canvas-plugin";

// Remote plugins obtain the host React instance through this runtime to avoid multiple React copies.
export type PluginRuntime = CanvasPluginApp & {
    React: typeof React;
    jsx: typeof React.createElement;
    Fragment: typeof React.Fragment;
    icons: typeof canvasPluginIcons;
    injectCSS: (css: string, key?: string) => () => void;
};

let runtime: PluginRuntime | null = null;

// Inject plugin styles, replacing the previous style with the same key, and return a removal function.
function injectCSS(css: string, key?: string) {
    const id = key ? `canvas-plugin-style-${key}` : undefined;
    if (id) document.getElementById(id)?.remove();
    const style = document.createElement("style");
    if (id) style.id = id;
    style.dataset.canvasPluginStyle = "true";
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
}

export function getPluginRuntime(): PluginRuntime {
    if (!runtime) {
        runtime = {
            React,
            jsx: React.createElement,
            Fragment: React.Fragment,
            icons: canvasPluginIcons,
            injectCSS,
            version: APP_VERSION,
            emit: emitCanvasEvent,
            on: onCanvasEvent,
        };
        (window as unknown as { StephenCanvasRuntime?: PluginRuntime }).StephenCanvasRuntime = runtime;
    }
    return runtime;
}
