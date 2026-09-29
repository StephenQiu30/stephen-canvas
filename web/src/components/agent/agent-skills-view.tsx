import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronDown, CircleAlert, FilePenLine, LoaderCircle, LockKeyhole, MessageSquareText, Plus, RefreshCw, Search, Sparkles, Trash2, Workflow, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { canvasThemes } from "@/lib/canvas-theme";
import {
    createCodexSkill,
    createCodexSkillDraft,
    deleteCodexSkill,
    fetchCodexSkill,
    postState,
    setCodexSkillEnabled,
    updateCodexSkill,
    type AgentSkillDetail,
    type AgentSkillDraft,
    type AgentSkillInterface,
    type AgentSkillScope,
    type AgentSkillSummary,
} from "@/services/api/canvas-agent";
import { useAgentSkillStore } from "@/stores/use-agent-skill-store";
import { useAgentStore, type AgentChatItem } from "@/stores/use-agent-store";
import { useThemeStore } from "@/stores/use-theme-store";

type ScopeFilter = "all" | AgentSkillScope;
type SkillDraftSource = "conversation" | "canvas";
type SkillEditor = { mode: "create"; values?: SkillFormValues } | { mode: "edit"; detail: AgentSkillDetail };
type SkillFormValues = { name: string; description: string; instructions: string; displayName?: string; shortDescription?: string; defaultPrompt?: string };

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function AgentSkillsView({ clientId }: { clientId: string }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { message, modal } = useAppFeedback();
    const connected = useAgentStore((state) => state.connected);
    const url = useAgentStore((state) => state.url);
    const token = useAgentStore((state) => state.token);
    const activeThreadId = useAgentStore((state) => state.activeThreadId);
    const hasConversation = useAgentStore((state) => hasSettledConversation(state.messages, state.activeThreadId));
    const hasCanvas = useAgentStore((state) => Boolean(state.canvasContext));
    const sending = useAgentStore((state) => state.sending);
    const waiting = useAgentStore((state) => state.waiting);
    const setAgentState = useAgentStore((state) => state.setAgentState);
    const skills = useAgentSkillStore((state) => state.skills);
    const selectedSkill = useAgentSkillStore((state) => state.selectedSkill);
    const loading = useAgentSkillStore((state) => state.loading);
    const loaded = useAgentSkillStore((state) => state.loaded);
    const errors = useAgentSkillStore((state) => state.errors);
    const draft = useAgentSkillStore((state) => state.draft);
    const generatingSource = useAgentSkillStore((state) => state.generatingSource);
    const loadSkills = useAgentSkillStore((state) => state.loadSkills);
    const selectSkill = useAgentSkillStore((state) => state.selectSkill);
    const clearSelection = useAgentSkillStore((state) => state.clearSelection);
    const setDraft = useAgentSkillStore((state) => state.setDraft);
    const setGeneratingSource = useAgentSkillStore((state) => state.setGeneratingSource);
    const [query, setQuery] = useState("");
    const [scope, setScope] = useState<ScopeFilter>("all");
    const [editor, setEditor] = useState<SkillEditor | null>(null);
    const [saving, setSaving] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [createMenuOpen, setCreateMenuOpen] = useState(false);
    const [busySkill, setBusySkill] = useState("");
    const [errorsOpen, setErrorsOpen] = useState(false);
    const confirmRef = useRef<{ destroy: () => void } | null>(null);
    const form = useForm<SkillFormValues>({ defaultValues: { name: "", description: "", instructions: "", displayName: "", shortDescription: "", defaultPrompt: "" } });
    const endpoint = url.trim().replace(/\/$/, "");
    const filteredSkills = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return skills.filter((skill) => {
            if (scope !== "all" && skill.scope !== scope) return false;
            return !keyword || [skill.name, skill.description, skill.interface?.displayName, skill.interface?.shortDescription, skill.shortDescription].some((value) => value?.toLowerCase().includes(keyword));
        });
    }, [query, scope, skills]);

    useEffect(() => {
        form.reset(editor?.mode === "edit" ? skillFormValues(editor.detail) : editor?.values || { name: "", description: "", instructions: "", displayName: "", shortDescription: "", defaultPrompt: "" });
    }, [editor, form]);

    const refresh = (forceReload = true) => loadSkills(endpoint, token, forceReload);
    const connectionIsCurrent = (revision: number) => {
        const agent = useAgentStore.getState();
        const skillsState = useAgentSkillStore.getState();
        return skillsState.connectionRevision === revision && agent.connected && agent.url.trim().replace(/\/$/, "") === endpoint && agent.token === token;
    };
    useEffect(() => {
        if (draft) setEditor((current) => current || { mode: "create", values: draftFormValues(draft) });
    }, [draft]);
    useEffect(() => {
        if (connected) return;
        confirmRef.current?.destroy();
        confirmRef.current = null;
        setEditor(null);
        setSaving(false);
        setAdvancedOpen(false);
        setCreateMenuOpen(false);
        setBusySkill("");
        setErrorsOpen(false);
        form.reset();
    }, [connected, form]);
    const useSkill = (skill: AgentSkillSummary) => {
        selectSkill(skill);
        setAgentState({ activeTab: "chat" });
    };
    const generateDraft = async (source: SkillDraftSource) => {
        const agent = useAgentStore.getState();
        if (agent.sending || agent.waiting) return message.warning("Codex 正在运行，请完成当前任务后再提炼 Skill");
        if (source === "conversation" && !hasSettledConversation(agent.messages, agent.activeThreadId)) return message.warning("当前对话还没有可提炼的已完成内容");
        if (source === "canvas" && !agent.canvasContext) return message.warning("当前页面没有可提炼的画布");
        if (!clientId) return message.warning("当前页面仍在连接 Agent，请稍后再试");
        const connectionRevision = useAgentSkillStore.getState().connectionRevision;
        setGeneratingSource(source);
        try {
            if (source === "canvas") {
                const synced = await postState(endpoint, token, clientId, agent.canvasContext?.snapshot || null);
                if (!synced) throw new Error("同步当前画布失败，请检查 Agent 连接后重试");
            }
            if (!connectionIsCurrent(connectionRevision)) return;
            const response = await createCodexSkillDraft(endpoint, token, {
                source,
                threadId: agent.activeThreadId,
                clientId,
                ...(agent.model ? { model: agent.model } : {}),
                ...(agent.reasoningEffort ? { effort: agent.reasoningEffort } : {}),
            });
            if (!connectionIsCurrent(connectionRevision)) return;
            if (!response.data) throw new Error("未生成 Skill 草稿");
            setDraft(response.data);
            message.success("草稿已生成，可在技能页确认后创建");
        } catch (error) {
            if (connectionIsCurrent(connectionRevision)) message.error(error instanceof Error ? error.message : "生成 Skill 草稿失败");
        } finally {
            if (connectionIsCurrent(connectionRevision)) setGeneratingSource(null);
        }
    };
    const openEdit = async (skill: AgentSkillSummary) => {
        if (!skill.managed || busySkill || useAgentSkillStore.getState().generatingSource) return;
        const connectionRevision = useAgentSkillStore.getState().connectionRevision;
        setBusySkill(skill.path);
        try {
            const response = await fetchCodexSkill(endpoint, token, skill.name);
            if (!connectionIsCurrent(connectionRevision)) return;
            if (!response.data) throw new Error("未读取到 Skill 内容");
            setEditor({ mode: "edit", detail: response.data });
        } catch (error) {
            if (connectionIsCurrent(connectionRevision)) message.error(error instanceof Error ? error.message : "读取 Skill 失败");
        } finally {
            if (connectionIsCurrent(connectionRevision)) setBusySkill("");
        }
    };
    const saveSkill = async () => {
        if (!editor) return;
        if (!(await form.trigger())) {
            const first = (["name", "displayName", "description", "instructions", "shortDescription", "defaultPrompt"] as const).find((name) => form.getFieldState(name).invalid);
            if (first === "shortDescription" || first === "defaultPrompt") setAdvancedOpen(true);
            if (first) requestAnimationFrame(() => form.setFocus(first));
            return;
        }
        const values = form.getValues();
        const name = editor.mode === "edit" ? editor.detail.name : values.name.trim();
        const skillInterface = compactInterface(values);
        if (skillInterface?.defaultPrompt && !mentionsSkill(skillInterface.defaultPrompt, name)) {
            form.setError("defaultPrompt", { message: `默认提示词需要包含 \$${name}` });
            setAdvancedOpen(true);
            requestAnimationFrame(() => form.setFocus("defaultPrompt"));
            return;
        }
        const connectionRevision = useAgentSkillStore.getState().connectionRevision;
        if (!connectionIsCurrent(connectionRevision)) return;
        setSaving(true);
        try {
            const input = { description: values.description.trim(), instructions: values.instructions.trim(), interface: skillInterface || null };
            if (editor.mode === "create") await createCodexSkill(endpoint, token, { name, ...input });
            else await updateCodexSkill(endpoint, token, name, { ...input, expectedRevision: editor.detail.revision });
            if (!connectionIsCurrent(connectionRevision)) return;
            setDraft(null);
            setEditor(null);
            setAdvancedOpen(false);
            await refresh();
            if (!connectionIsCurrent(connectionRevision)) return;
            message.success(editor.mode === "create" ? "Skill 已创建" : "Skill 已更新");
        } catch (error) {
            if (connectionIsCurrent(connectionRevision)) message.error(error instanceof Error ? error.message : "保存 Skill 失败");
        } finally {
            if (connectionIsCurrent(connectionRevision)) setSaving(false);
        }
    };
    const confirmDelete = (skill: AgentSkillSummary) => {
        const connectionRevision = useAgentSkillStore.getState().connectionRevision;
        confirmRef.current = modal.confirm({
            title: `删除 ${skill.interface?.displayName || skill.name}`,
            content: "删除后本地文件无法恢复，确定继续吗？",
            okText: "删除",
            okType: "danger",
            cancelText: "取消",
            onOk: async () => {
                if (!connectionIsCurrent(connectionRevision)) return;
                setBusySkill(skill.path);
                try {
                    const response = await fetchCodexSkill(endpoint, token, skill.name);
                    if (!connectionIsCurrent(connectionRevision)) return;
                    if (!response.data) throw new Error("未读取到 Skill 内容");
                    await deleteCodexSkill(endpoint, token, skill.name, response.data.revision);
                    if (!connectionIsCurrent(connectionRevision)) return;
                    if (selectedSkill?.name === skill.name && selectedSkill.path === skill.path) clearSelection();
                    await refresh();
                    if (!connectionIsCurrent(connectionRevision)) return;
                    message.success("Skill 已删除");
                } catch (error) {
                    if (!connectionIsCurrent(connectionRevision)) return;
                    message.error(error instanceof Error ? error.message : "删除 Skill 失败");
                    throw error;
                } finally {
                    if (connectionIsCurrent(connectionRevision)) setBusySkill("");
                }
            },
            afterClose: () => {
                confirmRef.current = null;
            },
        });
    };
    const toggleEnabled = async (skill: AgentSkillSummary, enabled: boolean) => {
        const connectionRevision = useAgentSkillStore.getState().connectionRevision;
        if (!connectionIsCurrent(connectionRevision)) return;
        setBusySkill(skill.path);
        try {
            await setCodexSkillEnabled(endpoint, token, skill, enabled);
            if (!connectionIsCurrent(connectionRevision)) return;
            if (!enabled && selectedSkill?.name === skill.name && selectedSkill.path === skill.path) clearSelection();
            await refresh();
        } catch (error) {
            if (connectionIsCurrent(connectionRevision)) message.error(error instanceof Error ? error.message : "更新 Skill 状态失败");
        } finally {
            if (connectionIsCurrent(connectionRevision)) setBusySkill("");
        }
    };
    const codexBusy = sending || waiting;
    const createMenu = {
        items: [
            {
                key: "conversation",
                icon: <MessageSquareText className="size-4" />,
                disabled: codexBusy || !hasConversation,
                label: (
                    <div className="py-0.5">
                        <div className="text-sm">{"从当前对话生成草稿"}</div>
                        <div className="mt-0.5 text-xs" style={{ color: theme.node.muted }}>
                            {codexBusy ? "Codex 运行结束后可用" : hasConversation ? "整理当前对话中的可复用流程" : activeThreadId ? "当前对话还没有已完成内容" : "请先开始一段对话"}
                        </div>
                    </div>
                ),
            },
            {
                key: "canvas",
                icon: <Workflow className="size-4" />,
                disabled: codexBusy || !hasCanvas,
                label: (
                    <div className="py-0.5">
                        <div className="text-sm">{"从当前画布生成草稿"}</div>
                        <div className="mt-0.5 text-xs" style={{ color: theme.node.muted }}>
                            {codexBusy ? "Codex 运行结束后可用" : hasCanvas ? "整理当前页面的节点与生成流程" : "当前页面没有可用画布"}
                        </div>
                    </div>
                ),
            },
            { type: "divider" as const },
            {
                key: "manual",
                icon: <FilePenLine className="size-4" />,
                label: (
                    <div className="py-0.5">
                        <div className="text-sm">{"空白创建"}</div>
                        <div className="mt-0.5 text-xs" style={{ color: theme.node.muted }}>
                            {"从空白表单开始编写"}
                        </div>
                    </div>
                ),
            },
        ],
        onClick: ({ key }: { key: string }) => {
            if (key === "manual") {
                setDraft(null);
                setEditor({ mode: "create" });
            } else void generateDraft(key as SkillDraftSource);
        },
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-4 py-3" style={{ borderColor: theme.node.stroke }}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold">{"本地 Skill"}</div>
                        <div className="mt-0.5 text-xs" style={{ color: theme.node.muted }}>
                            {"安装在本机，由 Codex 直接执行"}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button aria-label={"重新读取 Skill"} onClick={() => void refresh()} type={"button"} variant={"ghost"} size="icon" disabled={!connected || loading} className={"!h-8 !w-8 !min-w-8"}>
                                    {<RefreshCw data-icon="inline-start" className={`size-4 ${loading ? "animate-spin" : ""}`} />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{"重新读取"}</TooltipContent>
                        </Tooltip>
                        <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                            <DropdownMenuTrigger asChild disabled={!connected || !clientId || Boolean(generatingSource)}>
                                <Button aria-haspopup="menu" aria-expanded={createMenuOpen} type={"button"} variant={"ghost"} size="default" disabled={Boolean(Boolean(generatingSource)) || !connected || !clientId} className={"!h-8 !px-2"}>
                                    {Boolean(generatingSource) ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                                    {"创建 Skill"}
                                    <ChevronDown className="size-3.5 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="end">
                                <DropdownMenuGroup>
                                    {createMenu.items.map((item, index) =>
                                        "type" in item && item.type === "divider" ? (
                                            <DropdownMenuSeparator key={index} />
                                        ) : (
                                            <DropdownMenuItem
                                                key={item.key}
                                                disabled={"disabled" in item ? item.disabled : false}
                                                onSelect={() => {
                                                    createMenu.onClick({ key: item.key! });
                                                }}
                                            >
                                                {"icon" in item ? item.icon : null}
                                                {item.label}
                                            </DropdownMenuItem>
                                        ),
                                    )}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="mt-3 flex gap-2">
                    <InputGroup className={"min-w-0 flex-1"}>
                        <InputGroupAddon>{<Search className="size-3.5" />}</InputGroupAddon>
                        <InputGroupInput aria-label={"搜索 Skill"} disabled={!connected} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={"搜索 Skill"} />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton aria-label="清空" onClick={() => setQuery("")}>
                                <X />
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                    <Select
                        disabled={!connected}
                        value={String(scope ?? "")}
                        onValueChange={(value) => {
                            const option = [
                                { value: "all", label: "全部来源" },
                                ...(["repo", "user", "system", "admin"] as AgentSkillScope[]).map((value) => ({
                                    value,
                                    label: ({ all: "全部来源", repo: "项目", user: "个人", system: "系统", admin: "管理员" } as Record<string, string>)[String(value)] || String(value),
                                })),
                            ].find((item) => String(item.value) === value);
                            if (option) setScope(option.value as ScopeFilter);
                        }}
                    >
                        <SelectTrigger className={"w-28 shrink-0"} aria-label={"按来源筛选 Skill"}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {[
                                    { value: "all", label: "全部来源" },
                                    ...(["repo", "user", "system", "admin"] as AgentSkillScope[]).map((value) => ({
                                        value,
                                        label: ({ all: "全部来源", repo: "项目", user: "个人", system: "系统", admin: "管理员" } as Record<string, string>)[String(value)] || String(value),
                                    })),
                                ].map((option) => (
                                    <SelectItem key={String(option.value)} value={String(option.value)}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                {errors.length ? (
                    <Button onClick={() => setErrorsOpen(true)} type={"button"} variant={"destructive"} size="sm" className={"!mt-1 !h-7 !px-1 text-xs"}>
                        {<CircleAlert data-icon="inline-start" />}
                        {`${errors.length} 个 Skill 未能加载`}
                    </Button>
                ) : null}
            </div>
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4">
                {loading && !loaded ? (
                    <div className="flex h-40 items-center justify-center gap-2 text-sm" style={{ color: theme.node.muted }}>
                        <LoaderCircle className="size-4 animate-spin" />
                        {"正在读取 Skill…"}
                    </div>
                ) : filteredSkills.length ? (
                    <div className="divide-y" style={{ borderColor: theme.node.stroke }}>
                        {filteredSkills.map((skill) => {
                            const selected = selectedSkill?.name === skill.name && selectedSkill.path === skill.path;
                            const busy = busySkill === skill.path;
                            return (
                                <div key={`${skill.name}:${skill.path}`} className={`py-3 transition-opacity ${skill.enabled ? "" : "opacity-55"}`} style={{ borderColor: theme.node.stroke }}>
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="mt-0.5 size-4 shrink-0" style={{ color: selected ? theme.node.text : theme.node.muted }} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="truncate text-sm font-medium">{skill.interface?.displayName || skill.name}</span>
                                                {!skill.managed ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <LockKeyhole className="size-3.5 shrink-0" style={{ color: theme.node.faint }} />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">{"外部 Skill 只能使用或启停"}</TooltipContent>
                                                    </Tooltip>
                                                ) : null}
                                            </div>
                                            <div className="mt-1 line-clamp-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                                                {skill.interface?.shortDescription || skill.shortDescription || skill.description || "暂无说明"}
                                            </div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="mt-1.5 truncate text-[11px]" style={{ color: theme.node.faint }}>
                                                        {({ all: "全部来源", repo: "项目", user: "个人", system: "系统", admin: "管理员" } as Record<string, string>)[String(skill.scope)] || String(skill.scope)} · {skill.name}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">{skill.path}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2 pl-7">
                                        <label className="inline-flex items-center gap-2 text-xs" style={{ color: theme.node.muted }}>
                                            <Switch checked={skill.enabled} disabled={!connected || Boolean(busySkill) || Boolean(generatingSource)} onCheckedChange={(enabled) => void toggleEnabled(skill, enabled)} />
                                            {skill.enabled ? "已启用" : "已停用"}
                                        </label>
                                        <div className="flex items-center gap-0.5">
                                            <Button onClick={() => useSkill(skill)} type={"button"} variant={"ghost"} size="sm" disabled={!connected || !skill.enabled || Boolean(busySkill)}>
                                                {selected ? <Check data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                                                {selected ? "已选择" : "使用"}
                                            </Button>
                                            {skill.managed ? (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                aria-label={`编辑 ${skill.interface?.displayName || skill.name}`}
                                                                onClick={() => void openEdit(skill)}
                                                                type={"button"}
                                                                variant={"ghost"}
                                                                size="icon-sm"
                                                                disabled={!connected || Boolean(busySkill) || Boolean(generatingSource)}
                                                            >
                                                                {<FilePenLine data-icon="inline-start" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">{"编辑"}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                aria-label={`删除 ${skill.interface?.displayName || skill.name}`}
                                                                onClick={() => confirmDelete(skill)}
                                                                type={"button"}
                                                                variant={"destructive"}
                                                                size="icon-sm"
                                                                disabled={!connected || Boolean(busySkill) || Boolean(generatingSource)}
                                                            >
                                                                {<Trash2 data-icon="inline-start" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">{"删除"}</TooltipContent>
                                                    </Tooltip>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex h-48 flex-col items-center justify-center text-center">
                        <Sparkles className="size-5" style={{ color: theme.node.faint }} />
                        <div className="mt-3 text-sm font-medium">{!connected ? "连接 Agent 后查看 Skill" : skills.length ? "没有匹配的 Skill" : "还没有本地 Skill"}</div>
                        <div className="mt-1 text-xs" style={{ color: theme.node.muted }}>
                            {!connected ? "连接成功后会读取本机已安装的 Skill" : skills.length ? "换个关键词或来源试试" : "创建一个，或在本机安装后刷新"}
                        </div>
                    </div>
                )}
            </div>

            <Dialog
                open={errorsOpen}
                onOpenChange={(open) => {
                    if (!open) (() => setErrorsOpen(false))();
                }}
            >
                <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 720, maxWidth: "calc(100vw - 2rem)" }}>
                    <DialogHeader>
                        <DialogTitle>{`${errors.length} 个 Skill 未能加载`}</DialogTitle>
                    </DialogHeader>
                    <div>
                        <div className="thin-scrollbar mt-4 max-h-[60vh] overflow-y-auto rounded-md border px-3 py-2 text-xs leading-5" style={{ borderColor: theme.node.stroke }}>
                            {errors.map((error, index) => (
                                <div key={`${index}:${error}`} className="break-all py-1" style={{ color: theme.node.muted }}>
                                    {error}
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(editor)}
                onOpenChange={(open) => {
                    if (!open)
                        (() => {
                            if (saving) return;
                            setDraft(null);
                            setEditor(null);
                            setAdvancedOpen(false);
                        })();
                }}
            >
                <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 680, maxWidth: "calc(100vw - 2rem)" }}>
                    <DialogHeader>
                        <DialogTitle>{editor?.mode === "edit" ? `编辑 ${editor.detail.interface?.displayName || editor.detail.name}` : "创建 Skill"}</DialogTitle>
                    </DialogHeader>
                    <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
                        <div className="mb-5 text-xs" style={{ color: theme.node.muted }}>
                            {"保存到本地 Agent 工作区"} · <span className="font-mono">.agents/skills</span>
                        </div>
                        <FieldGroup>
                            <div className="mb-3 text-xs font-medium" style={{ color: theme.node.muted }}>
                                {"基本信息"}
                            </div>
                            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                                <Controller
                                    name="name"
                                    control={form.control}
                                    rules={{
                                        required: "请输入 Skill 标识",
                                        validate: (value) => !!String(value ?? "").trim() || "请输入 Skill 标识",
                                        maxLength: { value: 64, message: "Skill 标识不能超过 64 个字符" },
                                        pattern: { value: skillNamePattern, message: "仅支持小写字母、数字和连字符，连字符不能连续或位于首尾" },
                                    }}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="skill-name">{"Skill 标识"}</FieldLabel>
                                            <Input {...field} value={field.value ?? ""} id="skill-name" aria-invalid={fieldState.invalid} maxLength={64} disabled={editor?.mode === "edit"} placeholder={"例如 product-grid"} />
                                            <FieldDescription>{"用于文件夹名和 $skill-name 调用。"}</FieldDescription>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="displayName"
                                    control={form.control}
                                    rules={{ maxLength: { value: 64, message: "显示名称不能超过 64 个字符" } }}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="skill-displayName">{"显示名称"}</FieldLabel>
                                            <Input {...field} value={field.value ?? ""} id="skill-displayName" aria-invalid={fieldState.invalid} maxLength={64} placeholder={"例如 产品九宫格生成"} />
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                            </div>
                            <Controller
                                name="description"
                                control={form.control}
                                rules={{
                                    required: "请输入使用场景",
                                    maxLength: { value: 1024, message: "使用场景不能超过 1024 个字符" },
                                    validate: (value) => (!String(value ?? "").trim() ? "请输入使用场景" : /[<>]/.test(value || "") ? "使用场景不能包含尖括号" : true),
                                }}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="skill-description">{"何时使用"}</FieldLabel>
                                        <Textarea {...field} value={field.value ?? ""} id="skill-description" aria-invalid={fieldState.invalid} maxLength={1024} placeholder={"例如：当用户需要基于商品信息规划并生成一组产品图时使用"} rows={2} />
                                        <FieldDescription>{"说明这个 Skill 的能力和适用场景，Codex 会据此判断是否调用。"}</FieldDescription>
                                        <FieldError errors={[fieldState.error]} />
                                    </Field>
                                )}
                            />
                            <Controller
                                name="instructions"
                                control={form.control}
                                rules={{ required: "请输入执行说明", validate: (value) => !!String(value ?? "").trim() || "请输入执行说明" }}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="skill-instructions">{"执行说明"}</FieldLabel>
                                        <Textarea {...field} value={field.value ?? ""} id="skill-instructions" aria-invalid={fieldState.invalid} className="!leading-6" placeholder={"写清楚执行步骤、必要检查和最终输出"} rows={6} />
                                        <FieldDescription>{"按实际执行顺序写清步骤、约束和输出要求。"}</FieldDescription>
                                        <FieldError errors={[fieldState.error]} />
                                    </Field>
                                )}
                            />
                            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button type="button" variant="ghost">
                                        {<span className="text-sm font-medium">{"高级设置"}</span>}
                                        <ChevronDown data-icon="inline-end" />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent forceMount hidden={!advancedOpen}>
                                    <FieldGroup>
                                        {
                                            <>
                                                <Controller
                                                    name="shortDescription"
                                                    control={form.control}
                                                    rules={{ minLength: { value: 25, message: "卡片短说明不能少于 25 个字符" }, maxLength: { value: 64, message: "卡片短说明不能超过 64 个字符" } }}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid}>
                                                            <FieldLabel htmlFor="skill-shortDescription">{"卡片短说明"}</FieldLabel>
                                                            <Input {...field} value={field.value ?? ""} id="skill-shortDescription" aria-invalid={fieldState.invalid} maxLength={64} placeholder={"可选，用于列表展示"} />
                                                            <FieldDescription>{"填写时控制在 25–64 个字符，便于快速浏览。"}</FieldDescription>
                                                            <FieldError errors={[fieldState.error]} />
                                                        </Field>
                                                    )}
                                                />
                                                <Controller
                                                    name="defaultPrompt"
                                                    control={form.control}
                                                    rules={{ maxLength: { value: 1024, message: "默认提示词不能超过 1024 个字符" } }}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid}>
                                                            <FieldLabel htmlFor="skill-defaultPrompt">{"默认提示词"}</FieldLabel>
                                                            <Textarea {...field} value={field.value ?? ""} id="skill-defaultPrompt" aria-invalid={fieldState.invalid} maxLength={1024} placeholder={"可选，选择 Skill 时预填到输入框"} rows={2} />
                                                            <FieldDescription>{"填写时必须准确包含 $skill-name，例如 $product-grid。"}</FieldDescription>
                                                            <FieldError errors={[fieldState.error]} />
                                                        </Field>
                                                    )}
                                                />
                                            </>
                                        }
                                    </FieldGroup>
                                </CollapsibleContent>
                            </Collapsible>
                        </FieldGroup>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (saving) return;
                                setDraft(null);
                                setEditor(null);
                                setAdvancedOpen(false);
                            }}
                        >
                            {"取消"}
                        </Button>
                        <Button type="button" disabled={saving} onClick={() => void saveSkill()}>
                            {editor?.mode === "edit" ? "保存更改" : "创建 Skill"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function skillFormValues(detail: AgentSkillDetail): SkillFormValues {
    return {
        name: detail.name,
        description: detail.description,
        instructions: detail.instructions,
        displayName: detail.interface?.displayName || undefined,
        shortDescription: detail.interface?.shortDescription || undefined,
        defaultPrompt: detail.interface?.defaultPrompt || undefined,
    };
}

function draftFormValues(draft: AgentSkillDraft): SkillFormValues {
    return {
        name: draft.name,
        description: draft.description,
        instructions: draft.instructions,
        displayName: draft.displayName || undefined,
        shortDescription: draft.shortDescription || undefined,
        defaultPrompt: draft.defaultPrompt || undefined,
    };
}

function hasSettledConversation(messages: AgentChatItem[], threadId: string) {
    return Boolean(threadId && messages.some((item) => item.role === "user" && item.threadId === threadId && item.turnId));
}

function compactInterface(values: SkillFormValues): AgentSkillInterface | undefined {
    const skillInterface = {
        displayName: values.displayName?.trim() || undefined,
        shortDescription: values.shortDescription?.trim() || undefined,
        defaultPrompt: values.defaultPrompt?.trim() || undefined,
    };
    return Object.values(skillInterface).some(Boolean) ? skillInterface : undefined;
}

function mentionsSkill(prompt: string, name: string) {
    return new RegExp(`\\$${name}(?![A-Za-z0-9_-]|:[A-Za-z0-9_-])`).test(prompt);
}
