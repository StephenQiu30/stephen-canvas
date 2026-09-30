import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import { useState } from "react";

import { ImageSettingsPanel, imageQualityLabel, imageSizeLabel } from "@/components/image-settings-panel";
import type { AiConfig } from "@/stores/use-config-store";

type CanvasImageSettingsPopoverProps = {
    config: AiConfig;
    onConfigChange: (key: keyof AiConfig, value: string) => void;
    onOpenChange?: (open: boolean) => void;
    buttonClassName?: string;
} & Pick<ComponentProps<typeof PopoverContent>, "side" | "align">;

export function CanvasImageSettingsPopover({ config, onConfigChange, onOpenChange, buttonClassName, side = "top", align = "start" }: CanvasImageSettingsPopoverProps) {
    const [open, setOpen] = useState(false);
    const quality = config.quality || "auto";
    const count = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(config.count)) || 1)));
    const activeSize = config.size || "auto";
    return (
        <Popover
            open={open}
            onOpenChange={(open) => {
                setOpen(open);
                onOpenChange?.(open);
            }}
        >
            <PopoverTrigger asChild>
                <Button type={"button"} variant={"ghost"} size="sm" className={buttonClassName || "max-w-[180px] justify-start"}>
                    {<Settings2 data-icon="inline-start" aria-hidden />}
                    <span className="truncate">
                        {imageQualityLabel(quality)} · {imageSizeLabel(activeSize)} · {`${count} 张`}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent side={side} align={align} className="w-[356px] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto" onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                <ImageSettingsPanel config={config} onConfigChange={(key, value) => onConfigChange(key, value)} className="flex flex-col gap-4" />
            </PopoverContent>
        </Popover>
    );
}
