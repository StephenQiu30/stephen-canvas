import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useId } from "react";

import { audioFormatOptions, audioSpeedLabel, audioVoiceOptions, normalizeAudioFormatValue, normalizeAudioSpeedValue, normalizeAudioVoiceValue } from "@/lib/audio-generation";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { AiConfig } from "@/stores/use-config-store";

const speedOptions = ["0.75", "1", "1.25", "1.5"];

type AudioSettingKey = "audioVoice" | "audioFormat" | "audioSpeed" | "audioInstructions";

type AudioSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: AudioSettingKey, value: string) => void;
    showTitle?: boolean;
    className?: string;
};

export function AudioSettingsPanel({ config, onConfigChange, showTitle = true, className = "w-[320px] flex flex-col gap-4 rounded-2xl px-1 py-0.5" }: AudioSettingsPanelProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const id = useId();
    const voice = normalizeAudioVoiceValue(config.audioVoice);
    const format = normalizeAudioFormatValue(config.audioFormat);
    const speed = normalizeAudioSpeedValue(config.audioSpeed);

    return (
        <FieldGroup className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
            {showTitle ? <div className="text-lg font-semibold">{"音频设置"}</div> : null}
            <Field>
                <FieldLabel id={`${id}-voice`}>声音</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(voice)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("audioVoice", value);
                    }}
                    className="grid grid-cols-3 gap-2.5 w-full"
                    aria-labelledby={`${id}-voice`}
                >
                    {audioVoiceOptions.map((item) => (
                        <ToggleGroupItem key={item.value} value={String(item.value)} className="min-w-0">
                            {item.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
            <Field>
                <FieldLabel id={`${id}-format`}>格式</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(format)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("audioFormat", value);
                    }}
                    className="grid grid-cols-3 gap-2.5 w-full"
                    aria-labelledby={`${id}-format`}
                >
                    {audioFormatOptions.map((item) => (
                        <ToggleGroupItem key={item.value} value={String(item.value)} className="min-w-0">
                            {item.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
            <Field>
                <FieldLabel id={`${id}-speed`}>语速</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(speed)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("audioSpeed", value);
                    }}
                    className="grid grid-cols-4 gap-2.5 w-full"
                    aria-labelledby={`${id}-speed`}
                >
                    {speedOptions.map((value) => (
                        <ToggleGroupItem key={value} value={String(value)} className="min-w-0">
                            {audioSpeedLabel(value)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <Input
                    type="number"
                    min={0.25}
                    max={4}
                    step={0.05}
                    aria-label="自定义语速"
                    value={config.audioSpeed || "1"}
                    onChange={(event) => onConfigChange("audioSpeed", event.target.value)}
                    onBlur={(event) => onConfigChange("audioSpeed", normalizeAudioSpeedValue(event.target.value))}
                    onMouseDown={(event) => event.stopPropagation()}
                />
            </Field>
            <Field>
                <FieldLabel htmlFor={`${id}-instructions`}>声音指令</FieldLabel>
                <Textarea
                    id={`${id}-instructions`}
                    value={config.audioInstructions || ""}
                    placeholder={"例如：自然、温暖、适合旁白。"}
                    className="thin-scrollbar h-20 resize-none"
                    onChange={(event) => onConfigChange("audioInstructions", event.target.value)}
                    onMouseDown={(event) => event.stopPropagation()}
                />
            </Field>
        </FieldGroup>
    );
}
