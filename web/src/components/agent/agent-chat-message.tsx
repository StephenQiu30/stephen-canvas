import { MediaPreview } from "@/components/media-preview";
import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Attachment, AttachmentContent, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import { Spinner } from "@/components/ui/spinner";
import { Brain, CheckCircle2, ChevronDown, ChevronRight, Circle, CircleAlert, Copy, ExternalLink, FilePenLine, FileText, FolderOpen, ListChecks, LoaderCircle, Search, ShieldAlert, TerminalSquare, Wrench, XCircle } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Streamdown, type LinkSafetyModalProps } from "streamdown";

import { useCopyText } from "@/hooks/use-copy-text";
import { canvasThemes } from "@/lib/canvas-theme";
import { resolveAgentMessageAssetUrl, revealAgentLocalFile } from "@/services/api/canvas-agent";
import { useAgentStore, type AgentCanvasReference, type AgentPendingApproval, type AgentSkillReference } from "@/stores/use-agent-store";
import { AgentCanvasReferencePreview, canvasReferenceIcon, canvasReferenceKindLabel } from "./agent-canvas-reference-preview";
import { agentInlineTokenClass, agentInlineTokenIconClass, agentInlineTokenMediaClass, agentReferenceMarker, parseAgentInlineTokens } from "./agent-chat-inline-tokens";

const streamdownProps = () =>
    ({
        className: "agent-streamdown",
        controls: { code: { copy: true, download: false }, table: { copy: true, download: false, fullscreen: false } },
        linkSafety: { enabled: true, renderModal: (props: LinkSafetyModalProps) => <AgentLinkModal {...props} /> },
        lineNumbers: false,
        translations: {
            close: "关闭",
            copied: "已复制",
            copyCode: "复制代码",
            copyLink: "复制链接",
            externalLinkWarning: "即将打开以下外部链接，请确认链接可信。",
            openExternalLink: "打开外部链接？",
            openLink: "继续打开",
        },
    }) as const;
const streamdownAnimation = { duration: 20, stagger: 0, sep: "word" } as const;

function AgentLinkModal({ isOpen, onClose, onConfirm, url }: LinkSafetyModalProps) {
    const { message } = useAppFeedback();
    const copyText = useCopyText();
    const localPath = localFilePath(url);
    const [opening, setOpening] = useState(false);
    const open = async () => {
        if (!localPath) return onConfirm();
        const { url: endpoint, token } = useAgentStore.getState();
        setOpening(true);
        try {
            await revealAgentLocalFile(endpoint, token, localPath);
            message.success("已在文件管理器中定位");
            onClose();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "无法打开本地文件");
        } finally {
            setOpening(false);
        }
    };
    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 420, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle>{localPath ? "打开本地文件？" : "打开外部链接？"}</DialogTitle>
                </DialogHeader>
                <div>
                    <div className="text-sm text-black/55 dark:text-white/55">{localPath ? "将在本机文件管理器中定位该路径，不会通过浏览器打开。" : "即将打开以下外部链接，请确认链接可信。"}</div>
                    <div className="mt-4 max-h-32 overflow-auto break-all rounded-lg bg-black/[.035] px-3 py-2.5 font-mono text-xs leading-5 dark:bg-white/[.06]">{localPath || url}</div>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button onClick={() => copyText(localPath || url, localPath ? "路径已复制" : "链接已复制")} type={"button"} variant={"ghost"} size="default">
                            {<Copy data-icon="inline-start" />}
                            {localPath ? "复制路径" : "复制链接"}
                        </Button>
                        <Button onClick={open} type={"button"} variant={"ghost"} size="default" disabled={Boolean(opening) || false}>
                            {opening ? <Spinner data-icon="inline-start" /> : localPath ? <FolderOpen data-icon="inline-start" /> : <ExternalLink data-icon="inline-start" />}
                            {localPath ? "在文件管理器中显示" : "继续打开"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function localFilePath(value: string) {
    let decoded = value;
    try {
        decoded = decodeURI(value);
    } catch {}
    if (decoded.startsWith("file://")) {
        try {
            return decodeURIComponent(new URL(decoded).pathname);
        } catch {
            return "";
        }
    }
    if (/^[A-Za-z]:[\\/]/.test(decoded)) return decoded;
    let pathname = decoded;
    if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        try {
            const parsed = new URL(decoded);
            if (!["localhost", "127.0.0.1"].includes(parsed.hostname)) return "";
            pathname = parsed.pathname;
        } catch {
            return "";
        }
    }
    return /^\/(?:Users|home|private|tmp|Volumes|var\/folders)\//.test(pathname) ? decodeURIComponent(pathname) : "";
}

export type AgentChatAttachment = { id: string; name: string; url: string };
export type AgentChatMessageItem = {
    id: string;
    role: "user" | "assistant" | "system" | "tool" | "error";
    title?: string;
    text: string;
    meta?: string;
    detail?: unknown;
    attachments?: AgentChatAttachment[];
    canvasReferences?: AgentCanvasReference[];
    skill?: AgentSkillReference;
    /** Present while the message is actively streaming; cleared on completion. */
    streamId?: string;
};

export function AgentChatMessage({ item, theme, onRejectTool, onApproveTool }: { item: AgentChatMessageItem; theme: (typeof canvasThemes)[keyof typeof canvasThemes]; onRejectTool?: (id: string) => void; onApproveTool?: (id: string) => void }) {
    const isUser = item.role === "user";
    const isSystem = item.role === "system";
    if (isSystem) {
        return (
            <Marker variant="separator">
                <MarkerContent>
                    {item.text}
                    {item.meta ? <span className="ml-2">{item.meta}</span> : null}
                </MarkerContent>
            </Marker>
        );
    }
    if (item.role === "tool") {
        if (objectField(item.detail, "status") === "pending") return <AgentPendingToolCard summary={item.text} detail={item.detail} theme={theme} onReject={() => onRejectTool?.(item.id)} onApprove={() => onApproveTool?.(item.id)} />;
        return <AgentToolCard title={item.title || "工具调用"} text={item.text} detail={item.detail} theme={theme} />;
    }
    return (
        <Message align={isUser ? "end" : "start"}>
            <MessageContent>
                <Bubble align={isUser ? "end" : "start"} variant={item.role === "error" ? "destructive" : isUser ? "secondary" : "ghost"}>
                    <BubbleContent>
                        {isUser ? (
                            <AgentUserMessageContent text={item.text} references={item.canvasReferences || []} skill={item.skill} theme={theme} />
                        ) : (
                            <Streamdown {...streamdownProps()} animated={streamdownAnimation} isAnimating={!!item.streamId}>
                                {item.text}
                            </Streamdown>
                        )}
                    </BubbleContent>
                </Bubble>
                {item.attachments?.length ? <AgentMessageAttachments attachments={item.attachments} alignRight={isUser} /> : null}
                {item.meta ? <MessageFooter>{item.meta}</MessageFooter> : null}
            </MessageContent>
        </Message>
    );
}

function AgentUserMessageContent({ text, references, skill, theme }: { text: string; references: AgentCanvasReference[]; skill?: AgentSkillReference; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const tokens = parseAgentInlineTokens(text, references, skill);
    return (
        <div className="whitespace-pre-wrap break-words">
            {tokens.map((token, index) =>
                token.type === "text" ? (
                    token.value
                ) : token.type === "skill" ? (
                    <AgentSkillMention key={`skill:${index}`} skill={token.skill} theme={theme} />
                ) : (
                    <AgentCanvasMention key={`${token.reference.nodeId}:${index}`} reference={token.reference} theme={theme} />
                ),
            )}
        </div>
    );
}

function AgentSkillMention({ skill, theme }: { skill: AgentSkillReference; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    return (
        <span className={agentInlineTokenClass} style={{ background: theme.toolbar.panel, borderColor: theme.node.stroke, color: theme.node.text }} title={skill.path}>
            /{skill.displayName || skill.name}
        </span>
    );
}

function AgentCanvasMention({ reference, theme }: { reference: AgentCanvasReference; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const node = useAgentStore((state) => state.canvasContext?.snapshot.nodes.find((item) => item.id === reference.nodeId));
    const endpoint = useAgentStore((state) => state.url);
    const token = useAgentStore((state) => state.token);
    const previewUrl = resolveAgentMessageAssetUrl(endpoint, token, reference.previewUrl || node?.metadata?.content || "");
    const previewText = reference.text || node?.metadata?.content || node?.metadata?.prompt;
    const Icon = canvasReferenceIcon(reference.kind);
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <span
                    tabIndex={0}
                    className={`${agentInlineTokenClass} max-w-56 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/15`}
                    style={{ background: theme.toolbar.panel, borderColor: theme.node.stroke, color: theme.node.text }}
                    aria-label={`引用${canvasReferenceKindLabel(reference.kind)}：${reference.title}`}
                >
                    {reference.kind === "image" && previewUrl ? <img src={previewUrl} alt="" className={agentInlineTokenMediaClass} /> : <Icon className={agentInlineTokenIconClass} />}
                    <span>{agentReferenceMarker(reference)}</span>
                </span>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="center">
                {<AgentCanvasReferencePreview reference={reference} previewUrl={previewUrl} previewText={previewText} theme={theme} />}
            </HoverCardContent>
        </HoverCard>
    );
}

export function AgentPendingToolCard({ summary, detail, theme, onReject, onApprove }: { summary: string; detail?: unknown; theme: (typeof canvasThemes)[keyof typeof canvasThemes]; onReject?: () => void; onApprove?: () => void }) {
    const view = userDetail(detail);
    return (
        <div className="min-w-0 rounded-xl border px-3 py-3" style={{ borderColor: "rgba(217,119,6,.28)", background: "rgba(217,119,6,.025)", color: theme.node.text }}>
            <Collapsible className="group">
                <CollapsibleTrigger className={`list-none ${view ? "cursor-pointer" : "cursor-default"}`} disabled={!view}>
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5">
                        <CircleAlert className="size-4 shrink-0 text-amber-600" />
                        <span className="min-w-0 flex-1">{"等待确认"}</span>
                        {view ? <ChevronDown className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" style={{ color: theme.node.muted }} /> : null}
                    </div>
                    <div className="mt-1 pl-6 text-sm leading-5" style={{ color: theme.node.muted }}>
                        {summary}
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    {view ? (
                        <div className="ml-6">
                            <AgentDetailBlock detail={view} theme={theme} />
                        </div>
                    ) : null}
                </CollapsibleContent>
            </Collapsible>
            {onReject || onApprove ? (
                <div className="mt-3 flex justify-end gap-2 border-t pt-3" style={{ borderColor: theme.node.stroke }}>
                    <Button onClick={() => onReject?.()} type={"button"} variant={"destructive"} size="default" className={"!h-8"}>
                        {<XCircle data-icon="inline-start" />}
                        {"拒绝执行"}
                    </Button>
                    <Button style={{ color: "#16a34a" }} onClick={() => onApprove?.()} type={"button"} variant={"ghost"} size="default" className={"!h-8"}>
                        {<CheckCircle2 data-icon="inline-start" />}
                        {"批准执行"}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

export function AgentApprovalCard({ approval, theme, onDecision }: { approval: AgentPendingApproval; theme: (typeof canvasThemes)[keyof typeof canvasThemes]; onDecision: (decision: "accept" | "acceptForSession" | "decline") => void }) {
    const isFile = approval.method === "item/fileChange/requestApproval";
    const isNetwork = Boolean(approval.networkApprovalContext);
    const title = isNetwork ? "请求网络访问" : isFile ? "请求编辑文件" : approval.method === "item/permissions/requestApproval" ? "请求扩展权限" : "请求执行命令";
    const target = isNetwork ? approvalTarget(approval.networkApprovalContext) : isFile ? approval.grantRoot || approval.cwd : commandText(approval.command) || approval.cwd;
    return (
        <div className="min-w-0 rounded-xl border px-3 py-3" style={{ borderColor: "rgba(234,88,12,.32)", background: "rgba(234,88,12,.035)", color: theme.node.text }}>
            <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-orange-600" />
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{title}</div>
                    {approval.reason ? (
                        <div className="mt-1 text-xs leading-5" style={{ color: theme.node.muted }}>
                            {approval.reason}
                        </div>
                    ) : null}
                    {target ? (
                        <div className="mt-1.5 break-all rounded-lg px-2.5 py-2 font-mono text-[11px] leading-4" style={{ background: theme.toolbar.panel, color: theme.node.text }}>
                            {target}
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t pt-3" style={{ borderColor: theme.node.stroke }}>
                <Button onClick={() => onDecision("decline")} type={"button"} variant={"destructive"} size="default" disabled={Boolean(approval.deciding === "decline") || Boolean(approval.deciding)} className={"!h-8"}>
                    {approval.deciding === "decline" ? <Spinner data-icon="inline-start" /> : null}
                    {"拒绝"}
                </Button>
                <Button onClick={() => onDecision("accept")} type={"button"} variant={"ghost"} size="default" disabled={Boolean(approval.deciding === "accept") || Boolean(approval.deciding)} className={"!h-8"}>
                    {approval.deciding === "accept" ? <Spinner data-icon="inline-start" /> : null}
                    {"允许一次"}
                </Button>
                <Button
                    style={{ color: "#ea580c" }}
                    onClick={() => onDecision("acceptForSession")}
                    type={"button"}
                    variant={"ghost"}
                    size="default"
                    disabled={Boolean(approval.deciding === "acceptForSession") || Boolean(approval.deciding)}
                    className={"!h-8"}
                >
                    {approval.deciding === "acceptForSession" ? <Spinner data-icon="inline-start" /> : null}
                    {"本会话允许"}
                </Button>
            </div>
        </div>
    );
}

export function AgentToolCard({ title, text, detail, theme }: { title: string; text: string; detail?: unknown; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const plan = planDetail(detail);
    if (plan) return <AgentPlanCard title={title} plan={plan} theme={theme} />;
    const kind = String(objectField(detail, "kind") || "");
    if (kind === "reasoning") return <AgentReasoningSummary text={text} detail={detail} theme={theme} />;
    if (kind === "command") return <AgentCommandGroup items={[{ id: title, text, detail }]} theme={theme} />;
    const state = toolCardState(title, text, detail);
    const view = userDetail(detail);
    const showText = title !== "读取画布" || text !== "已读取当前画布内容";
    const className = "group min-w-0 rounded-xl border px-3 py-2.5 text-left";
    const style = { borderColor: theme.node.stroke, background: "transparent", color: theme.node.text };
    const content = (
        <>
            <div className="flex min-w-0 items-center gap-2 text-sm leading-5">
                <span className="shrink-0" style={{ color: state.color }}>
                    {toolIcon(kind, state.icon)}
                </span>
                <span className="min-w-0 truncate font-medium">{title}</span>
                <span className="shrink-0 text-[11px]" style={{ color: state.color }}>
                    {state.label}
                </span>
                {view ? <ChevronDown className="ml-auto size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" style={{ color: theme.node.muted }} /> : null}
            </div>
            {showText ? (
                <div className={`mt-1 whitespace-pre-wrap break-words pl-6 text-sm leading-5 ${kind === "command" ? "font-mono text-[12px]" : ""}`} style={{ color: state.isError ? state.color : theme.node.muted }}>
                    {text}
                </div>
            ) : null}
        </>
    );
    if (!view)
        return (
            <div className={className} style={style}>
                {content}
            </div>
        );
    return (
        <Collapsible className={className} style={style}>
            <CollapsibleTrigger className="w-full text-left list-none cursor-pointer">{content}</CollapsibleTrigger>
            <CollapsibleContent>
                <div className="ml-6">
                    <AgentDetailBlock detail={view} theme={theme} />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function AgentReasoningSummary({ text, detail, theme }: { text: string; detail?: unknown; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const status = String(objectField(detail, "status") || "");
    const running = ["inProgress", "in_progress", "running", "started", "pending"].includes(status);
    return (
        <Collapsible className="group min-w-0 text-left">
            <CollapsibleTrigger className="w-full text-left cursor-pointer list-none py-1 text-sm" style={{ color: theme.node.muted }}>
                <div className="flex min-w-0 items-center gap-2">
                    {running ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : <Brain className="size-4 shrink-0" />}
                    <span>{running ? "正在思考" : "思考摘要"}</span>
                    <ChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="break-words pb-1 pl-6 pr-2 text-xs leading-5 [&_code]:rounded [&_code]:px-1 [&_p]:my-1 [&_pre]:my-2" style={{ color: theme.node.muted }}>
                    <Streamdown {...streamdownProps()} animated={streamdownAnimation} isAnimating={running}>
                        {text}
                    </Streamdown>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

type AgentCommandItem = Pick<AgentChatMessageItem, "id" | "text" | "detail">;

export function AgentCommandGroup({ items, theme }: { items: AgentCommandItem[]; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const states = items.map((item) => commandViewState(item.detail));
    const running = states.some((state) => state.running);
    const failed = states.filter((state) => state.failed).length;
    const expandable = items.some((item) => Boolean(item.text.trim() || userDetail(item.detail)));
    const color = running ? "#d97706" : failed ? "#dc2626" : theme.node.muted;
    const label = running ? (items.length > 1 ? `正在执行 ${items.length} 条命令` : "正在执行命令") : `已执行 ${items.length} 条命令${failed ? ` · ${failed} 条失败` : ""}`;
    const header = (
        <div className="flex min-w-0 items-center gap-2 text-sm" style={{ color }}>
            {running ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : <TerminalSquare className="size-4 shrink-0" />}
            <span className="font-medium">{label}</span>
            {expandable ? <ChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" /> : null}
        </div>
    );
    if (!expandable) return <div className="min-w-0 py-1 text-left">{header}</div>;
    return (
        <Collapsible className="group min-w-0 text-left">
            <CollapsibleTrigger className="w-full text-left cursor-pointer list-none py-1">{header}</CollapsibleTrigger>
            <CollapsibleContent>
                {items.length === 1 ? (
                    <AgentSingleCommand item={items[0]} theme={theme} />
                ) : (
                    <div className="ml-6 mt-1">
                        {items.map((item, index) => (
                            <AgentCommandEntry key={item.id} item={item} index={index} theme={theme} />
                        ))}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

function AgentSingleCommand({ item, theme }: { item: AgentCommandItem; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const view = userDetail(item.detail);
    return (
        <div className="ml-6 pb-1">
            {item.text ? (
                <div className="mt-1.5 whitespace-pre-wrap break-all font-mono text-[11px] leading-5" style={{ color: theme.node.text }}>
                    {item.text}
                </div>
            ) : null}
            {view ? <AgentDetailBlock detail={view} theme={theme} /> : null}
        </div>
    );
}

function AgentCommandEntry({ item, index, theme }: { item: AgentCommandItem; index: number; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const [open, setOpen] = useState(false);
    const detailId = useId();
    const view = userDetail(item.detail);
    const state = commandViewState(item.detail);
    const status = state.failed ? "执行失败" : state.running ? "进行中" : "已完成";
    const color = state.failed ? "#dc2626" : state.running ? "#d97706" : "#16a34a";
    const content = (
        <>
            <span className="w-4 shrink-0 text-center text-[10px] tabular-nums opacity-50" style={{ color: theme.node.muted }}>
                {index + 1}
            </span>
            <code className="min-w-0 flex-1 truncate text-[11px] leading-5" style={{ color: theme.node.text }} title={item.text}>
                {item.text || "命令"}
            </code>
            <span className="shrink-0" style={{ color }} title={status} aria-label={status}>
                {state.running ? <LoaderCircle className="size-3.5 animate-spin" /> : state.failed ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
            </span>
            {view ? <ChevronRight className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} style={{ color: theme.node.muted }} /> : null}
        </>
    );
    return (
        <div className={index ? "border-t" : ""} style={{ borderColor: theme.node.stroke }}>
            {view ? (
                <Button variant="ghost" type="button" className="flex w-full min-w-0 items-center gap-2 py-2 text-left" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((value) => !value)}>
                    {content}
                </Button>
            ) : (
                <div className="flex min-w-0 items-center gap-2 py-2 text-left">{content}</div>
            )}
            {view && open ? (
                <div id={detailId} className="pb-2 pl-6">
                    <AgentDetailBlock detail={view} theme={theme} />
                </div>
            ) : null}
        </div>
    );
}

function commandViewState(detail: unknown) {
    const status = String(objectField(detail, "status") || "").toLowerCase();
    return {
        running: ["inprogress", "in_progress", "running", "started", "pending"].includes(status),
        failed: ["failed", "error"].includes(status),
    };
}

function AgentPlanCard({ title, plan, theme }: { title: string; plan: PlanDetail; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const [open, setOpen] = useState(true);
    const completed = plan.tasks.filter((item) => item.status === "completed").length;
    const state = planCardState(plan, completed);
    return (
        <Collapsible open={open} onOpenChange={setOpen} className="group min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-left" style={{ borderColor: theme.node.stroke, background: "transparent", color: theme.node.text }}>
            <CollapsibleTrigger className="w-full text-left flex min-w-0 cursor-pointer list-none items-center gap-2.5">
                <ListChecks className="size-4 shrink-0" style={{ color: state.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                <span className="shrink-0 text-[11px]" style={{ color: state.color }}>
                    {state.label}
                </span>
                <span aria-live="polite" className="shrink-0 text-[11px] tabular-nums" style={{ color: theme.node.muted }}>
                    {completed}/{plan.tasks.length}
                </span>
                <ChevronDown className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" style={{ color: theme.node.muted }} />
            </CollapsibleTrigger>
            <CollapsibleContent>
                {plan.explanation ? (
                    <div className="mt-1.5 text-xs leading-5" style={{ color: theme.node.muted }}>
                        {plan.explanation}
                    </div>
                ) : null}
                <div className="mt-2.5 flex flex-col gap-2 border-t pt-2.5" style={{ borderColor: theme.node.stroke }}>
                    {plan.tasks.map((item, index) => {
                        const task = planTaskState(item.status, theme.node.muted);
                        return (
                            <div key={`${index}-${item.step}`} className="flex items-start gap-2 text-sm leading-5">
                                <span className="mt-0.5 shrink-0" style={{ color: task.color }}>
                                    {task.icon}
                                </span>
                                <span className={`min-w-0 flex-1 ${item.status === "completed" ? "opacity-55" : item.status === "inProgress" ? "font-medium" : ""}`} style={{ color: item.status === "inProgress" ? theme.node.text : theme.node.muted }}>
                                    {item.step}
                                </span>
                                <span className="shrink-0 text-[11px]" style={{ color: task.color }}>
                                    {task.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function AgentWorkingMessage({
    text,
    detail,
    status = "running",
    mcpStatuses = [],
    activityKey,
    theme,
}: {
    text: string;
    detail?: string;
    status?: "running" | "ready" | "error";
    mcpStatuses?: Array<{ name: string; status: "running" | "ready" | "error"; detail: string }>;
    activityKey: string;
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
}) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const startedAt = Date.now();
        setElapsed(0);
        const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => window.clearInterval(timer);
    }, [activityKey]);
    return (
        <div className="min-w-0 py-1" aria-live="polite">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: theme.node.muted }}>
                {status === "running" ? <LoaderCircle className="size-3.5 shrink-0 animate-spin" /> : status === "ready" ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" /> : <XCircle className="size-3.5 shrink-0 text-red-600" />}
                <span className="min-w-0">{text}</span>
                {status === "running" && elapsed >= 5 ? <span className="shrink-0 text-[11px] tabular-nums opacity-60">{waitingTime(elapsed)}</span> : null}
            </div>
            {detail ? (
                <div className="ml-5.5 mt-1 text-xs leading-5 opacity-65" style={{ color: theme.node.muted }}>
                    {detail}
                </div>
            ) : null}
            {mcpStatuses.length ? (
                <div className="ml-5.5 mt-3 flex flex-col gap-2">
                    {mcpStatuses.map((item) => (
                        <div key={item.name} className="flex min-w-0 items-start gap-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                            {item.status === "running" ? (
                                <LoaderCircle className="mt-0.5 size-3.5 shrink-0 animate-spin" />
                            ) : item.status === "ready" ? (
                                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                            ) : (
                                <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-600" />
                            )}
                            <div className="min-w-0">
                                <div className="font-medium" style={{ color: theme.node.text }}>
                                    {item.name}
                                </div>
                                <div className="opacity-65">{item.detail}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
            {status === "running" && elapsed >= 30 ? (
                <div className="mt-1 text-xs leading-5 opacity-65" style={{ color: theme.node.muted }}>
                    {"响应时间较长，但任务仍在运行。可以继续等待，或点击输入框右侧的停止按钮结束本轮。"}
                </div>
            ) : null}
        </div>
    );
}

function waitingTime(seconds: number) {
    if (seconds < 60) return `已等待 ${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    return `已等待 ${minutes} 分 ${seconds % 60} 秒`;
}

function commandText(value: unknown) {
    if (Array.isArray(value)) return value.map(String).join(" ");
    return typeof value === "string" ? value : "";
}

function approvalTarget(value: unknown) {
    const host = String(objectField(value, "host") || "");
    const protocol = String(objectField(value, "protocol") || "");
    const port = String(objectField(value, "port") || "");
    return host ? `${protocol ? `${protocol}://` : ""}${host}${port ? `:${port}` : ""}` : "";
}

type PlanTask = { step: string; status: string };
type PlanDetail = { status: string; tasks: PlanTask[]; explanation?: string };
type UserDetail = { kind?: string; status?: string; rows?: Array<{ label: string; value: string }>; output?: string; files?: Array<{ path: string; action?: string }> };

function AgentDetailBlock({ detail, theme }: { detail: UserDetail; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    return (
        <div className="mt-3 flex flex-col gap-2.5 border-t pt-3 text-xs" style={{ borderColor: theme.node.stroke, color: theme.node.muted }}>
            {detail.rows?.length ? (
                <dl className="flex flex-col gap-1.5">
                    {detail.rows.map((row) => (
                        <div key={`${row.label}-${row.value}`} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
                            <dt className="opacity-60">{row.label}</dt>
                            <dd className="min-w-0 break-words" style={{ color: theme.node.text }}>
                                {row.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : null}
            {detail.files?.length ? (
                <div className="flex flex-col gap-1.5">
                    <div className="opacity-60">{"涉及文件"}</div>
                    {detail.files.map((file) => (
                        <div key={`${file.action}-${file.path}`} className="flex items-start gap-2">
                            <FileText className="mt-0.5 size-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 break-all" style={{ color: theme.node.text }}>
                                {file.path}
                            </span>
                            {file.action ? <span className="shrink-0 opacity-60">{file.action}</span> : null}
                        </div>
                    ))}
                </div>
            ) : null}
            {detail.output ? (
                <div className="flex flex-col gap-1.5">
                    <div className="opacity-60">{detail.status === "failed" || detail.status === "error" ? "错误信息" : "运行输出"}</div>
                    <pre className="thin-scrollbar max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg px-3 py-2 font-mono text-[11px] leading-4" style={{ background: theme.toolbar.panel, color: theme.node.text }}>
                        {detail.output}
                    </pre>
                </div>
            ) : null}
        </div>
    );
}

function AgentMessageAttachments({ attachments, alignRight }: { attachments: AgentChatAttachment[]; alignRight?: boolean }) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    return (
        <>
            <AttachmentGroup className={alignRight ? "justify-end" : undefined}>
                {attachments.map((item) => (
                    <Attachment key={item.id} size="sm" orientation="vertical">
                        <AttachmentMedia variant="image">
                            <img src={item.url} alt={item.name} draggable={false} />
                        </AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>{item.name}</AttachmentTitle>
                        </AttachmentContent>
                        <AttachmentTrigger aria-label={`预览：${item.name}`} onClick={() => setPreviewUrl(item.url)} />
                    </Attachment>
                ))}
            </AttachmentGroup>
            {previewUrl ? (
                <div className="hidden">
                    <MediaPreview src={previewUrl} alt={"图片附件预览"} previewSrc={previewUrl} open={true} onOpenChange={(visible) => !visible && setPreviewUrl(null)} />
                </div>
            ) : null}
        </>
    );
}

function toolCardState(title: string, text: string, detail?: unknown) {
    const raw = `${title} ${text} ${normalizeText(objectField(detail, "error"))}`;
    const lower = raw.toLowerCase();
    const status = String(objectField(detail, "status") || "").toLowerCase();
    if (status === "noop" || /未生效|无需|没有找到|没有.*可|已存在/.test(raw)) return { label: "未生效", color: "#d97706", icon: <CircleAlert className="size-4" />, isError: false };
    if (["declined", "rejected", "cancelled", "canceled"].includes(status) || /拒绝|取消/.test(raw)) return { label: "已取消", color: "#dc2626", icon: <XCircle className="size-4" />, isError: true };
    if (["failed", "error"].includes(status) || /失败|错误/.test(raw) || lower.includes("failed") || lower.includes("error")) return { label: "执行失败", color: "#dc2626", icon: <XCircle className="size-4" />, isError: true };
    if (["inprogress", "in_progress", "running", "started", "pending"].includes(status)) return { label: "进行中", color: "#d97706", icon: <LoaderCircle className="size-4 animate-spin" />, isError: false };
    if (["completed", "succeeded", "success"].includes(status) || /完成|成功/.test(raw)) return { label: "已完成", color: "#16a34a", icon: <CheckCircle2 className="size-4" />, isError: false };
    return { label: "已记录", color: "#2563eb", icon: <Wrench className="size-4" />, isError: false };
}

function toolIcon(kind: string | undefined, fallback: ReactNode) {
    if (kind === "search") return <Search className="size-4" />;
    if (kind === "file") return <FilePenLine className="size-4" />;
    if (kind === "plan") return <ListChecks className="size-4" />;
    return fallback;
}

function planCardState(plan: PlanDetail, completed: number) {
    if (plan.status === "failed") return { label: "执行失败", color: "#dc2626" };
    if (["interrupted", "cancelled", "canceled"].includes(plan.status)) return { label: "已停止", color: "#d97706" };
    if (completed === plan.tasks.length) return { label: "已完成", color: "#16a34a" };
    if (plan.status === "finished") return { label: "已结束", color: "#2563eb" };
    return { label: "进行中", color: "#d97706" };
}

function planTaskState(status: string, muted: string) {
    if (status === "completed") return { label: "已完成", color: "#16a34a", icon: <CheckCircle2 className="size-3.5" /> };
    if (status === "inProgress") return { label: "进行中", color: "#d97706", icon: <LoaderCircle className="size-3.5 animate-spin" /> };
    return { label: "待处理", color: muted, icon: <Circle className="size-3.5" /> };
}

function planDetail(value: unknown): PlanDetail | null {
    if (!value || typeof value !== "object" || objectField(value, "kind") !== "todo") return null;
    const tasks = Array.isArray(objectField(value, "tasks"))
        ? (objectField(value, "tasks") as unknown[]).flatMap((item) => {
              const step = String(objectField(item, "step") || "").trim();
              return step ? [{ step, status: String(objectField(item, "status") || "pending") }] : [];
          })
        : [];
    if (!tasks.length) return null;
    const explanation = String(objectField(value, "explanation") || "").trim();
    return { status: String(objectField(value, "status") || "inProgress"), tasks, ...(explanation ? { explanation } : {}) };
}

function userDetail(value: unknown): UserDetail | null {
    if (!value || typeof value !== "object") return null;
    const detail = value as Record<string, unknown>;
    const rows = Array.isArray(detail.rows)
        ? detail.rows.flatMap((row) => {
              if (!row || typeof row !== "object") return [];
              const label = String((row as Record<string, unknown>).label || "");
              const value = String((row as Record<string, unknown>).value || "");
              return label && value ? [{ label, value }] : [];
          })
        : [];
    const files = Array.isArray(detail.files)
        ? detail.files.flatMap((file) => {
              if (!file || typeof file !== "object") return [];
              const path = String((file as Record<string, unknown>).path || "");
              return path ? [{ path, action: String((file as Record<string, unknown>).action || "") || undefined }] : [];
          })
        : [];
    const error = objectField(detail.error, "message");
    const output = typeof detail.output === "string" ? detail.output.trim() : typeof error === "string" ? error : "";
    if (!rows.length && !files.length && !output) return null;
    return { kind: typeof detail.kind === "string" ? detail.kind : undefined, status: typeof detail.status === "string" ? detail.status : undefined, rows, files, output };
}

function normalizeText(value: unknown) {
    if (typeof value === "string") return value.trim();
    if (value instanceof Error) return value.message;
    if (value == null) return "";
    return String(objectField(value, "message") || "");
}

function objectField(value: unknown, key: string) {
    return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}
