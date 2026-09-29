import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";

export function AgentScrollToBottom({ theme, title, ariaLabel = title, className = "", onClick }: { theme: (typeof canvasThemes)[keyof typeof canvasThemes]; title: string; ariaLabel?: string; className?: string; onClick: () => void }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    aria-label={ariaLabel}
                    style={{ background: theme.toolbar.panel, border: `1px solid ${theme.node.stroke}`, color: theme.node.text }}
                    onClick={onClick}
                    type={"button"}
                    variant={"ghost"}
                    size="icon"
                    className={`!absolute bottom-6 left-1/2 z-10 !h-8 !w-8 !min-w-8 -translate-x-1/2 backdrop-blur transition hover:-translate-y-0.5 ${className}`}
                >
                    {<ChevronDown data-icon="inline-start" />}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{title}</TooltipContent>
        </Tooltip>
    );
}
