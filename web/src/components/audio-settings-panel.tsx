import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { audioFormatOptions, audioSpeedLabel, audioVoiceOptions, normalizeAudioFormatValue, normalizeAudioSpeedValue, normalizeAudioVoiceValue } from "@/lib/audio-generation";
import { type CanvasTheme } from "@/lib/canvas-theme";
import type { AiConfig } from "@/stores/use-config-store";

const speedOptions = ["0.75", "1", "1.25", "1.5"];

type AudioSettingKey = "audioVoice" | "audioFormat" | "audioSpeed" | "audioInstructions";

type AudioSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: AudioSettingKey, value: string) => void;
    theme: CanvasTheme;
    showTitle?: boolean;
    className?: string;
};

export function AudioSettingsPanel({ config, onConfigChange, theme, showTitle = true, className = "w-[320px] flex flex-col gap-4 rounded-2xl px-1 py-0.5" }: AudioSettingsPanelProps) {
    const voice = normalizeAudioVoiceValue(config.audioVoice);
    const format = normalizeAudioFormatValue(config.audioFormat);
    const speed = normalizeAudioSpeedValue(config.audioSpeed);

    return (
        <FieldGroup className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
            {showTitle ? <div className="text-lg font-semibold">{"音频设置"}</div> : null}
            <Field>
                <FieldLabel>声音</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(voice)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("audioVoice", value);
                    }}
                    className="grid grid-cols-3 gap-2.5 w-full"
                    aria-label="声音"
                >
                    {audioVoiceOptions.map((item) => (
                        <ToggleGroupItem key={item.value} value={String(item.value)} className="min-w-0">
                            {item.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
            <Field>
                <FieldLabel>格式</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(format)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("audioFormat", value);
                    }}
                    className="grid grid-cols-3 gap-2.5 w-full"
                    aria-label="音频格式"
                >
                    {audioFormatOptions.map((item) => (
                        <ToggleGroupItem key={item.value} value={String(item.value)} className="min-w-0">
                            {item.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
            <Field>
                <FieldLabel>语速</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(speed)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("audioSpeed", value);
                    }}
                    className="grid grid-cols-4 gap-2.5 w-full"
                    aria-label="语速"
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
                    className="h-9 w-full rounded-full border bg-transparent px-3 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    style={{ borderColor: theme.node.stroke, color: theme.node.text, WebkitTextFillColor: theme.node.text }}
                    value={config.audioSpeed || "1"}
                    onChange={(event) => onConfigChange("audioSpeed", event.target.value)}
                    onBlur={(event) => onConfigChange("audioSpeed", normalizeAudioSpeedValue(event.target.value))}
                    onMouseDown={(event) => event.stopPropagation()}
                />
            </Field>
            <Field>
                <FieldLabel>声音指令</FieldLabel>
                <Textarea
                    value={config.audioInstructions || ""}
                    placeholder={"例如：自然、温暖、适合旁白。"}
                    className="thin-scrollbar h-20 w-full resize-none rounded-xl border bg-transparent px-3 py-2 text-sm leading-5 outline-none"
                    style={{ borderColor: theme.node.stroke, color: theme.node.text }}
                    onChange={(event) => onConfigChange("audioInstructions", event.target.value)}
                    onMouseDown={(event) => event.stopPropagation()}
                />
            </Field>
        </FieldGroup>
    );
}
