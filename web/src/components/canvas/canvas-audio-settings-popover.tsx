import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";

import { AudioSettingsPanel } from "@/components/audio-settings-panel";
import { audioFormatLabel, audioSpeedLabel, audioVoiceLabel } from "@/lib/audio-generation";
import type { AiConfig } from "@/stores/use-config-store";

export type CanvasAudioSettingKey = "audioVoice" | "audioFormat" | "audioSpeed" | "audioInstructions";

type CanvasAudioSettingsPopoverProps = {
    config: AiConfig;
    onConfigChange: (key: CanvasAudioSettingKey, value: string) => void;
    buttonClassName?: string;
} & Pick<ComponentProps<typeof PopoverContent>, "side" | "align">;

export function CanvasAudioSettingsPopover({ config, onConfigChange, buttonClassName, side = "top", align = "start" }: CanvasAudioSettingsPopoverProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type={"button"} variant={"ghost"} size="sm" className={buttonClassName || "max-w-[170px] justify-start"}>
                    {<Settings2 data-icon="inline-start" aria-hidden />}
                    <span className="truncate">
                        {audioVoiceLabel(config.audioVoice)} · {audioFormatLabel(config.audioFormat)} · {audioSpeedLabel(config.audioSpeed)}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent side={side} align={align} className="w-[356px] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto" onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                <AudioSettingsPanel config={config} onConfigChange={(key, value) => onConfigChange(key, value)} className="flex flex-col gap-4" />
            </PopoverContent>
        </Popover>
    );
}
