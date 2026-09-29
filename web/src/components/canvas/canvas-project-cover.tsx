import { Workflow } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ensureImagePreview, getImagePreviewRevision, previewUrlFor, resolveImageUrl, subscribeImagePreviews } from "@/services/image-storage";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";

export function CanvasProjectCover({ project }: { project: CanvasProject }) {
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision, () => 0);
    const cover = project.nodes.find((node) => node.type === "image" && (node.metadata?.storageKey || node.metadata?.content))?.metadata;
    const storageKey = cover?.storageKey;
    const content = cover?.content || "";
    const [original, setOriginal] = useState({ storageKey, url: "" });
    useEffect(() => {
        let active = true;
        void ensureImagePreview(storageKey).catch(() => undefined);
        void resolveImageUrl(storageKey, content)
            .then((url) => {
                if (active) setOriginal({ storageKey, url });
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [storageKey, content]);
    const url = previewUrlFor(storageKey) || (original.storageKey === storageKey ? original.url : "");
    return url ? <img src={url} alt={project.title} loading="lazy" className="h-full w-full object-cover" /> : <Workflow className="size-7 text-muted-foreground" strokeWidth={1.4} />;
}
