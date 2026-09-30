import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ArrowUp, Info, Maximize2, Square } from "lucide-react";
import { useEffect, useState } from "react";

import { ModelPicker } from "@/components/model-picker";
import { canvasThemes } from "@/lib/canvas-theme";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { defaultConfig, resolveModelForCapability, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData } from "@/types/canvas";
import { CanvasAudioSettingsPopover, type CanvasAudioSettingKey } from "./canvas-audio-settings-popover";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasNodeReferenceBar } from "./canvas-node-reference-bar";
import { CanvasPromptChipInput } from "./canvas-prompt-chip-input";
import { CanvasTextSettingsPopover } from "./canvas-text-settings-popover";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";

export type CanvasNodeGenerationMode = CanvasGenerationMode;

type CanvasNodePromptPanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    onPromptChange: (nodeId: string, prompt: string) => void;
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => void;
    onGenerate: (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string) => void;
    onStop: (nodeId: string) => void;
    mentionReferences?: CanvasResourceReference[];
    nodes: CanvasNodeData[];
    connectedNodes?: CanvasNodeData[];
    onDisconnectReference?: (fromNodeId: string, toNodeId: string) => void;
    onStartReferenceSelection?: (nodeId: string) => void;
    onImageSettingsOpenChange?: (open: boolean) => void;
    modeOverride?: CanvasNodeGenerationMode; // Plugin nodes set their generation type through useBuiltinPanel.mode.
};

export function CanvasNodePromptPanel({
    node,
    nodes,
    isRunning,
    onPromptChange,
    onConfigChange,
    onGenerate,
    onStop,
    mentionReferences = [],
    connectedNodes = [],
    onDisconnectReference,
    onStartReferenceSelection,
    onImageSettingsOpenChange,
    modeOverride,
}: CanvasNodePromptPanelProps) {
    const globalConfig = useEffectiveConfig();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = modeOverride ?? defaultMode(node.type);
    const config = buildNodeConfig(globalConfig, node, mode);
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const ready = isAiConfigReady(config, config.model);
    const unavailableReason = !config.model ? "暂无可用模型，等待宿主接入生成服务" : "生成服务尚未接入";
    const hasTextContent = node.type === CanvasNodeType.Text && Boolean(node.metadata?.content?.trim());
    const hasImageContent = node.type === CanvasNodeType.Image && Boolean(node.metadata?.content);
    const isEditingExistingContent = hasTextContent || hasImageContent;
    const promptPlaceholder =
        mode === "image"
            ? hasImageContent
                ? "请输入你想要把这张图修改成什么"
                : "描述要生成的图片内容"
            : mode === "text"
              ? hasTextContent
                  ? "请输入你想要将本段文本修改成什么"
                  : "请输入你想要生成的文本内容"
              : mode === "video"
                ? "描述要生成的视频内容"
                : "描述要生成的音频内容";
    const [prompt, setPrompt] = useState(node.metadata?.composerContent ?? node.metadata?.prompt ?? "");
    const [expanded, setExpanded] = useState(false);

    // Restore prompts only when switching nodes; preserve the current input after generation on the same node.
    useEffect(() => {
        setPrompt(node.metadata?.composerContent ?? node.metadata?.prompt ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node.id]);

    const updatePrompt = (value: string) => {
        setPrompt(value);
        if (isEditingExistingContent) onConfigChange(node.id, { composerContent: value });
        else onPromptChange(node.id, value);
    };

    const submit = () => {
        const text = prompt.trim();
        if (!text || isRunning || !ready) return;
        onGenerate(node.id, mode, text);
    };

    const openExpandedEditor = () => {
        setExpanded(true);
    };

    return (
        <div
            data-canvas-no-zoom
            className="flex min-h-0 flex-col gap-2 p-3"
            style={{ color: theme.node.text }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
        >
            <CanvasNodeReferenceBar nodeId={node.id} nodes={nodes} connectedNodes={connectedNodes} onDisconnect={onDisconnectReference} onStartSelection={onStartReferenceSelection} />
            <FieldGroup>
                <Field>
                    <FieldLabel className="sr-only">创作提示词</FieldLabel>
                    <CanvasPromptChipInput
                        value={prompt}
                        references={mentionReferences}
                        onChange={updatePrompt}
                        onSubmit={submit}
                        className="thin-scrollbar max-h-40 min-h-20 w-full cursor-text rounded-xl px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ background: "transparent", color: theme.node.text }}
                        placeholder={promptPlaceholder}
                    />
                </Field>
            </FieldGroup>
            {!ready && !isRunning ? (
                <Alert>
                    <Info aria-hidden />
                    <AlertDescription>{unavailableReason}</AlertDescription>
                </Alert>
            ) : null}

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button style={{ color: theme.node.text }} onClick={openExpandedEditor} aria-label={"放大编辑"} type={"button"} variant={"ghost"} size="icon" className="shrink-0">
                                {<Maximize2 data-icon="inline-start" aria-hidden />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{"放大编辑"}</TooltipContent>
                    </Tooltip>
                    {mode === "image" ? (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="image" className="max-w-[190px]" />
                            <CanvasImageSettingsPopover
                                config={config}
                                side="top"
                                align="start"
                                buttonClassName="max-w-[170px] justify-start"
                                onConfigChange={(key, value) => onConfigChange(node.id, key === "count" ? { count: Number(value) || 1 } : { [key]: value })}
                                onOpenChange={onImageSettingsOpenChange}
                            />
                        </>
                    ) : mode === "video" ? (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="video" className="max-w-[190px]" />
                            <CanvasVideoSettingsPopover config={config} buttonClassName="max-w-[220px] justify-start" onConfigChange={(key, value) => onConfigChange(node.id, videoConfigPatch(key, value))} />
                        </>
                    ) : mode === "audio" ? (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="audio" className="max-w-[190px]" />
                            <CanvasAudioSettingsPopover config={config} buttonClassName="max-w-[170px] justify-start" onConfigChange={(key, value) => onConfigChange(node.id, audioConfigPatch(key, value))} />
                        </>
                    ) : (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="text" className="max-w-[190px]" />
                            <CanvasTextSettingsPopover
                                config={config}
                                count={node.metadata?.textCount || 1}
                                onConfigChange={(_, value) => onConfigChange(node.id, { reasoningEffort: value })}
                                onCountChange={(textCount) => onConfigChange(node.id, { textCount })}
                            />
                        </>
                    )}
                </div>
                <Button
                    onClick={() => (isRunning ? onStop(node.id) : submit())}
                    aria-label={isRunning ? "停止生成" : "生成"}
                    type={"button"}
                    variant={isRunning ? "destructive" : "default"}
                    size="sm"
                    disabled={!isRunning && (!prompt.trim() || !ready)}
                    data-disabled={!isRunning && (!prompt.trim() || !ready)}
                    title={isRunning ? "停止生成" : ready ? "生成（Ctrl/Cmd + Enter）" : unavailableReason}
                    className="shrink-0"
                >
                    <span className="flex items-center gap-1.5">
                        {isRunning ? (
                            <>
                                <Spinner data-icon="inline-start" />
                                <Square className="fill-current" aria-hidden data-icon="inline-start" />
                                <span className="text-xs font-medium">{"停止"}</span>
                            </>
                        ) : (
                            <>
                                <ArrowUp data-icon="inline-start" aria-hidden />
                                <span>生成</span>
                            </>
                        )}
                    </span>
                </Button>
            </div>
            <Dialog
                open={expanded}
                onOpenChange={(open) => {
                    if (!open) (() => setExpanded(false))();
                }}
            >
                <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 760, maxWidth: "calc(100vw - 2rem)" }}>
                    <DialogHeader>
                        <DialogTitle>{"编辑提示词"}</DialogTitle>
                    </DialogHeader>
                    <div>
                        <div data-canvas-no-zoom className="pt-2" onWheelCapture={(event) => event.stopPropagation()}>
                            <CanvasNodeReferenceBar
                                nodeId={node.id}
                                nodes={nodes}
                                connectedNodes={connectedNodes}
                                onDisconnect={onDisconnectReference}
                                onStartSelection={(nodeId) => {
                                    setExpanded(false);
                                    onStartReferenceSelection?.(nodeId);
                                }}
                            />
                            <CanvasPromptChipInput
                                value={prompt}
                                references={mentionReferences}
                                onChange={updatePrompt}
                                onSubmit={submit}
                                className="thin-scrollbar h-[52dvh] min-h-80 w-full cursor-text overflow-y-auto rounded-xl border p-4 text-[15px] leading-6 outline-none"
                                style={{ background: "transparent", borderColor: theme.toolbar.border, color: theme.node.text }}
                                placeholder={promptPlaceholder}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function defaultMode(type: CanvasNodeData["type"]): CanvasNodeGenerationMode {
    return type === CanvasNodeType.Text ? "text" : type === CanvasNodeType.Video ? "video" : type === CanvasNodeType.Audio ? "audio" : "image";
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasNodeGenerationMode): AiConfig {
    return {
        ...globalConfig,
        model: resolveModelForCapability(globalConfig, node.metadata?.model, mode),
        reasoningEffort: node.metadata?.reasoningEffort || globalConfig.reasoningEffort || defaultConfig.reasoningEffort,
        quality: node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        size: node.metadata?.size || globalConfig.size || defaultConfig.size,
        background: node.metadata?.background ?? globalConfig.background ?? defaultConfig.background,
        videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        vquality: node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality,
        videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark || defaultConfig.videoWatermark,
        videoMode: node.metadata?.videoMode || globalConfig.videoMode || defaultConfig.videoMode,
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        count: String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    if (key === "videoMode") return { videoMode: value };
    return { [key]: value };
}

function audioConfigPatch(key: CanvasAudioSettingKey, value: string) {
    if (key === "audioVoice") return { audioVoice: value };
    if (key === "audioFormat") return { audioFormat: value };
    if (key === "audioSpeed") return { audioSpeed: value };
    return { audioInstructions: value };
}
