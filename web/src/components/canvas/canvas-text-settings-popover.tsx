import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";

import { reasoningEffortLabel, TextSettingsPanel } from "@/components/text-settings-panel";
import type { AiConfig, ReasoningEffort } from "@/stores/use-config-store";

type CanvasTextSettingsPopoverProps = {
    config: AiConfig;
    onConfigChange: (key: "reasoningEffort", value: ReasoningEffort) => void;
    count?: number;
    onCountChange?: (count: number) => void;
    buttonClassName?: string;
} & Pick<ComponentProps<typeof PopoverContent>, "side" | "align">;

export function CanvasTextSettingsPopover({ config, onConfigChange, count, onCountChange, buttonClassName, side = "top", align = "start" }: CanvasTextSettingsPopoverProps) {
    const countId = useId();
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type={"button"} variant={"ghost"} size="sm" className={buttonClassName || "max-w-[170px] justify-start"}>
                    {<Settings2 data-icon="inline-start" aria-hidden />}
                    <span className="truncate">
                        {"推理"} · {reasoningEffortLabel(config.reasoningEffort)}
                        {onCountChange ? ` · ${`${count} 次`}` : ""}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent side={side} align={align} className="w-[356px] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto" onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                <TextSettingsPanel config={config} onConfigChange={onConfigChange} />
                {onCountChange ? (
                    <Field className="mt-4">
                        <FieldLabel htmlFor={countId}>生成次数</FieldLabel>
                        <Input id={countId} className="w-full" min={1} max={15} type="number" value={count ?? ""} onChange={(event) => ((value) => onCountChange(value || 1))(event.target.value === "" ? null : Number(event.target.value))} />
                    </Field>
                ) : null}
            </PopoverContent>
        </Popover>
    );
}
