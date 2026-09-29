import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ListPlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { defaultBaseUrlForApiFormat, guessCapability, normalizeChannelModels, type ApiCallFormat, type ChannelModel, type ModelCapability, type ModelChannel } from "@/stores/use-config-store";
import { ModelScriptEditor } from "./model-script-editor";
import { ModelSelectModal } from "./model-select-modal";

type ScriptTarget = { name: string; capability: ModelCapability; value: string };

export function ChannelEditorDrawer({ open, channel, onSave, onClose }: { open: boolean; channel: ModelChannel | null; onSave: (channel: ModelChannel) => void; onClose: () => void }) {
    const [draft, setDraft] = useState<ModelChannel | null>(channel);
    const [selectOpen, setSelectOpen] = useState(false);
    const [scriptTarget, setScriptTarget] = useState<ScriptTarget | null>(null);
    const apiFormatOptions: Array<{ label: string; value: ApiCallFormat }> = [
        { label: "OpenAI", value: "openai" },
        { label: "Gemini", value: "gemini" },
    ];
    const capabilityOptions: Array<{ label: string; value: ModelCapability }> = ["image", "video", "text", "audio"].map((value) => ({
        label: ({ image: "生图", video: "视频", text: "文本", audio: "音频" } as Record<string, string>)[String(value)] || String(value),
        value: value as ModelCapability,
    }));

    useEffect(() => {
        if (open && channel) setDraft(channel);
    }, [open, channel]);

    if (!draft) return null;

    const patch = (value: Partial<ModelChannel>) => setDraft((current) => (current ? { ...current, ...value } : current));
    const setModels = (models: ChannelModel[]) => patch({ models });

    const changeApiFormat = (apiFormat: ApiCallFormat) => {
        const baseUrl = !draft.baseUrl.trim() || draft.baseUrl.trim() === defaultBaseUrlForApiFormat(draft.apiFormat) ? defaultBaseUrlForApiFormat(apiFormat) : draft.baseUrl;
        patch({ apiFormat, baseUrl });
    };

    const applySelection = (names: string[]) => {
        const map = new Map(draft.models.map((model) => [model.name, model]));
        setModels(names.map((name) => map.get(name) || { name, capability: guessCapability(name) }));
    };

    const setCapability = (name: string, capability: ModelCapability) => setModels(draft.models.map((model) => (model.name === name ? { ...model, capability } : model)));
    const setScript = (name: string, script: string) => setModels(draft.models.map((model) => (model.name === name ? { ...model, script: script || undefined } : model)));
    const removeModel = (name: string) => setModels(draft.models.filter((model) => model.name !== name));

    const save = () => {
        onSave({ ...draft, name: draft.name.trim() || "未命名渠道", models: normalizeChannelModels(draft.models) });
        onClose();
    };

    return (
        <Sheet
            open={open}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <SheetContent side="right" aria-describedby={undefined} style={{ width: 640, maxWidth: "100vw" }}>
                <SheetHeader>
                    <SheetTitle>{"编辑渠道"}</SheetTitle>
                    {
                        <div className={"flex gap-2 items-center"}>
                            <Button onClick={onClose} type={"button"} variant={"secondary"} size="default">
                                {"取消"}
                            </Button>
                            <Button onClick={save} type={"button"} variant={"default"} size="default">
                                {"保存"}
                            </Button>
                        </div>
                    }
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium">{"渠道名称"}</span>
                            <Input value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium">{"协议"}</span>
                            <Select
                                value={String(draft.apiFormat ?? "")}
                                onValueChange={(value) => {
                                    const option = apiFormatOptions.find((item) => String(item.value) === value);
                                    if (option) changeApiFormat(option.value);
                                }}
                            >
                                <SelectTrigger className={"w-full"}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {apiFormatOptions.map((option) => (
                                            <SelectItem key={String(option.value)} value={String(option.value)}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </label>
                        <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-medium">{"接口地址"}</span>
                            <Input value={draft.baseUrl} onChange={(event) => patch({ baseUrl: event.target.value })} placeholder="https://api.example.com" />
                        </label>
                        <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-medium">API Key</span>
                            <Input value={draft.apiKey} onChange={(event) => patch({ apiKey: event.target.value })} placeholder="sk-..." type="password" />
                        </label>
                    </div>
                    <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="text-sm font-semibold">{"渠道模型"}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{`已选 ${draft.models.length} 个；为每个模型指定能力并可自定义调用脚本。`}</div>
                        </div>
                        <Button onClick={() => setSelectOpen(true)} type={"button"} variant={"default"} size="default">
                            {<ListPlus data-icon="inline-start" />}
                            {"选择模型"}
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-border p-2 ">
                        {draft.models.length ? (
                            draft.models.map((model) => (
                                <div key={model.name} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted dark:hover:bg-muted/40">
                                    <span className="min-w-0 flex-1 truncate text-sm" title={model.name}>
                                        {model.name}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <ToggleGroup
                                            type="single"
                                            variant="outline"
                                            value={String(model.capability)}
                                            size="sm"
                                            onValueChange={(value) => {
                                                if (value) ((value) => setCapability(model.name, value as ModelCapability))(value);
                                            }}
                                        >
                                            {capabilityOptions.map((item) => {
                                                const option = typeof item === "object" ? item : { value: item, label: item };
                                                return (
                                                    <ToggleGroupItem key={String(option.value)} value={String(option.value)}>
                                                        {option.label}
                                                    </ToggleGroupItem>
                                                );
                                            })}
                                        </ToggleGroup>
                                        <Button
                                            onClick={() => setScriptTarget({ name: model.name, capability: model.capability, value: model.script || "" })}
                                            type={"button"}
                                            variant={({ primary: "default", text: "ghost", link: "link", default: "secondary", dashed: "outline" } as const)[model.script ? "primary" : "default"]}
                                            size="sm"
                                        >
                                            {model.script ? "脚本已设" : "调用脚本"}
                                        </Button>
                                        <Button onClick={() => removeModel(model.name)} type={"button"} variant={"destructive"} size="icon-sm">
                                            {<Trash2 data-icon="inline-start" />}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-2 py-8 text-center text-sm text-muted-foreground">{"点击「选择模型」拉取或手动增加模型。"}</div>
                        )}
                    </div>
                    <ModelSelectModal open={selectOpen} channel={draft} selectedNames={draft.models.map((model) => model.name)} onConfirm={applySelection} onClose={() => setSelectOpen(false)} />
                    <ModelScriptEditor
                        open={Boolean(scriptTarget)}
                        capability={scriptTarget?.capability || "text"}
                        modelName={scriptTarget?.name || ""}
                        value={scriptTarget?.value || ""}
                        onSave={(script) => scriptTarget && setScript(scriptTarget.name, script)}
                        onClose={() => setScriptTarget(null)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
