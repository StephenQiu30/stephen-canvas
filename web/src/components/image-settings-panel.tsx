import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeftRight } from "lucide-react";
import { useId, useState } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { computeMediaSize, inferMediaRatio, inferMediaScale, mediaRatioOptions, mediaScaleOptions, readMediaDimensions } from "@/lib/media-size";
import type { AiConfig } from "@/stores/use-config-store";

const qualityOptions = [
    { value: "auto", labelKey: "auto" },
    { value: "high", labelKey: "high" },
    { value: "medium", labelKey: "medium" },
    { value: "low", labelKey: "low" },
];
const DIMENSION_STEP = 16;

export const imageQualityOptions = qualityOptions.map((item) => ({
    value: item.value,
    get label() {
        return ({ auto: "自动", low: "低", medium: "中", high: "高", xhigh: "极高" } as Record<string, string>)[String(item.labelKey)] || String(item.labelKey);
    },
}));
export const imageAspectOptions = mediaRatioOptions.map((item) => ({ value: item.value, label: item.value === "auto" ? "自动" : item.value }));
export const imageScaleOptions = mediaScaleOptions.map((value) => ({ value, label: value === "auto" ? "自动" : value }));

type ImageSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: "quality" | "size" | "count" | "background", value: string) => void;
    showTitle?: boolean;
    className?: string;
    maxCount?: number;
    quickCount?: number;
};

export function ImageSettingsPanel({ config, onConfigChange, showTitle = true, className = "w-[320px] flex flex-col gap-4 rounded-2xl px-1 py-0.5", maxCount = 15, quickCount = 10 }: ImageSettingsPanelProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const id = useId();
    const [snapDimensionToStep, setSnapDimensionToStep] = useState(true);
    const quality = config.quality || "auto";
    const count = Math.max(1, Math.min(maxCount, Math.floor(Math.abs(Number(config.count)) || 1)));
    const activeSize = config.size || "auto";
    const transparentBackground = config.background === "transparent";
    const selectedScale = inferMediaScale(activeSize);
    const selectedRatio = inferMediaRatio(activeSize);
    const dimensions = readMediaDimensions(activeSize, selectedScale, selectedRatio);
    const applySize = (scale: string, ratio: string) => onConfigChange("size", computeMediaSize(scale, ratio));
    const selectScale = (scale: string) => applySize(scale, selectedRatio === "auto" ? "1:1" : selectedRatio);
    const selectRatio = (ratio: string) => applySize(selectedScale, ratio);
    const updateDimension = (key: "width" | "height", value: number | null) => {
        const next = Math.max(1, Math.floor(value || dimensions[key] || 1024));
        const width = key === "width" ? next : dimensions.width;
        const height = key === "height" ? next : dimensions.height;
        onConfigChange("size", `${alignDimension(width, snapDimensionToStep)}x${alignDimension(height, snapDimensionToStep)}`);
    };

    return (
        <FieldGroup
            className={className}
            style={{ color: theme.node.text }}
            onMouseDown={(event) => {
                event.stopPropagation();
                if (event.target instanceof HTMLInputElement) return;
                if (document.activeElement instanceof HTMLInputElement && event.currentTarget.contains(document.activeElement)) document.activeElement.blur();
            }}
        >
            {showTitle ? <div className="text-lg font-semibold">{"图像设置"}</div> : null}
            <Field>
                <FieldLabel id={`${id}-quality`}>{"质量"}</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(quality)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("quality", value);
                    }}
                    className="grid grid-cols-4 gap-2.5 w-full"
                    aria-labelledby={`${id}-quality`}
                >
                    {qualityOptions.map((item) => (
                        <ToggleGroupItem key={item.value} value={String(item.value)} className="min-w-0">
                            {({ auto: "自动", low: "低", medium: "中", high: "高", xhigh: "极高" } as Record<string, string>)[String(item.labelKey)] || String(item.labelKey)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
            <FieldSet>
                <FieldLegend variant="label">{"尺寸"}</FieldLegend>
                <div className="flex justify-end">
                    <Field orientation="horizontal" className="w-auto">
                        <FieldLabel htmlFor={`${id}-align`}>{"16 倍数对齐"}</FieldLabel>
                        <span title={"输入完成后自动向上补成 16 的倍数"} onMouseDown={(event) => event.stopPropagation()}>
                            <Switch id={`${id}-align`} checked={snapDimensionToStep} onCheckedChange={setSnapDimensionToStep} />
                        </span>
                    </Field>
                </div>
                <FieldGroup className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                    <DimensionInput prefix="W" value={dimensions.width} disabled={selectedRatio === "auto"} alignToStep={snapDimensionToStep} onChange={(value) => updateDimension("width", value)} />
                    <ArrowLeftRight className="size-4 opacity-45" aria-hidden />
                    <DimensionInput prefix="H" value={dimensions.height} disabled={selectedRatio === "auto"} alignToStep={snapDimensionToStep} onChange={(value) => updateDimension("height", value)} />
                </FieldGroup>
            </FieldSet>
            <Field>
                <FieldLabel id={`${id}-scale`}>{"分辨率"}</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(selectedScale)}
                    onValueChange={(value) => {
                        if (value) selectScale(value);
                    }}
                    className="grid grid-cols-4 gap-2.5 w-full"
                    aria-labelledby={`${id}-scale`}
                >
                    {mediaScaleOptions.map((value) => (
                        <ToggleGroupItem key={value} value={String(value)} className="min-w-0">
                            {value === "auto" ? "自动" : value}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
            <Field>
                <FieldLabel id={`${id}-ratio`}>{"宽高比"}</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(selectedRatio)}
                    onValueChange={(value) => {
                        if (value) selectRatio(value);
                    }}
                    className="grid grid-cols-4 gap-2.5 w-full"
                    aria-labelledby={`${id}-ratio`}
                >
                    {mediaRatioOptions.map((item) => (
                        <ToggleGroupItem key={item.value} value={String(item.value)} className="h-18 min-w-0 flex-col gap-1.5">
                            <AspectIcon width={item.width} height={item.height} color={theme.node.text} />
                            <span>{item.value === "auto" ? "自动" : item.value}</span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
            <Field orientation="horizontal">
                <FieldContent>
                    <FieldLabel htmlFor={`${id}-background`}>{"透明背景"}</FieldLabel>
                    <FieldDescription id={`${id}-background-description`}>{"开启后生成无背景的透明图像（仅部分模型可用）"}</FieldDescription>
                </FieldContent>
                <span onMouseDown={(event) => event.stopPropagation()}>
                    <Switch id={`${id}-background`} aria-describedby={`${id}-background-description`} checked={transparentBackground} onCheckedChange={(checked) => onConfigChange("background", checked ? "transparent" : "")} />
                </span>
            </Field>
            <Field>
                <FieldLabel id={`${id}-count`}>{"生成张数"}</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={String(count)}
                    onValueChange={(value) => {
                        if (value) onConfigChange("count", value);
                    }}
                    className="grid grid-cols-4 gap-2.5 w-full"
                    aria-labelledby={`${id}-count`}
                >
                    {Array.from({ length: quickCount }, (_, index) => index + 1).map((value) => (
                        <ToggleGroupItem key={value} value={String(value)} className="min-w-0">
                            {`${value} 张`}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <CountInput value={count} max={maxCount} onChange={(value) => onConfigChange("count", String(value || 1))} />
            </Field>
        </FieldGroup>
    );
}

export function imageQualityLabel(value: string) {
    return ["auto", "high", "medium", "low"].includes(value) ? ({ auto: "自动", low: "低", medium: "中", high: "高", xhigh: "极高" } as Record<string, string>)[String(value)] || String(value) : value;
}

export function imageSizeLabel(size: string) {
    const scale = inferMediaScale(size);
    const ratio = inferMediaRatio(size);
    if (ratio === "auto" || size === "auto") return "自动";
    if (scale === "auto") return ratio;
    return `${scale} · ${ratio}`;
}

function DimensionInput({ prefix, value, disabled, alignToStep, onChange }: { prefix: string; value: number; disabled: boolean; alignToStep: boolean; onChange: (value: number | null) => void }) {
    const commit = (input: HTMLInputElement) => {
        const next = alignDimension(Math.max(1, Math.floor(Number(input.value) || value || 1024)), alignToStep);
        input.value = String(next);
        onChange(next);
    };

    return (
        <Field data-disabled={disabled}>
            <InputGroup>
                <InputGroupAddon>{prefix}</InputGroupAddon>
                <InputGroupInput
                    aria-label={prefix === "W" ? "图像宽度" : "图像高度"}
                    type="number"
                    min={1}
                    disabled={disabled}
                    defaultValue={value || ""}
                    key={`${prefix}-${value}`}
                    onBlur={(event) => commit(event.currentTarget)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                />
            </InputGroup>
        </Field>
    );
}

function CountInput({ value, max, onChange }: { value: number; max: number; onChange: (value: number | null) => void }) {
    return (
        <InputGroup>
            <InputGroupInput aria-label="自定义生成张数" type="number" min={1} max={max} value={value || ""} onChange={(event) => onChange(Number(event.target.value) || null)} onMouseDown={(event) => event.stopPropagation()} />
        </InputGroup>
    );
}

function AspectIcon({ width, height, color }: { width: number; height: number; color: string }) {
    if (!width || !height) return null;
    const ratio = width / height;
    const boxWidth = ratio >= 1 ? 24 : Math.max(10, 24 * ratio);
    const boxHeight = ratio >= 1 ? Math.max(10, 24 / ratio) : 24;
    return (
        <span className="grid h-7 w-9 place-items-center">
            <span className="border-2" style={{ width: boxWidth, height: boxHeight, borderColor: color }} />
        </span>
    );
}

function alignDimension(value: number, enabled: boolean) {
    return enabled ? Math.ceil(value / DIMENSION_STEP) * DIMENSION_STEP : value;
}
