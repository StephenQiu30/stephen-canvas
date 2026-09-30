import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RotateCcw, WandSparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";

export type CanvasImageAngleParams = {
    horizontalAngle: number;
    pitchAngle: number;
    cameraDistance: number;
    wideAngle: boolean;
};

const defaultParams: CanvasImageAngleParams = {
    horizontalAngle: 0,
    pitchAngle: 9,
    cameraDistance: 4.8,
    wideAngle: false,
};

export function CanvasNodeAngleDialog({ dataUrl, open, onClose, onConfirm }: { dataUrl: string; open: boolean; onClose: () => void; onConfirm: (params: CanvasImageAngleParams) => void }) {
    const id = useId();
    const [params, setParams] = useState(defaultParams);

    useEffect(() => {
        if (open) setParams(defaultParams);
    }, [dataUrl, open]);

    const update = <Key extends keyof CanvasImageAngleParams>(key: Key, value: CanvasImageAngleParams[Key]) => setParams((current) => ({ ...current, [key]: value }));

    return (
        <Dialog
            open={open && Boolean(dataUrl)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 860, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle className="sr-only">调整视角</DialogTitle>
                </DialogHeader>
                <div>
                    <div className="flex flex-col gap-5">
                        <div>
                            <h2 className="text-xl font-semibold">{"AI 多角度"}</h2>
                            <p className="mt-1 text-sm opacity-60">{"左侧只预览方向，结果会基于原图重新生成"}</p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-[minmax(260px,1fr)_360px]">
                            <div className="flex min-h-[300px] flex-col justify-between rounded-xl border p-4">
                                <div className="grid flex-1 place-items-center">
                                    <div className="relative">
                                        <img src={dataUrl} alt="" className="size-48 rounded-2xl object-cover shadow-2xl" draggable={false} style={{ transform: previewTransform(params) }} />
                                        <div className="absolute -bottom-6 left-1/2 h-10 w-24 -translate-x-1/2 rounded-full border bg-black/20 backdrop-blur" />
                                    </div>
                                </div>
                                <Button onClick={() => setParams(defaultParams)} type={"button"} variant={"secondary"} size="default" className={"w-fit"}>
                                    {<RotateCcw data-icon="inline-start" aria-hidden />}
                                    {"重置"}
                                </Button>
                            </div>
                            <FieldGroup className="gap-6 py-2">
                                <AngleSlider label={"左右角度"} value={params.horizontalAngle} min={-60} max={60} step={1} suffix="deg" onChange={(value) => update("horizontalAngle", value)} />
                                <AngleSlider label={"俯仰角度"} value={params.pitchAngle} min={-45} max={45} step={1} suffix="deg" onChange={(value) => update("pitchAngle", value)} />
                                <AngleSlider label={"镜头距离"} value={params.cameraDistance} min={1} max={10} step={0.1} onChange={(value) => update("cameraDistance", value)} />
                                <Field orientation="horizontal" className="grid grid-cols-[88px_1fr_72px] items-center gap-4">
                                    <FieldLabel id={`${id}-wide`}>广角镜头</FieldLabel>
                                    <ToggleGroup
                                        aria-labelledby={`${id}-wide`}
                                        type="single"
                                        variant="outline"
                                        className={"w-fit"}
                                        value={String(params.wideAngle ? "wide" : "standard")}
                                        onValueChange={(value) => {
                                            if (value) ((value) => update("wideAngle", value === "wide"))(value);
                                        }}
                                    >
                                        {[
                                            { label: "标准", value: "standard" },
                                            { label: "广角", value: "wide" },
                                        ].map((item) => {
                                            const option = typeof item === "object" ? item : { value: item, label: item };
                                            return (
                                                <ToggleGroupItem key={String(option.value)} value={String(option.value)}>
                                                    {option.label}
                                                </ToggleGroupItem>
                                            );
                                        })}
                                    </ToggleGroup>
                                </Field>
                            </FieldGroup>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => onConfirm(params)} type={"button"} variant={"default"} size="lg">
                                {<WandSparkles data-icon="inline-start" aria-hidden />}
                                {"AI 生成"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function AngleSlider({ label, value, min, max, step, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
    const id = useId();
    return (
        <Field orientation="horizontal" className="grid grid-cols-[88px_1fr_72px] items-center gap-4">
            <FieldLabel id={id}>{label}</FieldLabel>
            <Slider aria-labelledby={id} min={min} max={max} step={step} value={[value]} onValueChange={([value]) => onChange(value)} />
            <span className="whitespace-nowrap text-right font-semibold">
                {Number.isInteger(value) ? value : value.toFixed(1)}
                {suffix}
            </span>
        </Field>
    );
}

function previewTransform(params: CanvasImageAngleParams) {
    const scale = 1.08 - params.cameraDistance * 0.035 + (params.wideAngle ? -0.08 : 0);
    return `perspective(520px) rotateY(${params.horizontalAngle * -0.45}deg) rotateX(${params.pitchAngle * 0.35}deg) scale(${Math.max(0.72, Math.min(1.08, scale))})`;
}
