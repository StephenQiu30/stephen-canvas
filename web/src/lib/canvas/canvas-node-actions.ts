import { nanoid } from "nanoid";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type Position } from "@/types/canvas";
import { getGroupWrapRect } from "./canvas-node-geometry";

export type CanvasLayoutAction = "arrange" | "left" | "right" | "top" | "bottom" | "horizontal" | "vertical";

export function selectionWithChildren(nodes: CanvasNodeData[], ids: Set<string>) {
    return new Set([...ids, ...nodes.filter((node) => node.metadata?.groupId && ids.has(node.metadata.groupId)).map((node) => node.id)]);
}

export function cloneCanvasSelection(nodes: CanvasNodeData[], connections: CanvasConnection[], ids: Set<string>, offset: Position) {
    const selected = selectionWithChildren(nodes, ids);
    const idMap = new Map(nodes.filter((node) => selected.has(node.id)).map((node) => [node.id, nanoid()]));
    const copies = nodes
        .filter((node) => selected.has(node.id))
        .map((node) => ({
            ...structuredClone(node),
            id: idMap.get(node.id)!,
            title: `${node.title || "节点"} 副本`,
            position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
            metadata: node.metadata
                ? {
                      ...structuredClone(node.metadata),
                      groupId: node.metadata.groupId ? idMap.get(node.metadata.groupId) : undefined,
                      status: node.metadata.status === "loading" ? ("idle" as const) : node.metadata.status,
                      videoTaskId: undefined,
                      videoTaskProvider: undefined,
                      images: node.metadata.images?.map((image) => (image.status === "loading" ? { ...image, status: "error" as const, errorDetails: "复制时该结果尚未完成" } : image)),
                      texts: node.metadata.texts?.map((text) => (text.status === "loading" ? { ...text, status: "error" as const, errorDetails: "复制时该结果尚未完成" } : text)),
                      composerContent: node.metadata.composerContent?.replace(/@\[node:([^\]]+)\]/g, (token, id: string) => (idMap.has(id) ? `@[node:${idMap.get(id)}]` : token)),
                  }
                : undefined,
        }));
    return {
        idMap,
        nodes: copies,
        connections: connections
            .filter((connection) => selected.has(connection.fromNodeId) && selected.has(connection.toNodeId))
            .map((connection) => ({ ...connection, id: nanoid(), fromNodeId: idMap.get(connection.fromNodeId)!, toNodeId: idMap.get(connection.toNodeId)! })),
        selectedIds: new Set([...ids].flatMap((id) => (idMap.has(id) ? [idMap.get(id)!] : []))),
    };
}

export function layoutCanvasNodes(nodes: CanvasNodeData[], ids: Set<string>, action: CanvasLayoutAction) {
    const targets = nodes.filter((node) => ids.has(node.id) && !(node.metadata?.groupId && ids.has(node.metadata.groupId)));
    if (targets.length < 2 || ((action === "horizontal" || action === "vertical") && targets.length < 3)) return nodes;
    const left = Math.min(...targets.map((node) => node.position.x));
    const top = Math.min(...targets.map((node) => node.position.y));
    const right = Math.max(...targets.map((node) => node.position.x + node.width));
    const bottom = Math.max(...targets.map((node) => node.position.y + node.height));
    const deltas = new Map<string, Position>();
    if (action === "arrange") {
        const ordered = [...targets].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
        const columns = Math.ceil(Math.sqrt(ordered.length));
        let y = top;
        for (let i = 0; i < ordered.length; i += columns) {
            const row = ordered.slice(i, i + columns);
            let x = left;
            row.forEach((node) => {
                deltas.set(node.id, { x: x - node.position.x, y: y - node.position.y });
                x += node.width + 96;
            });
            y += Math.max(...row.map((node) => node.height)) + 96;
        }
    } else if (action === "horizontal" || action === "vertical") {
        const horizontal = action === "horizontal";
        const ordered = [...targets].sort((a, b) => (horizontal ? a.position.x - b.position.x : a.position.y - b.position.y));
        const total = ordered.reduce((sum, node) => sum + (horizontal ? node.width : node.height), 0);
        const gap = ((horizontal ? right - left : bottom - top) - total) / (ordered.length - 1);
        let cursor = horizontal ? left : top;
        ordered.forEach((node) => {
            deltas.set(node.id, horizontal ? { x: cursor - node.position.x, y: 0 } : { x: 0, y: cursor - node.position.y });
            cursor += (horizontal ? node.width : node.height) + gap;
        });
    } else {
        targets.forEach((node) =>
            deltas.set(node.id, {
                x: action === "left" ? left - node.position.x : action === "right" ? right - node.width - node.position.x : 0,
                y: action === "top" ? top - node.position.y : action === "bottom" ? bottom - node.height - node.position.y : 0,
            }),
        );
    }
    const moved = nodes.map((node) => {
        const delta = deltas.get(node.id) || (node.metadata?.groupId ? deltas.get(node.metadata.groupId) : undefined);
        return delta ? { ...node, position: { x: node.position.x + delta.x, y: node.position.y + delta.y } } : node;
    });
    return moved.map((node) => {
        if (node.type !== CanvasNodeType.Group || ids.has(node.id)) return node;
        const children = moved.filter((child) => child.metadata?.groupId === node.id);
        if (!children.length || !children.some((child) => deltas.has(child.id))) return node;
        const bounds = getGroupWrapRect(children);
        return { ...node, position: { x: bounds.x, y: bounds.y }, width: bounds.width, height: bounds.height };
    });
}
