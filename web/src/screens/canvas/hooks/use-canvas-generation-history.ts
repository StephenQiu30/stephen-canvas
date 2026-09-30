import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { buildGenerationConfig } from "@/lib/canvas/canvas-generation-helpers";
import { selectionWithChildren } from "@/lib/canvas/canvas-node-actions";
import { generationParameters, useCanvasGenerationStore } from "@/stores/canvas/use-canvas-generation-store";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useEffectiveConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasConnection, type CanvasGenerationMode, type CanvasNodeData, type CanvasNodeMetadata } from "@/types/canvas";

export type GenerationHistorySeed = { mode?: CanvasGenerationMode; prompt?: string; parameters?: CanvasNodeMetadata; references?: CanvasNodeData[]; nodes?: CanvasNodeData[]; connections?: CanvasConnection[] };
type Run = { id: string; sourceId: string; mode: CanvasGenerationMode; targets: Set<string>; active: Set<string>; initialContent?: string; error?: string };

function generationResults(nodes: CanvasNodeData[], run: Run, interrupted: boolean) {
    return nodes.flatMap((node): CanvasNodeData[] => {
        const metadata = node.metadata;
        if (!metadata || !run.targets.has(node.id) || (node.type !== run.mode && !(node.id === run.sourceId && getNodeDefinition(node.type)?.useBuiltinPanel?.writeBackToSelf))) return [];
        if ((run.targets.size > 1 && node.id === run.sourceId) || ((run.error || interrupted) && node.id === run.sourceId && metadata.content === run.initialContent)) return [];
        const images = run.mode === "image" ? metadata.images?.filter((image) => image.status === "success" && image.content) : undefined;
        const texts = run.mode === "text" ? metadata.texts?.filter((text) => text.status === "success" && text.content) : undefined;
        if (metadata.status !== "success" && !images?.length && !texts?.length) return [];
        const image = images?.find((item) => item.id === metadata.primaryImageId) || images?.[0];
        const text = texts?.find((item) => item.id === metadata.primaryTextId) || texts?.[0];
        if (!image && !text && !metadata.content) return [];
        return [
            {
                ...node,
                metadata: {
                    ...metadata,
                    status: "success",
                    errorDetails: undefined,
                    ...(image ? { content: image.content, storageKey: image.storageKey, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, bytes: image.bytes, mimeType: image.mimeType, images, primaryImageId: image.id } : {}),
                    ...(text ? { content: text.content, texts, primaryTextId: text.id } : {}),
                },
            },
        ];
    });
}

export function useCanvasGenerationHistory(projectId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const config = useEffectiveConfig();
    const current = useRef({ nodes, connections, config });
    useLayoutEffect(() => {
        current.current = { nodes, connections, config };
    }, [nodes, connections, config]);
    const runs = useRef(new Map<AbortController, Run>());
    const [revision, setRevision] = useState(0);
    const hydrated = useCanvasGenerationStore((state) => state.hydrated);

    const start = useCallback(
        (controller: AbortController, targetId: string, sourceId: string, seed: GenerationHistorySeed = {}) => {
            let run = runs.current.get(controller);
            if (!run) {
                const { config } = current.current;
                const nodes = seed.nodes || current.current.nodes;
                const connections = seed.connections || current.current.connections;
                const source = nodes.find((node) => node.id === sourceId);
                if (!source) return;
                const mode = seed.mode || source.metadata?.generationMode || (source.type === CanvasNodeType.Video ? "video" : source.type === CanvasNodeType.Audio ? "audio" : source.type === CanvasNodeType.Text ? "text" : "image");
                const ids = new Set([sourceId]);
                for (let changed = true; changed; ) {
                    changed = false;
                    connections.forEach((edge) => {
                        if (ids.has(edge.toNodeId) && !ids.has(edge.fromNodeId)) {
                            ids.add(edge.fromNodeId);
                            changed = true;
                        }
                    });
                }
                const referenceIds = selectionWithChildren(nodes, ids);
                const references = [...nodes.filter((node) => referenceIds.has(node.id) && node.id !== sourceId), ...(seed.references || []).filter((node) => node.id !== sourceId)];
                const referenceEdges = connections.filter((edge) => referenceIds.has(edge.fromNodeId) && referenceIds.has(edge.toNodeId));
                (seed.references || []).forEach((node) => {
                    if (node.id !== sourceId && !referenceEdges.some((edge) => edge.fromNodeId === node.id && edge.toNodeId === sourceId)) referenceEdges.push({ id: `${node.id}-${sourceId}`, fromNodeId: node.id, toNodeId: sourceId });
                });
                const existing = source.metadata?.videoTaskId ? useCanvasGenerationStore.getState().records.find((record) => record.projectId === projectId && record.targetIds.includes(targetId)) : undefined;
                const id = useCanvasGenerationStore.getState().save({
                    ...(existing ? { id: existing.id, createdAt: existing.createdAt } : {}),
                    projectId,
                    projectTitle: useCanvasStore.getState().projects.find((project) => project.id === projectId)?.title || "画布",
                    mode,
                    prompt: seed.prompt ?? source.metadata?.prompt ?? "",
                    parameters: seed.parameters || generationParameters(buildGenerationConfig(config, source, mode)),
                    source: structuredClone(existing?.source || source),
                    references: structuredClone(existing?.references || [...new Map(references.map((node) => [node.id, node])).values()]),
                    connections: structuredClone(existing?.connections || referenceEdges),
                    targetIds: [targetId],
                    results: [],
                    status: "loading",
                });
                run = { id, sourceId, mode, targets: new Set(), active: new Set(), initialContent: source.metadata?.content };
                runs.current.set(controller, run);
            }
            run.targets.add(targetId);
            run.active.add(targetId);
            useCanvasGenerationStore.getState().update(run.id, { targetIds: [...run.targets] });
            setRevision((value) => value + 1);
        },
        [projectId],
    );

    const finish = useCallback((controller: AbortController, targetId: string, error?: string) => {
        const run = runs.current.get(controller);
        if (!run) return;
        run.active.delete(targetId);
        if (error) run.error = error;
        setRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        runs.current.forEach((run, controller) => {
            if (run.active.size && !controller.signal.aborted) return;
            const targets = nodes.filter((node) => run.targets.has(node.id));
            if (!controller.signal.aborted && targets.some((node) => node.metadata?.status === "loading") && !run.error) return;
            const results = generationResults(targets, run, controller.signal.aborted);
            const error =
                run.error ||
                targets
                    .flatMap((node) => [
                        node.metadata?.errorDetails,
                        ...(node.metadata?.images || []).filter((image) => image.status === "error").map((image) => image.errorDetails),
                        ...(node.metadata?.texts || []).filter((text) => text.status === "error").map((text) => text.errorDetails),
                    ])
                    .find(Boolean);
            useCanvasGenerationStore.getState().update(run.id, {
                results: structuredClone(results),
                status: controller.signal.aborted ? "canceled" : results.length ? "success" : "error",
                error: controller.signal.aborted ? "请求已取消" : error || (results.length ? undefined : "未返回生成结果"),
            });
            runs.current.delete(controller);
        });
    }, [hydrated, nodes, revision]);

    useEffect(
        () => () => {
            runs.current.forEach((run, controller) => {
                controller.abort();
                useCanvasGenerationStore.getState().update(run.id, { status: "canceled", error: "已离开画布，当前请求已中断", results: structuredClone(generationResults(current.current.nodes, run, true)) });
            });
            runs.current.clear();
        },
        [projectId],
    );

    return { start, finish };
}
