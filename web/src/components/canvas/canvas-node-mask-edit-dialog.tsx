import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brush, Eraser, ImagePlus, Redo2, RotateCcw, Undo2, WandSparkles, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import { useImageEditorViewport } from "@/components/canvas/use-image-editor-viewport";
import { readImageMeta } from "@/lib/image-utils";

export type CanvasImageMaskEditPayload = {
    prompt: string;
    maskDataUrl: string;
    generate: boolean;
};

type DrawMode = "paint" | "erase";
type Point = { x: number; y: number };
type MaskStroke = { mode: DrawMode; size: number; points: Point[] };
type BrushPreview = { x: number; y: number; size: number; adjusting: boolean };

const defaultBrushSize = 100;
const maskOverlayColor = "#2563eb";
const maskOverlayAlpha = 0.4;

export function CanvasNodeMaskEditDialog({ dataUrl, open, onClose, onConfirm }: { dataUrl: string; open: boolean; onClose: () => void; onConfirm: (payload: CanvasImageMaskEditPayload) => void }) {
    const id = useId();
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const drawingRef = useRef<{ active: boolean; stroke: MaskStroke | null }>({ active: false, stroke: null });
    const brushAdjustRef = useRef<{ active: boolean; pointerId: number; startX: number; startSize: number; previewX: number; previewY: number } | null>(null);
    const historyRef = useRef<MaskStroke[]>([]);
    const redoRef = useRef<MaskStroke[]>([]);
    const [image, setImage] = useState<{ width: number; height: number } | null>(null);
    const [prompt, setPrompt] = useState("");
    const [brushSize, setBrushSize] = useState(defaultBrushSize);
    const [mode, setMode] = useState<DrawMode>("paint");
    const [error, setError] = useState("");
    const [historySize, setHistorySize] = useState(0);
    const [redoSize, setRedoSize] = useState(0);
    const [brushPreview, setBrushPreview] = useState<BrushPreview | null>(null);
    const viewport = useImageEditorViewport(image, open);

    useEffect(() => {
        if (!open) return;
        setPrompt("");
        setBrushSize(defaultBrushSize);
        setMode("paint");
        setError("");
        setHistorySize(0);
        setRedoSize(0);
        setBrushPreview(null);
        historyRef.current = [];
        redoRef.current = [];
        brushAdjustRef.current = null;
        drawingRef.current = { active: false, stroke: null };
        void readImageMeta(dataUrl).then(setImage);
    }, [dataUrl, open]);

    useEffect(() => {
        clearCanvas(maskCanvasRef.current);
        clearCanvas(previewCanvasRef.current);
    }, [image]);

    const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const point = readCanvasPoint(event.currentTarget, event.clientX, event.clientY);
        const maskCanvas = maskCanvasRef.current;
        const context = maskCanvas?.getContext("2d", { willReadFrequently: true });
        const previewContext = previewCanvasRef.current?.getContext("2d");
        const stroke = drawingRef.current.stroke;
        if (!maskCanvas || !context || !previewContext || !stroke) return;
        configureStrokeContext(context, stroke);
        configurePreviewStrokeContext(previewContext, stroke);
        const last = stroke.points.at(-1);
        drawMaskStroke(context, last || point, point, stroke.size);
        drawMaskStroke(previewContext, last || point, point, stroke.size);
        stroke.points.push(point);
        if (stroke.mode === "paint") {
            setError("");
        }
    };

    const updateBrushPreview = (event: ReactPointerEvent<HTMLCanvasElement>, size = brushSize, adjusting = false) => {
        setBrushPreview({
            x: event.clientX,
            y: event.clientY,
            size,
            adjusting,
        });
    };

    const startDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if ((event.button === 0 || event.button === 2) && event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            brushAdjustRef.current = {
                active: true,
                pointerId: event.pointerId,
                startX: event.clientX,
                startSize: brushSize,
                previewX: event.clientX,
                previewY: event.clientY,
            };
            updateBrushPreview(event, brushSize, true);
            return;
        }
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        updateBrushPreview(event);
        drawingRef.current = { active: true, stroke: { mode, size: brushSize, points: [] } };
        draw(event);
    };

    const moveDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const brushAdjust = brushAdjustRef.current;
        if (brushAdjust?.active && event.pointerId === brushAdjust.pointerId) {
            event.preventDefault();
            event.stopPropagation();
            const nextSize = clampBrushSize(brushAdjust.startSize + event.clientX - brushAdjust.startX);
            setBrushSize(nextSize);
            setBrushPreview({
                x: brushAdjust.previewX,
                y: brushAdjust.previewY,
                size: nextSize,
                adjusting: true,
            });
            return;
        }
        updateBrushPreview(event);
        if (!drawingRef.current.active) return;
        event.preventDefault();
        draw(event);
    };

    const stopDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const brushAdjust = brushAdjustRef.current;
        if (brushAdjust?.active && event.pointerId === brushAdjust.pointerId) {
            brushAdjustRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            updateBrushPreview(event, brushSize);
            return;
        }
        const stroke = drawingRef.current.stroke;
        drawingRef.current = { active: false, stroke: null };
        if (stroke?.points.length) {
            historyRef.current.push(stroke);
            setHistorySize(historyRef.current.length);
            redoRef.current = [];
            setRedoSize(0);
        }
    };

    const undoMask = useCallback(() => {
        if (drawingRef.current.active || !historyRef.current.length) return;
        const stroke = historyRef.current.pop();
        if (stroke) redoRef.current.push(stroke);
        setHistorySize(historyRef.current.length);
        setRedoSize(redoRef.current.length);
        replayMask(historyRef.current, maskCanvasRef.current, previewCanvasRef.current);
        setError("");
    }, []);

    const redoMask = useCallback(() => {
        if (drawingRef.current.active || !redoRef.current.length) return;
        const stroke = redoRef.current.pop();
        if (stroke) historyRef.current.push(stroke);
        setHistorySize(historyRef.current.length);
        setRedoSize(redoRef.current.length);
        replayMask(historyRef.current, maskCanvasRef.current, previewCanvasRef.current);
        setError("");
    }, []);

    const resetMask = () => {
        historyRef.current = [];
        redoRef.current = [];
        setHistorySize(0);
        setRedoSize(0);
        clearCanvas(maskCanvasRef.current);
        clearCanvas(previewCanvasRef.current);
        setError("");
    };

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("input,textarea,[contenteditable='true']")) return;
            const key = event.key.toLowerCase();
            const modifier = (event.metaKey || event.ctrlKey) && !event.altKey;
            const isUndo = modifier && !event.shiftKey && key === "z";
            const isRedo = modifier && ((event.shiftKey && key === "z") || (!event.shiftKey && key === "y"));
            if (!isUndo && !isRedo) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (isRedo) redoMask();
            else undoMask();
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [open, redoMask, undoMask]);

    const submit = (generate: boolean) => {
        const nextPrompt = prompt.trim();
        const canvas = maskCanvasRef.current;
        const element = imageRef.current;
        if (!nextPrompt) return setError("请输入修改要求");
        if (!canvas || !element) return;
        if (!canvasHasPaint(canvas)) return setError("请先涂抹局部区域");
        onConfirm({ prompt: nextPrompt, maskDataUrl: buildMaskOverlay(element, canvas), generate });
    };

    return (
        <Dialog
            open={open && Boolean(dataUrl)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 980, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle className="sr-only">局部编辑</DialogTitle>
                </DialogHeader>
                <div>
                    <div className="grid gap-5 lg:grid-cols-[minmax(360px,1fr)_320px]" data-canvas-no-zoom>
                        <div
                            ref={viewport.viewportRef}
                            {...viewport.panHandlers}
                            className={cn("relative h-[min(68vh,720px)] min-h-[360px] rounded-xl border border-border bg-transparent", viewport.scrollClassName, viewport.isPanning ? "cursor-grabbing" : viewport.spacePressed ? "cursor-grab" : "")}
                        >
                            <div className="relative" style={viewport.contentStyle}>
                                <div ref={viewport.stageRef} className="absolute isolate overflow-hidden rounded-lg bg-transparent select-none [backface-visibility:hidden] [contain:layout_paint] [transform:translateZ(0)]" style={viewport.stageStyle}>
                                    {image ? (
                                        <>
                                            <canvas ref={maskCanvasRef} width={image.width} height={image.height} className="hidden" />
                                            <div className="absolute left-0 top-0 [backface-visibility:hidden]" style={viewport.mediaStyle}>
                                                <img ref={imageRef} src={dataUrl} alt="" className="absolute inset-0 block h-full w-full bg-transparent object-contain" draggable={false} />
                                                <canvas
                                                    ref={previewCanvasRef}
                                                    width={image.width}
                                                    height={image.height}
                                                    className="absolute inset-0 h-full w-full cursor-none touch-none"
                                                    style={{ opacity: maskOverlayAlpha }}
                                                    onPointerDown={startDraw}
                                                    onPointerMove={moveDraw}
                                                    onPointerUp={stopDraw}
                                                    onPointerCancel={stopDraw}
                                                    onPointerEnter={(event) => updateBrushPreview(event)}
                                                    onPointerLeave={() => {
                                                        if (!drawingRef.current.active && !brushAdjustRef.current?.active) setBrushPreview(null);
                                                    }}
                                                    onContextMenu={(event) => event.preventDefault()}
                                                />
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        {brushPreview
                            ? createPortal(
                                  <div
                                      className={cn("pointer-events-none fixed z-[1100] rounded-full border-2", brushPreview.adjusting ? "border-[#fbbf24] bg-black/10" : "border-white/90 bg-black/5", "shadow-[0_0_0_1px_rgba(0,0,0,.8)]")}
                                      style={{ left: brushPreview.x, top: brushPreview.y, width: Math.max(4, brushPreview.size * viewport.imageScale), aspectRatio: 1, transform: "translate(-50%, -50%)" }}
                                  >
                                      {brushPreview.adjusting ? <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">{brushSize}px</span> : null}
                                  </div>,
                                  document.body,
                              )
                            : null}

                        <FieldGroup className="min-h-[360px] gap-5">
                            <div>
                                <h2 className="text-xl font-semibold">{"局部遮罩编辑"}</h2>
                                <div className="mt-2 text-sm opacity-60">{image ? `${image.width} x ${image.height}px` : "读取中"}</div>
                                <div className="mt-2 text-xs leading-5 opacity-55">{"滚轮缩放 · 中键或空格+左键拖动画面 · Alt+左/右键横拖调笔刷 · Ctrl/Cmd+Z 撤回 · Ctrl/Cmd+Shift+Z 重做"}</div>
                            </div>

                            <Field>
                                <FieldLabel id={`${id}-mode`} className="sr-only">
                                    遮罩工具
                                </FieldLabel>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    spacing={2}
                                    value={mode}
                                    onValueChange={(value) => {
                                        if (value) setMode(value as DrawMode);
                                    }}
                                    aria-labelledby={`${id}-mode`}
                                    className="grid grid-cols-2"
                                >
                                    <ToggleGroupItem value="paint">
                                        <Brush data-icon="inline-start" aria-hidden />
                                        画笔
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="erase">
                                        <Eraser data-icon="inline-start" aria-hidden />
                                        擦除
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </Field>

                            <div className="flex items-center justify-between rounded-lg border border-border px-2 py-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button aria-label={"撤回局部涂抹"} onClick={undoMask} type={"button"} variant={"ghost"} size="icon" disabled={!historySize}>
                                            {<Undo2 data-icon="inline-start" aria-hidden />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{"撤回局部涂抹 (Ctrl/Cmd+Z)"}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button aria-label={"重做局部涂抹"} onClick={redoMask} type={"button"} variant={"ghost"} size="icon" disabled={!redoSize}>
                                            {<Redo2 data-icon="inline-start" aria-hidden />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{"重做局部涂抹 (Ctrl/Cmd+Shift+Z)"}</TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button aria-label={"缩小"} onClick={viewport.zoomOut} type={"button"} variant={"ghost"} size="icon" disabled={!viewport.canZoomOut}>
                                                {<ZoomOut data-icon="inline-start" aria-hidden />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{"缩小"}</TooltipContent>
                                    </Tooltip>
                                    <Button variant="ghost" type="button" className="min-w-14 text-center text-xs font-semibold tabular-nums opacity-70" onClick={viewport.resetZoom}>
                                        {Math.round(viewport.zoom * 100)}%
                                    </Button>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button aria-label={"放大"} onClick={viewport.zoomIn} type={"button"} variant={"ghost"} size="icon" disabled={!viewport.canZoomIn}>
                                                {<ZoomIn data-icon="inline-start" aria-hidden />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{"放大"}</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>

                            <Field>
                                <div className="flex items-center justify-between">
                                    <FieldLabel id={`${id}-brush`}>笔刷大小</FieldLabel>
                                    <span className="font-semibold">{brushSize}px</span>
                                </div>
                                <Slider aria-labelledby={`${id}-brush`} min={8} max={160} step={2} value={[brushSize]} onValueChange={([value]) => setBrushSize(value)} />
                            </Field>

                            <Field data-invalid={Boolean(error && !prompt.trim())}>
                                <FieldLabel htmlFor={`${id}-prompt`}>修改要求</FieldLabel>
                                <Textarea
                                    id={`${id}-prompt`}
                                    aria-describedby={error ? `${id}-error` : undefined}
                                    rows={6}
                                    value={prompt}
                                    aria-invalid={Boolean(error && !prompt.trim())}
                                    placeholder={"例如：把选中区域改成金属材质，保持原图光影"}
                                    onChange={(event) => {
                                        setPrompt(event.target.value);
                                        setError("");
                                    }}
                                />
                                {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
                            </Field>

                            <div className="mt-auto flex items-center justify-between gap-2">
                                <Button onClick={resetMask} type={"button"} variant={"secondary"} size="default">
                                    {<RotateCcw data-icon="inline-start" aria-hidden />}
                                    {"重置"}
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => submit(false)} type={"button"} variant={"secondary"} size="default">
                                        {<ImagePlus data-icon="inline-start" aria-hidden />}
                                        {"导出到画布"}
                                    </Button>
                                    <Button onClick={() => submit(true)} type={"button"} variant={"default"} size="default">
                                        {<WandSparkles data-icon="inline-start" aria-hidden />}
                                        {"立刻生成"}
                                    </Button>
                                </div>
                            </div>
                        </FieldGroup>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function readCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
        y: ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
    };
}

function clampBrushSize(value: number) {
    return Math.min(160, Math.max(8, Math.round(value / 2) * 2));
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawMaskStroke(context: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, size: number) {
    if (from.x === to.x && from.y === to.y) {
        context.beginPath();
        context.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
        context.fill();
        return;
    }
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
}

function configureStrokeContext(context: CanvasRenderingContext2D, stroke: MaskStroke) {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = stroke.size;
    context.globalCompositeOperation = stroke.mode === "paint" ? "source-over" : "destination-out";
    context.strokeStyle = "#000";
    context.fillStyle = "#000";
}

function configurePreviewStrokeContext(context: CanvasRenderingContext2D, stroke: MaskStroke) {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = stroke.size;
    context.globalCompositeOperation = stroke.mode === "paint" ? "source-over" : "destination-out";
    context.strokeStyle = maskOverlayColor;
    context.fillStyle = maskOverlayColor;
}

function replayMask(strokes: MaskStroke[], maskCanvas: HTMLCanvasElement | null, previewCanvas: HTMLCanvasElement | null) {
    const context = maskCanvas?.getContext("2d", { willReadFrequently: true });
    const previewContext = previewCanvas?.getContext("2d");
    if (!maskCanvas || !context || !previewCanvas || !previewContext) return;
    context.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    for (const stroke of strokes) {
        configureStrokeContext(context, stroke);
        configurePreviewStrokeContext(previewContext, stroke);
        stroke.points.forEach((point, index) => {
            const previous = stroke.points[index - 1] || point;
            drawMaskStroke(context, previous, point, stroke.size);
            drawMaskStroke(previewContext, previous, point, stroke.size);
        });
    }
}

function canvasHasPaint(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < data.length; index += 4) {
        if (data[index] > 0) return true;
    }
    return false;
}

function buildMaskOverlay(image: HTMLImageElement, selectionCanvas: HTMLCanvasElement) {
    const canvas = document.createElement("canvas");
    canvas.width = selectionCanvas.width;
    canvas.height = selectionCanvas.height;
    const context = canvas.getContext("2d");
    if (!context) return selectionCanvas.toDataURL("image/png");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const overlayContext = overlay.getContext("2d");
    if (!overlayContext) return canvas.toDataURL("image/png");
    overlayContext.drawImage(selectionCanvas, 0, 0);
    overlayContext.globalCompositeOperation = "source-in";
    overlayContext.fillStyle = maskOverlayColor;
    overlayContext.fillRect(0, 0, overlay.width, overlay.height);
    context.globalAlpha = maskOverlayAlpha;
    context.drawImage(overlay, 0, 0);
    return canvas.toDataURL("image/png");
}
