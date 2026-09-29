import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImagePlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MAX_UPSCALE_LONG_EDGE, resolveUpscaleSize, type ImageUpscaleAlgorithm, type ImageUpscaleParams } from "@/lib/canvas/canvas-image-data";
import { readImageMeta } from "@/lib/image-utils";

export type CanvasImageUpscaleParams = ImageUpscaleParams;

const algorithms: ImageUpscaleAlgorithm[] = ["high", "bilinear", "nearest"];
const algorithmLabels = { high: ["高清插值", "适合照片和细节图"], bilinear: ["双线性", "平滑、速度快"], nearest: ["最近邻", "适合像素风格"] };

const targetOptions = [
    { label: "1K", value: 1024 },
    { label: "2K", value: 2048 },
    { label: "4K", value: MAX_UPSCALE_LONG_EDGE },
];

const defaultParams: CanvasImageUpscaleParams = {
    targetLongEdge: 2048,
    algorithm: "high",
};

export function CanvasNodeUpscaleDialog({ dataUrl, open, onClose, onConfirm }: { dataUrl: string; open: boolean; onClose: () => void; onConfirm: (params: CanvasImageUpscaleParams) => void }) {
    const [params, setParams] = useState<CanvasImageUpscaleParams>(defaultParams);
    const [image, setImage] = useState<{ width: number; height: number } | null>(null);
    const sourceLongEdge = image ? Math.max(image.width, image.height) : 0;
    const outputSize = useMemo(() => (image ? resolveUpscaleSize(image.width, image.height, params.targetLongEdge) : null), [image, params.targetLongEdge]);
    const canUpscale = Boolean(image && sourceLongEdge < params.targetLongEdge && params.targetLongEdge <= MAX_UPSCALE_LONG_EDGE);
    const reachedMax = Boolean(image && sourceLongEdge >= MAX_UPSCALE_LONG_EDGE);

    useEffect(() => {
        if (!open) return;
        setParams(defaultParams);
        setImage(null);
    }, [dataUrl, open]);

    useEffect(() => {
        if (!open) return;
        void readImageMeta(dataUrl).then(setImage);
    }, [dataUrl, open]);

    useEffect(() => {
        if (!image) return;
        const nextTarget = targetOptions.find((option) => sourceLongEdge < option.value)?.value || MAX_UPSCALE_LONG_EDGE;
        setParams((current) => ({ ...current, targetLongEdge: nextTarget }));
    }, [image, sourceLongEdge]);

    return (
        <Dialog
            open={open && Boolean(dataUrl)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 820, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle className="sr-only">图片放大</DialogTitle>
                </DialogHeader>
                <div>
                    <div className="flex flex-col gap-5">
                        <div>
                            <h2 className="text-xl font-semibold">{"图片放大"}</h2>
                        </div>
                        <div className="grid gap-6 md:grid-cols-[minmax(260px,1fr)_360px]">
                            <div className="rounded-xl border p-4">
                                <div className="grid min-h-[280px] place-items-center rounded-lg bg-black/5">
                                    <img src={dataUrl} alt="" className="max-h-[320px] max-w-full rounded-lg object-contain shadow-xl" draggable={false} />
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <span className="opacity-60">{"源图"}</span>
                                    <span className="font-semibold">{image ? `${image.width} x ${image.height} px` : "读取中"}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6 py-2">
                                <div className="flex flex-col gap-2">
                                    <div className="font-medium opacity-75">{"目标像素"}</div>
                                    <ToggleGroup
                                        type="single"
                                        variant="outline"
                                        value={String(params.targetLongEdge)}
                                        onValueChange={(value) => {
                                            if (value) ((value) => setParams((current) => ({ ...current, targetLongEdge: Number(value) })))(value);
                                        }}
                                    >
                                        {targetOptions
                                            .map((option) => ({ label: `${option.label} · ${option.value}px`, value: option.value, disabled: Boolean(image && sourceLongEdge >= option.value) }))
                                            .map((item) => {
                                                const option = typeof item === "object" ? item : { value: item, label: item };
                                                return (
                                                    <ToggleGroupItem key={String(option.value)} value={String(option.value)} disabled={"disabled" in option ? Boolean(option.disabled) : false}>
                                                        {option.label}
                                                    </ToggleGroupItem>
                                                );
                                            })}
                                    </ToggleGroup>
                                    {image && !canUpscale ? <div className="text-xs font-medium text-[#ef4444]">{reachedMax ? "图片已达到 4K，无需放大" : "图片已达到当前目标像素，无需放大"}</div> : null}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="font-medium opacity-75">{"放大算法"}</div>
                                    <ToggleGroup
                                        type="single"
                                        variant="outline"
                                        value={String(params.algorithm)}
                                        onValueChange={(value) => {
                                            if (value) ((value) => setParams((current) => ({ ...current, algorithm: value as ImageUpscaleAlgorithm })))(value);
                                        }}
                                    >
                                        {algorithms
                                            .map((algorithm) => ({
                                                value: algorithm,
                                                label: (
                                                    <span className="flex min-h-12 flex-col justify-center text-left leading-5">
                                                        <span className="font-medium">{algorithmLabels[algorithm][0]}</span>
                                                        <span className="text-xs opacity-55">{algorithmLabels[algorithm][1]}</span>
                                                    </span>
                                                ),
                                            }))
                                            .map((item) => {
                                                const option = typeof item === "object" ? item : { value: item, label: item };
                                                return (
                                                    <ToggleGroupItem key={String(option.value)} value={String(option.value)}>
                                                        {option.label}
                                                    </ToggleGroupItem>
                                                );
                                            })}
                                    </ToggleGroup>
                                </div>
                                <div className="rounded-xl border px-4 py-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="opacity-60">{"输出尺寸"}</span>
                                        <span className="font-semibold">{outputSize ? `${outputSize.width} x ${outputSize.height} px` : "未知"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => onConfirm(params)} type={"button"} variant={"default"} size="lg" disabled={!canUpscale}>
                                {<ImagePlus data-icon="inline-start" />}
                                {"生成放大图"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
