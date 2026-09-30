import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { hydrateCanvasImages } from "@/lib/canvas/canvas-generation-helpers";
import { localForageStorage } from "@/lib/localforage-storage";
import type { CanvasConnection, CanvasGenerationMode, CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";
import type { AiConfig } from "@/stores/use-config-store";

export type CanvasGenerationRecord = {
    id: string;
    projectId?: string;
    projectTitle: string;
    mode: CanvasGenerationMode;
    prompt: string;
    parameters: CanvasNodeMetadata;
    source: CanvasNodeData;
    references: CanvasNodeData[];
    connections: CanvasConnection[];
    targetIds: string[];
    results: CanvasNodeData[];
    status: "loading" | "success" | "error" | "canceled";
    error?: string;
    createdAt: string;
    updatedAt: string;
};

type GenerationStore = {
    hydrated: boolean;
    records: CanvasGenerationRecord[];
    save: (record: Omit<CanvasGenerationRecord, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }) => string;
    update: (id: string, patch: Partial<CanvasGenerationRecord>) => void;
    remove: (id: string) => void;
};

// Only generation parameters belong in history; the host's service configuration stays in memory.
export function generationParameters(config: Partial<AiConfig>): CanvasNodeMetadata {
    return {
        model: config.model,
        size: config.size,
        quality: config.quality,
        background: config.background,
        count: Number(config.count) || undefined,
        reasoningEffort: config.reasoningEffort,
        seconds: config.videoSeconds,
        vquality: config.vquality,
        generateAudio: config.videoGenerateAudio,
        watermark: config.videoWatermark,
        videoMode: config.videoMode,
        audioVoice: config.audioVoice,
        audioFormat: config.audioFormat,
        audioSpeed: config.audioSpeed,
        audioInstructions: config.audioInstructions,
    };
}

const storage: PersistStorage<GenerationStore> = {
    getItem: async (name) => {
        const value = await localForageStorage.getItem(name);
        if (!value) return null;
        const parsed = JSON.parse(value) as StorageValue<GenerationStore>;
        parsed.state.records = await Promise.all(
            parsed.state.records.map(async (record) => ({
                ...record,
                source: (await hydrateCanvasImages([record.source]))[0],
                references: await hydrateCanvasImages(record.references),
                results: await hydrateCanvasImages(record.results),
                ...(record.status === "loading" ? { status: "error" as const, error: "生成已中断；视频任务可从原节点继续查询" } : {}),
            })),
        );
        return parsed;
    },
    setItem: (name, value) => localForageStorage.setItem(name, JSON.stringify(value)),
    removeItem: (name) => localForageStorage.removeItem(name),
};

export const useCanvasGenerationStore = create<GenerationStore>()(
    persist(
        (set) => ({
            hydrated: false,
            records: [],
            save: (record) => {
                const id = record.id || nanoid();
                const now = new Date().toISOString();
                set((state) => ({ records: [{ ...record, id, createdAt: record.createdAt || now, updatedAt: now }, ...state.records.filter((item) => item.id !== id)] }));
                return id;
            },
            update: (id, patch) => set((state) => ({ records: state.records.map((record) => (record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record)) })),
            remove: (id) => set((state) => ({ records: state.records.filter((record) => record.id !== id) })),
        }),
        {
            name: "stephen-canvas:generation_history",
            storage,
            partialize: (state) => ({ records: state.records }) as GenerationStore,
            onRehydrateStorage: () => () => {
                useCanvasGenerationStore.setState({ hydrated: true });
            },
        },
    ),
);
