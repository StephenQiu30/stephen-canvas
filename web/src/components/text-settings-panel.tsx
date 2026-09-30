import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useId } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { AiConfig, ReasoningEffort } from "@/stores/use-config-store";

const reasoningEffortOptions: ReasoningEffort[] = ["auto", "low", "medium", "high", "xhigh"];

type TextSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: "reasoningEffort", value: ReasoningEffort) => void;
    className?: string;
};

export function TextSettingsPanel({ config, onConfigChange, className = "flex flex-col gap-4" }: TextSettingsPanelProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const labelId = useId();
    return (
        <FieldGroup className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="text-lg font-semibold">{"文本设置"}</div>
            <Field>
                <FieldLabel id={labelId}>{"推理强度"}</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(config.reasoningEffort)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("reasoningEffort", value as ReasoningEffort);
                    }}
                    className="grid grid-cols-5 gap-2 w-full"
                    aria-labelledby={labelId}
                >
                    {reasoningEffortOptions.map((value) => (
                        <ToggleGroupItem key={value} value={String(value)} className="min-w-0">
                            {({ auto: "自动", low: "低", medium: "中", high: "高", xhigh: "极高" } as Record<string, string>)[String(value)] || String(value)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
        </FieldGroup>
    );
}

export function reasoningEffortLabel(value: ReasoningEffort) {
    return reasoningEffortOptions.includes(value) ? ({ auto: "自动", low: "低", medium: "中", high: "高", xhigh: "极高" } as Record<string, string>)[String(value)] || String(value) : value;
}
