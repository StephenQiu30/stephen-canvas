import { createCanvasNode } from "@/lib/canvas/canvas-node-factory";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeMetadata } from "@/types/canvas";
import type { ReferenceImage } from "@/types/image";
import { useCanvasGenerationStore } from "@/stores/canvas/use-canvas-generation-store";

export function savePageGeneration(record: {
    id: string;
    createdAt: number;
    mode: "image" | "video";
    prompt: string;
    parameters: CanvasNodeMetadata;
    references: ReferenceImage[];
    results: CanvasNodeData[];
    status: "loading" | "success" | "error";
    error?: string;
}) {
    const source = { ...createCanvasNode(record.mode === "image" ? CanvasNodeType.Image : CanvasNodeType.Video, { x: 0, y: 0 }, { ...record.parameters, prompt: record.prompt, composerContent: record.prompt }), id: `${record.mode}:${record.id}:source` };
    const references = record.references.map((reference, index) => ({
        ...createCanvasNode(CanvasNodeType.Image, { x: -400, y: index * 400 }, { content: reference.dataUrl || reference.url, storageKey: reference.storageKey, mimeType: reference.type, status: "success" }),
        id: reference.id,
        title: reference.name,
    }));
    useCanvasGenerationStore.getState().save({
        id: `${record.mode}:${record.id}`,
        createdAt: new Date(record.createdAt).toISOString(),
        projectTitle: record.mode === "image" ? "图片创作" : "视频创作",
        mode: record.mode,
        prompt: record.prompt,
        parameters: record.parameters,
        source,
        references,
        connections: references.map((reference) => ({ id: `${reference.id}-${source.id}`, fromNodeId: reference.id, toNodeId: source.id })),
        targetIds: record.results.map((node) => node.id),
        results: record.results,
        status: record.status,
        error: record.error,
    });
}
