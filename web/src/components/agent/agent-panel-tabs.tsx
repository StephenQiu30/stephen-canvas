import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

import { canvasThemes } from "@/lib/canvas-theme";

export function AgentPanelTabs<T extends string>({
    value,
    items,
    theme,
    leading,
    right,
    onChange,
    children,
}: {
    children: ReactNode;
    value: T;
    items: { value: T; label: string; icon?: ReactNode; count?: number }[];
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    leading?: ReactNode;
    right?: ReactNode;
    onChange: (value: T) => void;
}) {
    return (
        <Tabs value={value} onValueChange={(value) => onChange(value as T)} className="min-h-0 flex-1 gap-0">
            <div className="@container border-b px-2" style={{ borderColor: theme.node.stroke }}>
                <div className="flex h-12 items-center gap-1">
                    {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
                    <div className="min-w-0 flex-1">
                        <TabsList variant="line" className="w-full" aria-label="Agent 内容">
                            {items.map((item) => (
                                <Tooltip key={item.value}>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value={item.value} aria-label={`${item.label}${item.count ? ` ${item.count}` : ""}`}>
                                            {item.icon ? <span className="agent-panel-tab-icon">{item.icon}</span> : null}
                                            <span className={item.icon ? "hidden @min-[400px]:inline" : undefined}>{item.label}</span>
                                            {item.count ? <span className="text-[10px] font-normal leading-none tabular-nums opacity-60">{item.count > 99 ? "99+" : item.count}</span> : null}
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">{`${item.label}${item.count ? ` ${item.count}` : ""}`}</TooltipContent>
                                </Tooltip>
                            ))}
                        </TabsList>
                    </div>
                    {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
                </div>
            </div>
            <TabsContent value={value} aria-label="Agent 内容" className="flex min-h-0 flex-1 flex-col">
                {children}
            </TabsContent>
        </Tabs>
    );
}
