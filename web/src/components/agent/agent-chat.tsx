import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { motion, useSpring, useTransform } from "motion/react";
import { memo, useEffect, useMemo } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { summarizeCanvasAgentOps } from "@/lib/canvas/canvas-agent-ops";
import { useAgentStore, type AgentChatItem, type AgentPendingApproval, type AgentPendingToolCall, type AgentTokenUsage } from "@/stores/use-agent-store";
import { AgentApprovalCard, AgentChatMessage, AgentCommandGroup, AgentPendingToolCard, AgentToolCard, AgentWorkingMessage } from "./agent-chat-message";
import { agentMessageToChatMessage, currentPlanMessage, isPlanMessage, latestPlanMessage, toolCallDetail, toolName, workingActivity } from "./agent-event-formatters";

const historyMessageStyle = { contentVisibility: "auto", containIntrinsicSize: "0 80px" } as const;

export function AgentChatTimeline({
    theme,
    pendingTool,
    pendingApprovals,
    sending,
    waiting,
    onRejectTool,
    onApproveTool,
    onApprovalDecision,
}: {
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    pendingTool: AgentPendingToolCall | null;
    pendingApprovals: AgentPendingApproval[];
    sending: boolean;
    waiting: boolean;
    onRejectTool: () => void;
    onApproveTool: () => void;
    onApprovalDecision: (approval: AgentPendingApproval, decision: "accept" | "acceptForSession" | "decline") => void;
}) {
    const messages = useAgentStore((state) => state.messages);
    const bootstrapStatus = useAgentStore((state) => state.bootstrapStatus);
    const mcpStartupStatuses = useAgentStore((state) => state.mcpStartupStatuses);
    const timeline = useMemo(() => groupTimelineMessages(messages), [messages]);
    const threadId = useAgentStore((state) => state.activeThreadId);
    const streaming = messages.some((message) => message.streamId);
    const showBootstrap = Boolean(bootstrapStatus && !messages.some((message) => message.role === "user" || message.role === "assistant"));
    const working = showBootstrap ? bootstrapStatus! : workingActivity(messages.at(-1));
    return (
        <MessageScrollerProvider key={threadId || "new"} autoScroll defaultScrollPosition="end">
            <MessageScroller className="min-h-0 flex-1">
                <MessageScrollerViewport aria-label="对话消息">
                    <MessageScrollerContent className="gap-4 p-4">
                        {timeline.map((entry) => (
                            <MessageScrollerItem key={entry.type === "commands" ? entry.id : entry.item.id} messageId={entry.type === "commands" ? entry.id : entry.item.id} scrollAnchor={entry.type === "message" && entry.item.role === "user"}>
                                {entry.type === "commands" ? <AgentCommandGroupRow items={entry.items} theme={theme} /> : <AgentChatMessageRow item={entry.item} theme={theme} />}
                            </MessageScrollerItem>
                        ))}
                        {pendingTool ? (
                            <AgentPendingToolCard
                                summary={summarizeCanvasAgentOps(pendingTool.input?.ops || []) || toolName(pendingTool.name)}
                                detail={toolCallDetail(pendingTool.name, pendingTool.input, "pending")}
                                theme={theme}
                                onReject={onRejectTool}
                                onApprove={onApproveTool}
                            />
                        ) : null}
                        {pendingApprovals.map((approval) => (
                            <AgentApprovalCard key={approval.requestId} approval={approval} theme={theme} onDecision={(decision) => onApprovalDecision(approval, decision)} />
                        ))}
                        {(sending || waiting || showBootstrap) && !streaming && !pendingTool && !pendingApprovals.length ? (
                            <AgentWorkingMessage
                                text={working.text}
                                detail={"detail" in working && typeof working.detail === "string" ? working.detail : undefined}
                                status={showBootstrap ? bootstrapStatus?.status : undefined}
                                mcpStatuses={showBootstrap ? Object.entries(mcpStartupStatuses).map(([name, item]) => ({ name, ...item })) : []}
                                activityKey={working.key}
                                theme={theme}
                            />
                        ) : null}
                    </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton aria-label="查看最新消息" />
            </MessageScroller>
        </MessageScrollerProvider>
    );
}

export function AgentTaskProgress({ theme, busy }: { theme: (typeof canvasThemes)[keyof typeof canvasThemes]; busy: boolean }) {
    const plan = useAgentStore((state) => (busy ? currentPlanMessage(state.messages) : latestPlanMessage(state.messages)));
    if (!plan) return null;
    return (
        <div className="shrink-0 px-4 pt-2">
            <AgentToolCard key={plan.id} title={plan.title || "任务进度"} text={plan.text} detail={plan.detail} theme={theme} />
        </div>
    );
}

const AgentChatMessageRow = memo(function AgentChatMessageRow({ item, theme }: { item: AgentChatItem; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    const endpoint = useAgentStore((state) => state.url);
    const token = useAgentStore((state) => state.token);
    return (
        <div style={item.streamId ? undefined : historyMessageStyle}>
            <AgentChatMessage item={agentMessageToChatMessage(item, endpoint, token)} theme={theme} />
        </div>
    );
});

const AgentCommandGroupRow = memo(function AgentCommandGroupRow({ items, theme }: { items: AgentChatItem[]; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    return (
        <div style={items.some((item) => item.streamId) ? undefined : historyMessageStyle}>
            <AgentCommandGroup items={items} theme={theme} />
        </div>
    );
});

type AgentTimelineEntry = { type: "message"; item: AgentChatItem } | { type: "commands"; id: string; items: AgentChatItem[] };

function groupTimelineMessages(messages: AgentChatItem[]) {
    const timeline: AgentTimelineEntry[] = [];
    let commands: AgentChatItem[] = [];
    let commandScope = "";
    const flushCommands = () => {
        if (!commands.length) return;
        timeline.push({ type: "commands", id: `commands:${commands[0].id}`, items: commands });
        commands = [];
        commandScope = "";
    };
    messages.forEach((item) => {
        if (isPlanMessage(item)) return;
        if (isCommandMessage(item)) {
            const scope = item.threadId && item.turnId ? `${item.threadId}\0${item.turnId}` : item.id;
            if (commands.length && scope !== commandScope) flushCommands();
            commands.push(item);
            commandScope = scope;
            return;
        }
        flushCommands();
        timeline.push({ type: "message", item });
    });
    flushCommands();
    return timeline;
}

function isCommandMessage(item: AgentChatItem) {
    return item.role === "tool" && item.detail && typeof item.detail === "object" && (item.detail as { kind?: unknown }).kind === "command";
}

export function AgentUsageBar({ usage, theme }: { usage: AgentTokenUsage; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    return (
        <div className="flex items-center justify-center gap-4 px-4 pt-1 text-[11px] tabular-nums" style={{ color: theme.node.muted }}>
            <span className="opacity-70">{"最新调用"}</span>
            <UsageNumber label={"输入"} value={usage.input} color={theme.node.text} />
            <UsageNumber label={"缓存"} value={usage.cached} color={theme.node.text} />
            <UsageNumber label={"输出"} value={usage.output} color={theme.node.text} />
        </div>
    );
}

function UsageNumber({ label, value, color }: { label: string; value: number; color: string }) {
    const spring = useSpring(value, { stiffness: 110, damping: 24, mass: 0.7 });
    const text = useTransform(spring, (current) => Math.round(current).toLocaleString());
    useEffect(() => spring.set(value), [spring, value]);
    return (
        <span className="inline-flex items-baseline gap-1" aria-label={`${label} ${value.toLocaleString()}`}>
            <span>{label}</span>
            <motion.span aria-hidden className="font-medium" style={{ color }}>
                {text}
            </motion.span>
        </span>
    );
}
