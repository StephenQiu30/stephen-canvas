import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import { Copy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useCopyText } from "@/hooks/use-copy-text";
import { getPluginAuthoringPrompt, getPluginReturn, getPluginTemplates, getPluginVariables } from "@/services/api/model-plugin";
import type { ModelCapability } from "@/stores/use-config-store";

function isDarkMode() {
    return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function StepHeading({ index, title }: { index: number; title: string }) {
    return (
        <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">{index}</span>
            <span className="text-sm font-medium text-brand-body ">{title}</span>
        </div>
    );
}

function StepBlock({ index, title, children }: { index: number; title: string; children: ReactNode }) {
    return (
        <section className="border-b border-border px-5 py-4 ">
            <StepHeading index={index} title={title} />
            {children}
        </section>
    );
}

export function ModelScriptEditor({ open, capability, modelName, value, onSave, onClose }: { open: boolean; capability: ModelCapability; modelName: string; value: string; onSave: (script: string) => void; onClose: () => void }) {
    const copyText = useCopyText();
    const [draft, setDraft] = useState(value);
    useEffect(() => {
        if (open) setDraft(value);
    }, [open, value]);

    const variables = getPluginVariables().filter((variable) => !variable.capabilities || variable.capabilities.includes(capability));
    const templates = getPluginTemplates()[capability];
    const capabilityLabel = ({ image: "生图", video: "视频", text: "文本", audio: "音频" } as Record<string, string>)[String(capability)] || String(capability);
    const hasScript = Boolean(draft.trim());

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={cn("max-h-[90dvh] overflow-y-auto", "!fixed !top-0 !left-0 !m-0 !h-dvh !w-screen !max-w-none !translate-x-0 !translate-y-0 !gap-0 !overflow-hidden !rounded-none !p-0")} style={{}}>
                <DialogHeader>
                    <DialogTitle className="sr-only">模型脚本编辑器</DialogTitle>
                </DialogHeader>
                <div style={{ display: "flex", height: "100dvh", maxHeight: "100dvh", flexDirection: "column", overflow: "hidden" }}>
                    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
                        <header className="shrink-0 border-b border-border px-6 py-3 pr-12 ">
                            <div className="text-base font-semibold">
                                {`${capabilityLabel}调用脚本`}
                                {modelName ? ` · ${modelName}` : ""}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{"按左侧三步配置：看懂规则、复制说明给外部 AI 写脚本，再粘贴到右侧保存。留空则使用系统默认调用。"}</div>
                        </header>
                        <div className="flex min-h-0 flex-1 overflow-hidden">
                            <aside className="flex h-full w-[420px] shrink-0 flex-col border-r border-border bg-muted/80  ">
                                <div className="flex shrink-0 gap-2 border-b border-border px-5 py-3 text-xs text-muted-foreground  ">
                                    <span>1. {"看懂规则"}</span>
                                    <span>→</span>
                                    <span>2. {"让外部 AI 写"}</span>
                                    <span>→</span>
                                    <span>3. {"粘贴保存"}</span>
                                </div>
                                <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain p-0">
                                    <StepBlock index={1} title={"看懂规则"}>
                                        <p className="text-xs leading-5 text-brand-body ">
                                            {"写成一个 async function，把 prompt、images、params 等写在参数里，params 再拆出 size、quality、count 等字段。函数里发请求并 return 结果，最后再调用一次该函数。"}
                                        </p>
                                        <div className="mt-3">
                                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{"返回要求"}</div>
                                            <div className="text-xs leading-6 text-brand-body ">{getPluginReturn(capability)}</div>
                                        </div>
                                    </StepBlock>
                                    <StepBlock index={2} title={"让外部 AI 写"}>
                                        <ol className="list-decimal flex flex-col gap-1.5 pl-4 text-xs leading-5 text-brand-body ">
                                            <li>{"点击下方按钮，复制本页的变量、返回要求和写法说明。"}</li>
                                            <li>{"打开 ChatGPT、Claude 或其他 AI，先粘贴说明，再附上你要对接的接口文档。"}</li>
                                            <li>{"把 AI 返回的脚本粘贴到右侧编辑器，确认后保存。"}</li>
                                        </ol>
                                        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{"复制内容包含当前模型、返回要求、全部可用变量和写法约束，不会带上 API Key 原文。"}</p>
                                        <Button onClick={() => copyText(getPluginAuthoringPrompt(capability, modelName, draft), "写脚本说明已复制，请到你的 AI 里粘贴")} type={"button"} variant={"default"} size="default" className={"mt-3"}>
                                            {<Copy data-icon="inline-start" />}
                                            {"复制写脚本说明"}
                                        </Button>
                                    </StepBlock>
                                    <section className="px-5 py-4">
                                        <StepHeading index={3} title={"可用变量"} />
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-xs leading-5 text-muted-foreground ">
                                                {"点击变量名插入到右侧编辑器。"}
                                                {capability === "video" ? ` ${"视频模型可使用 videos、audios 作为参考视频和参考音频。"}` : ""}
                                            </p>
                                            <span className="shrink-0 text-[10px] text-muted-foreground">{"点击插入"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {variables.map((variable) => (
                                                <Button
                                                    variant="ghost"
                                                    key={variable.name}
                                                    type="button"
                                                    onClick={() => setDraft((current) => (current ? `${current}\n${variable.name}` : variable.name))}
                                                    className="group block w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-muted"
                                                >
                                                    <div className="flex flex-wrap items-baseline gap-1.5">
                                                        <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-body group-hover:bg-blue-100 group-hover:text-blue-700   dark:group-hover:bg-blue-950 dark:group-hover:text-blue-300">
                                                            {variable.name}
                                                        </code>
                                                        <span className="font-mono text-[10px] text-muted-foreground">{variable.type}</span>
                                                    </div>
                                                    <div className="mt-1 text-xs leading-5 text-muted-foreground ">{variable.desc}</div>
                                                </Button>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </aside>
                            <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
                                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5 ">
                                    <div>
                                        <div className="text-sm font-medium text-brand-body ">{"脚本编辑器"}</div>
                                        <div className="text-xs text-muted-foreground">{"把外部 AI 写好的脚本粘贴到这里，也可以先插入模板再改。"}</div>
                                    </div>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">{hasScript ? "已填写自定义脚本" : "当前使用系统默认调用"}</span>
                                </div>
                                <div className="min-h-0 flex-1 overflow-hidden">
                                    <CodeMirror
                                        value={draft}
                                        onChange={setDraft}
                                        height="100%"
                                        theme={isDarkMode() ? "dark" : "light"}
                                        extensions={[javascript()]}
                                        placeholder={"// 把外部 AI 写好的脚本粘贴到这里；留空则使用系统默认调用。"}
                                        style={{ height: "100%", fontSize: 13 }}
                                        className="h-full [&_.cm-editor]:h-full [&_.cm-gutters]:border-none [&_.cm-scroller]:overflow-auto"
                                    />
                                </div>
                            </div>
                        </div>
                        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-3 ">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground">{"从模板开始"}</span>
                                {templates.map((template) => (
                                    <Button key={template.label} onClick={() => setDraft(template.script)} type={"button"} variant={"secondary"} size="sm">{`插入${template.label}模板`}</Button>
                                ))}
                                <Button onClick={() => setDraft("")} type={"button"} variant={"destructive"} size="sm">
                                    {"恢复默认调用"}
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={onClose} type={"button"} variant={"secondary"} size="default">
                                    {"取消"}
                                </Button>
                                <Button
                                    onClick={() => {
                                        onSave(draft.trim());
                                        onClose();
                                    }}
                                    type={"button"}
                                    variant={"default"}
                                    size="default"
                                >
                                    {"保存"}
                                </Button>
                            </div>
                        </footer>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
