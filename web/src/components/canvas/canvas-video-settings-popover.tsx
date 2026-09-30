import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";

import { VideoSettingsPanel, videoModeLabel, videoResolutionLabel, videoSecondsLabel, videoSizeLabel } from "@/components/video-settings-panel";
import type { AiConfig } from "@/stores/use-config-store";

type CanvasVideoSettingsPopoverProps = {
    config: AiConfig;
    onConfigChange: (key: keyof AiConfig, value: string) => void;
    buttonClassName?: string;
} & Pick<ComponentProps<typeof PopoverContent>, "side" | "align">;

export function CanvasVideoSettingsPopover({ config, onConfigChange, buttonClassName, side = "top", align = "start" }: CanvasVideoSettingsPopoverProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type={"button"} variant={"ghost"} size="sm" className={buttonClassName || "max-w-[220px] justify-start"}>
                    {<Settings2 data-icon="inline-start" aria-hidden />}
                    <span className="truncate">
                        {videoResolutionLabel(config.vquality)} · {videoSizeLabel(config.size)} · {videoSecondsLabel(config.videoSeconds)} · {videoModeLabel(config.videoMode)}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent side={side} align={align} className="w-[356px] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto" onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                <VideoSettingsPanel config={config} onConfigChange={(key, value) => onConfigChange(key, value)} className="flex flex-col gap-4" />
            </PopoverContent>
        </Popover>
    );
}
