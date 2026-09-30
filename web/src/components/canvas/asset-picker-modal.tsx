import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileText, ImageIcon, Music2, Search, Video, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { getImagePreviewRevision, subscribeImagePreviews } from "@/services/image-storage";
import { assetCoverUrl, useAssetStore, type Asset } from "@/stores/use-asset-store";

export type InsertAssetPayload =
    | { kind: "text"; content: string; title: string }
    | { kind: "image"; dataUrl: string; title: string; storageKey?: string }
    | { kind: "audio"; url: string; title: string; storageKey?: string; bytes?: number; mimeType?: string; durationMs?: number }
    | { kind: "video"; url: string; title: string; storageKey?: string; width?: number; height?: number };

type Props = {
    open: boolean;
    defaultTab?: string;
    allowedKinds?: Asset["kind"][];
    onInsert: (payload: InsertAssetPayload) => void;
    onClose: () => void;
};

export function AssetPickerModal({ open, allowedKinds, onInsert, onClose }: Props) {
    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 860, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle>{"选择资产"}</DialogTitle>
                </DialogHeader>
                <div style={{ padding: "0 24px 24px", minHeight: 480 }}>
                    <MyAssetsTab onInsert={onInsert} allowedKinds={allowedKinds} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

const PAGE_SIZE = 8;

const kindOptions = ["all", "text", "image", "video", "audio"];

function PickerCard({ title, kind, cover, onClick }: { title: string; kind: string; cover: string; onClick: () => void }) {
    const Icon = ({ text: FileText, image: ImageIcon, video: Video, audio: Music2 } as const)[kind as Asset["kind"]];
    return (
        <Button variant="ghost" type="button" className="group relative flex h-auto flex-col cursor-pointer overflow-hidden rounded-lg border border-border bg-card text-left transition hover:border-foreground/30 hover:shadow-md" onClick={onClick}>
            {cover ? (
                <img src={cover} alt={title} className="aspect-[4/3] w-full object-cover" />
            ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center p-3 text-muted-foreground">
                    <Icon className="size-8" aria-hidden />
                </div>
            )}
            <div className="p-2.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-xs font-medium text-brand-body ">{title}</span>
                    <Badge className="m-0 shrink-0 text-[10px]" variant={"secondary"}>
                        {({ text: "文本", image: "图片", video: "视频", audio: "音频" } as Record<string, string>)[String(kind)] || String(kind)}
                    </Badge>
                </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/55 group-hover:opacity-100">{"插入"}</div>
        </Button>
    );
}

function MyAssetsTab({ onInsert, allowedKinds }: { onInsert: (payload: InsertAssetPayload) => void; allowedKinds?: Asset["kind"][] }) {
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision);
    const assets = useAssetStore((state) => state.assets);
    const [keyword, setKeyword] = useState("");
    const [kindFilter, setKindFilter] = useState("all");
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return assets
            .filter((asset) => !allowedKinds || allowedKinds.includes(asset.kind))
            .filter((a) => kindFilter === "all" || a.kind === kindFilter)
            .filter((a) => !query || [a.title, ...(a.tags || [])].join(" ").toLowerCase().includes(query));
    }, [allowedKinds, assets, keyword, kindFilter]);

    const visible = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        setPage((v) => Math.min(v, maxPage));
    }, [filtered.length]);

    const handleInsert = (asset: Asset) => {
        if (asset.kind === "text") {
            onInsert({ kind: "text", content: asset.data.content, title: asset.title });
        } else if (asset.kind === "audio") {
            onInsert({ kind: "audio", ...asset.data, title: asset.title });
        } else {
            onInsert(
                asset.kind === "video"
                    ? { kind: "video", url: asset.data.url, storageKey: asset.data.storageKey, title: asset.title, width: asset.data.width, height: asset.data.height }
                    : { kind: "image", dataUrl: asset.data.dataUrl, storageKey: asset.data.storageKey, title: asset.title },
            );
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <InputGroup className={"w-56"}>
                    <InputGroupAddon>{<Search className="text-muted-foreground" aria-hidden />}</InputGroupAddon>
                    <InputGroupInput
                        placeholder={"搜索资产"}
                        value={keyword}
                        onChange={(e) => {
                            setPage(1);
                            setKeyword(e.target.value);
                        }}
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            aria-label="清空"
                            onClick={() => {
                                setPage(1);
                                setKeyword("");
                            }}
                        >
                            <X aria-hidden data-icon="inline-start" />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                <ToggleGroup
                    type="single"
                    value={kindFilter}
                    onValueChange={(value) => {
                        if (value) {
                            setPage(1);
                            setKindFilter(value as typeof kindFilter);
                        }
                    }}
                    className="flex-wrap"
                    aria-label="资产类型"
                >
                    {kindOptions
                        .filter((option) => option === "all" || !allowedKinds || allowedKinds.includes(option as Asset["kind"]))
                        .map((option) => (
                            <ToggleGroupItem key={option} value={option}>
                                {option === "all" ? "全部" : ({ text: "文本", image: "图片", video: "视频", audio: "音频" } as Record<string, string>)[String(option)] || String(option)}
                            </ToggleGroupItem>
                        ))}
                </ToggleGroup>
            </div>

            {visible.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {visible.map((asset) => (
                        <PickerCard key={asset.id} title={asset.title} kind={asset.kind} cover={assetCoverUrl(asset)} onClick={() => handleInsert(asset)} />
                    ))}
                </div>
            ) : (
                <Empty className={"py-12"}>
                    <EmptyHeader>
                        <EmptyDescription>{"没有资产"}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

            {filtered.length > PAGE_SIZE && (
                <div className="flex justify-center">
                    <Pagination aria-label="分页">
                        <PaginationContent>
                            <PaginationItem>
                                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                    上一页
                                </Button>
                            </PaginationItem>
                            <PaginationItem className="px-2 font-mono text-sm tabular-nums">
                                {page} / {Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}
                            </PaginationItem>
                            <PaginationItem>
                                <Button type="button" variant="outline" size="sm" disabled={page >= Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} onClick={() => setPage(page + 1)}>
                                    下一页
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}
