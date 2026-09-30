import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Image as ImageIcon, Music2, Plus, Puzzle, Video, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { getGroupResourceNodes } from "@/lib/canvas/canvas-resource-references";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { getImagePreviewRevision, previewUrlFor, subscribeImagePreviews } from "@/services/image-storage";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

export function CanvasNodeReferenceBar({
    nodeId,
    nodes,
    connectedNodes,
    onDisconnect,
    onStartSelection,
}: {
    nodeId: string;
    nodes: CanvasNodeData[];
    connectedNodes: CanvasNodeData[];
    onDisconnect?: (fromNodeId: string, toNodeId: string) => void;
    onStartSelection?: (nodeId: string) => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const references = connectedNodes.flatMap((sourceNode) => (sourceNode.type === CanvasNodeType.Group ? getGroupResourceNodes(sourceNode.id, nodes) : [sourceNode]).map((node) => ({ node, sourceNodeId: sourceNode.id })));
    if (!references.length)
        return (
            <Button variant="ghost" size="sm" className="self-start" aria-label="从画布选择参考节点" onClick={() => onStartSelection?.(nodeId)}>
                <Plus data-icon="inline-start" aria-hidden />
                参考
            </Button>
        );
    return (
        <div className="mb-2">
            <div className="mb-1.5 text-[11px] font-medium" style={{ color: theme.node.muted }}>
                {"参考内容"}
            </div>
            <div className="thin-scrollbar flex min-h-12 gap-2 overflow-x-auto pb-1">
                {references.map(({ node, sourceNodeId }) => (
                    <ReferenceItem key={`${sourceNodeId}:${node.id}`} node={node} onRemove={() => onDisconnect?.(sourceNodeId, nodeId)} />
                ))}
                <Button
                    variant="ghost"
                    type="button"
                    className="grid size-12 shrink-0 place-items-center rounded-xl border bg-transparent transition hover:opacity-70"
                    style={{ borderColor: theme.toolbar.border, color: theme.node.muted }}
                    aria-label={"从画布选择参考节点"}
                    onClick={() => onStartSelection?.(nodeId)}
                >
                    <Plus data-icon="inline-start" aria-hidden />
                </Button>
            </div>
        </div>
    );
}

function ReferenceItem({ node, onRemove }: { node: CanvasNodeData; onRemove: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision);
    const resource = getNodeDefinition(node.type)?.resource?.(node);
    const content = node.metadata?.content || resource?.url;
    const thumbnail = previewUrlFor(node.metadata?.storageKey) || content;
    const Icon =
        resource?.kind === "image" || node.type === CanvasNodeType.Image
            ? ImageIcon
            : resource?.kind === "video" || node.type === CanvasNodeType.Video
              ? Video
              : resource?.kind === "audio" || node.type === CanvasNodeType.Audio
                ? Music2
                : resource?.kind === "text" || node.type === CanvasNodeType.Text
                  ? FileText
                  : Puzzle;
    return (
        <Popover>
            <div className="group relative grid size-12 shrink-0 place-items-center rounded-xl border" style={{ borderColor: theme.toolbar.border }}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="grid size-full overflow-hidden p-0" aria-label={`预览参考：${node.title}`}>
                        {(resource?.kind === "image" || node.type === CanvasNodeType.Image) && thumbnail ? (
                            <img src={thumbnail} alt="" className="size-full object-cover" />
                        ) : (resource?.kind === "video" || node.type === CanvasNodeType.Video) && content ? (
                            <video src={content} className="size-full object-cover" muted />
                        ) : (
                            <Icon data-icon="inline-start" className="opacity-65" aria-hidden />
                        )}
                    </Button>
                </PopoverTrigger>
                <Button
                    variant="ghost"
                    type="button"
                    size="icon-xs"
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                    aria-label={"断开参考连接"}
                    title={"断开参考连接"}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                    }}
                >
                    <X data-icon="inline-start" aria-hidden />
                </Button>
            </div>
            <PopoverContent side="top" align="start">
                {<ReferencePreview node={node} content={content} />}
            </PopoverContent>
        </Popover>
    );
}

function ReferencePreview({ node, content }: { node: CanvasNodeData; content?: string }) {
    const resource = getNodeDefinition(node.type)?.resource?.(node);
    if ((resource?.kind === "image" || node.type === CanvasNodeType.Image) && content) return <img src={content} alt={node.title} className="max-h-52 w-72 rounded-lg object-contain" />;
    if ((resource?.kind === "video" || node.type === CanvasNodeType.Video) && content) return <video src={content} className="max-h-52 w-72 rounded-lg" muted controls />;
    if ((resource?.kind === "audio" || node.type === CanvasNodeType.Audio) && content) return <audio src={content} className="w-72" controls />;
    return <div className="max-h-52 w-72 overflow-auto whitespace-pre-wrap text-sm">{resource?.text || node.metadata?.content || node.metadata?.prompt || node.title || "暂无内容"}</div>;
}
