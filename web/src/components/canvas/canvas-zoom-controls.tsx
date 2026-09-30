import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CANVAS_MAX_SCALE, CANVAS_MIN_SCALE } from "@/lib/canvas/canvas-viewport";
import { Compass, Focus, Magnet, Minus, Plus, Workflow } from "lucide-react";
import { useState } from "react";

export function CanvasZoomControls({
    scale,
    onScaleChange,
    onFit,
    isMiniMapOpen,
    onToggleMiniMap,
    showConnections,
    onToggleConnections,
    snapToGrid,
    onToggleSnap,
}: {
    scale: number;
    onScaleChange: (scale: number) => void;
    onFit: () => void;
    isMiniMapOpen: boolean;
    onToggleMiniMap: () => void;
    showConnections: boolean;
    onToggleConnections: () => void;
    snapToGrid: boolean;
    onToggleSnap: () => void;
}) {
    const [zoomOpen, setZoomOpen] = useState(false);
    const [draft, setDraft] = useState<string | null>(null);
    const percent = Math.round(scale * 100);
    const applyZoom = () => {
        const value = Number(draft);
        if (draft?.trim() && Number.isFinite(value)) onScaleChange(value / 100);
        setDraft(null);
    };
    return (
        <div data-canvas-no-zoom className="absolute bottom-4 left-4 z-50 flex h-10 items-center gap-1 @max-[1000px]/canvas:bottom-20" aria-label="画布视图控制">
            {[
                { label: "适合屏幕", icon: Focus, onClick: onFit },
                { label: "小地图", icon: Compass, onClick: onToggleMiniMap, pressed: isMiniMapOpen },
                { label: "显示连线", icon: Workflow, onClick: onToggleConnections, pressed: showConnections },
                { label: "网格吸附", icon: Magnet, onClick: onToggleSnap, pressed: snapToGrid },
            ].map(({ label, icon: Icon, onClick, pressed }) => (
                <Tooltip key={label}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={onClick} aria-label={label} aria-pressed={pressed} className="aria-pressed:bg-accent">
                            <Icon data-icon="inline-start" aria-hidden />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{label}</TooltipContent>
                </Tooltip>
            ))}
            <Popover
                open={zoomOpen}
                onOpenChange={(open) => {
                    setZoomOpen(open);
                    setDraft(null);
                }}
            >
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="min-w-16 tabular-nums" aria-label={`缩放选项，当前 ${percent}%`}>
                        {percent}%
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-60" data-canvas-no-zoom>
                    <Field>
                        <FieldLabel htmlFor="canvas-zoom-percent">缩放比例</FieldLabel>
                        <InputGroup>
                            <InputGroupInput
                                id="canvas-zoom-percent"
                                type="number"
                                min={CANVAS_MIN_SCALE * 100}
                                max={CANVAS_MAX_SCALE * 100}
                                value={draft ?? percent}
                                onChange={(event) => setDraft(event.target.value)}
                                onBlur={applyZoom}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        applyZoom();
                                        setZoomOpen(false);
                                    }
                                }}
                            />
                            <InputGroupAddon align="inline-end">%</InputGroupAddon>
                        </InputGroup>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon-sm" aria-label="缩小" onClick={() => onScaleChange(scale / 1.1)}>
                                <Minus data-icon="inline-start" aria-hidden />
                            </Button>
                            <Slider
                                min={CANVAS_MIN_SCALE * 100}
                                max={CANVAS_MAX_SCALE * 100}
                                value={[percent]}
                                step={1}
                                aria-label="缩放比例"
                                onValueChange={([value]) => {
                                    setDraft(null);
                                    onScaleChange(value / 100);
                                }}
                            />
                            <Button variant="ghost" size="icon-sm" aria-label="放大" onClick={() => onScaleChange(scale * 1.1)}>
                                <Plus data-icon="inline-start" aria-hidden />
                            </Button>
                        </div>
                    </Field>
                    <Separator className="my-2" />
                    <Button
                        variant="ghost"
                        className="w-full justify-between"
                        onClick={() => {
                            onFit();
                            setZoomOpen(false);
                        }}
                    >
                        适合屏幕<span className="text-muted-foreground">⌘ / Ctrl 0</span>
                    </Button>
                    {[0.5, 1, 2].map((value) => (
                        <Button
                            key={value}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                                onScaleChange(value);
                                setZoomOpen(false);
                            }}
                        >
                            {value * 100}%
                        </Button>
                    ))}
                </PopoverContent>
            </Popover>
        </div>
    );
}
