"use client";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { SelectGroup } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxItem, ComboboxList, useComboboxAnchor } from "@/components/ui/combobox";

import { FieldError, FieldGroup } from "@/components/ui/field";
import { Controller, useForm } from "react-hook-form";

import { MediaPreview } from "@/components/media-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { saveAs } from "file-saver";
import { Copy, Download, PencilLine, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { Button as AssetButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input as SearchInput } from "@/components/ui/input";
import { Select as PageSizeSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopyText } from "@/hooks/use-copy-text";
import { formatBytes, readFileAsDataUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { getMediaBlob } from "@/services/file-storage";
import { getImageBlob, getImagePreviewRevision, subscribeImagePreviews, uploadImage } from "@/services/image-storage";
import { assetCoverUrl, useAssetStore, type Asset, type AssetKind, type ImageAsset } from "@/stores/use-asset-store";
import { useSearchParams } from "next/navigation";
import { exportAssets, readAssetPackage } from "./asset-transfer";

type AssetFormValues = {
    kind: AssetKind;
    title: string;
    coverUrl: string;
    tags: string[];
    source?: string;
    note?: string;
    content?: string;
};

type ImageDraft = ImageAsset["data"] | null;

const kindOptions = ["all", "text", "image", "video"] as const;

export default function AssetsPage() {
    const { message } = useAppFeedback();
    const copyText = useCopyText();
    const searchParams = useSearchParams();
    const requestedAssetId = searchParams.get("asset");
    const openedAssetId = useRef<string | null>(null);
    const form = useForm<AssetFormValues>({ mode: "onChange", defaultValues: { kind: "text", title: "", coverUrl: "", tags: [], content: "" } });
    const tagsAnchor = useComboboxAnchor();
    const [tagsInput, setTagsInput] = useState("");
    const coverInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const assetInputRef = useRef<HTMLInputElement>(null);
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const removeAsset = useAssetStore((state) => state.removeAsset);
    const [keyword, setKeyword] = useState("");
    const [kindFilter, setKindFilter] = useState<AssetKind | "all">("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isAssetOpen, setIsAssetOpen] = useState(false);
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
    const [formKind, setFormKind] = useState<AssetKind>("text");
    const [imageDraft, setImageDraft] = useState<ImageDraft>(null);
    const coverUrl = form.watch("coverUrl") || "";
    const title = form.watch("title") || "";
    const tags = form.watch("tags") || [];
    const content = form.watch("content") || "";
    const validAssets = useMemo(() => assets.filter((asset) => asset.kind === "text" || asset.kind === "image" || asset.kind === "video"), [assets]);

    useEffect(() => {
        if (!requestedAssetId || openedAssetId.current === requestedAssetId) return;
        const asset = validAssets.find((item) => item.id === requestedAssetId);
        if (asset) {
            openedAssetId.current = requestedAssetId;
            setPreviewAsset(asset);
        }
    }, [requestedAssetId, validAssets]);

    const filteredAssets = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return validAssets.filter((asset) => {
            if (kindFilter !== "all" && asset.kind !== kindFilter) return false;
            if (!query) return true;
            return assetSearchText(asset).includes(query);
        });
    }, [validAssets, keyword, kindFilter]);

    const visibleAssets = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredAssets.slice(start, start + pageSize);
    }, [filteredAssets, page, pageSize]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
        setPage((value) => Math.min(value, maxPage));
    }, [filteredAssets.length, pageSize]);

    const openCreate = () => {
        setEditingAsset(null);
        setImageDraft(null);
        setFormKind("text");
        setTagsInput("");
        form.reset({ kind: "text", title: "", coverUrl: "", tags: [], source: "手动添加", note: "", content: "" });
        setIsAssetOpen(true);
    };

    const openEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setFormKind(asset.kind);
        setTagsInput("");
        setImageDraft(asset.kind === "image" ? asset.data : null);
        form.reset({
            kind: asset.kind,
            title: asset.title,
            coverUrl: asset.coverUrl,
            tags: asset.tags || [],
            source: asset.source,
            note: asset.note,
            content: asset.kind === "text" ? asset.data.content : "",
        });
        setIsAssetOpen(true);
    };

    const saveAsset = async () => {
        if (!(await form.trigger())) return;
        const values = form.getValues();
        const base = {
            title: values.title.trim(),
            coverUrl: values.coverUrl?.trim() || (values.kind === "image" && imageDraft ? imageDraft.dataUrl : ""),
            tags: values.tags || [],
            source: values.source?.trim(),
            note: values.note?.trim(),
            metadata: editingAsset?.metadata || { source: "manual" },
        };

        if (values.kind === "text") {
            const asset = { ...base, kind: "text" as const, data: { content: (values.content || "").trim() } };
            editingAsset ? updateAsset(editingAsset.id, asset) : addAsset(asset);
        } else {
            if (!imageDraft) {
                message.error("请选择图片文件");
                return;
            }
            const asset = { ...base, kind: "image" as const, data: imageDraft };
            editingAsset ? updateAsset(editingAsset.id, asset) : addAsset(asset);
        }

        message.success(editingAsset ? "资产已更新" : "资产已保存");
        setIsAssetOpen(false);
    };

    const readCoverFile = async (file?: File) => {
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        form.setValue("coverUrl", dataUrl);
    };

    const readImageFile = async (file?: File) => {
        if (!file || !file.type.startsWith("image/")) return;
        const image = await uploadImage(file);
        const draft = { dataUrl: image.url, storageKey: image.storageKey, width: image.width, height: image.height, bytes: image.bytes, mimeType: image.mimeType };
        setImageDraft(draft);
        if (!form.getValues("coverUrl")) form.setValue("coverUrl", draft.dataUrl);
        if (!form.getValues("title")) form.setValue("title", file.name);
    };

    const copyAssetText = async (asset: Asset) => {
        if (asset.kind !== "text") return;
        copyText(asset.data.content, "文本已复制");
    };

    const downloadImage = async (asset: Asset) => {
        if (asset.kind !== "image" && asset.kind !== "video") return;
        try {
            const blob = await readAssetMediaBlob(asset);
            if (!blob) {
                message.error("下载失败，请稍后重试");
                return;
            }
            const ext = asset.data.mimeType?.split("/")[1]?.split("+")[0] || (asset.kind === "video" ? "mp4" : "png");
            saveAs(blob, `${asset.title || "asset"}.${ext}`);
        } catch {
            message.error("下载失败，请稍后重试");
        }
    };

    const exportAllAssets = async () => {
        if (!validAssets.length) {
            message.warning("暂无资产可导出");
            return;
        }
        await exportAssets(validAssets, "我的资产.zip");
    };

    const importAssetZip = async (file?: File) => {
        if (!file) return;
        try {
            const importedAssets = await readAssetPackage(file);
            importedAssets.forEach((asset) => {
                const payload = { ...asset } as Record<string, unknown>;
                delete payload.id;
                delete payload.createdAt;
                delete payload.updatedAt;
                addAsset(payload as Parameters<typeof addAsset>[0]);
            });
            message.success(`已导入 ${importedAssets.length} 个资产`);
        } catch {
            message.error("导入失败，请选择有效的资产压缩包");
        } finally {
            if (assetInputRef.current) assetInputRef.current.value = "";
        }
    };

    const confirmDelete = () => {
        if (!deletingAsset) return;
        removeAsset(deletingAsset.id);
        message.success("资产已删除");
        setDeletingAsset(null);
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-foreground ">
            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-4 lg:px-10">
                <div className="pb-8">
                    <div className="text-left">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground ">{"我的资产"}</h1>
                        <p className="mt-3 text-sm text-muted-foreground ">{"收藏常用文本和图片，按类型、标题和标签快速查找。"}</p>
                    </div>

                    <div className="mt-6 w-full max-w-md">
                        <SearchInput
                            type="search"
                            value={keyword}
                            aria-label={"搜索标题、内容、标签或来源"}
                            placeholder={"搜索标题、内容、标签或来源"}
                            onChange={(event) => {
                                setPage(1);
                                setKeyword(event.target.value);
                            }}
                        />
                    </div>

                    <div className="mt-6 grid gap-3 text-left">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="grid gap-2 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-center">
                                <div className="text-xs font-medium text-muted-foreground ">{"类型"}</div>
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
                                    {kindOptions.map((option) => (
                                        <ToggleGroupItem key={option} value={option}>
                                            {option === "all" ? "全部" : ({ text: "文本", image: "图片", video: "视频", audio: "音频" } as Record<string, string>)[String(option)] || String(option)}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="cursor-pointer text-sm font-medium text-brand-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline "
                                    onClick={() => void exportAllAssets()}
                                >
                                    {"导出资产"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="cursor-pointer text-sm font-medium text-brand-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline "
                                    onClick={() => assetInputRef.current?.click()}
                                >
                                    {"导入资产"}
                                </Button>
                                <Button variant="ghost" type="button" className="cursor-pointer text-sm font-medium text-brand-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline " onClick={openCreate}>
                                    {"新增资产"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-5">
                    <div className="grid gap-5 @min-[520px]:grid-cols-2 @min-[900px]:grid-cols-3 @min-[1200px]:grid-cols-4">
                        {visibleAssets.map((asset) => (
                            <AssetCard key={asset.id} asset={asset} onOpen={() => setPreviewAsset(asset)} onEdit={() => openEdit(asset)} onCopy={copyAssetText} onDownload={downloadImage} onDelete={() => setDeletingAsset(asset)} />
                        ))}
                    </div>

                    {!visibleAssets.length ? (
                        <Empty className={"py-20"}>
                            <EmptyHeader>
                                <EmptyDescription>{"没有找到资产"}</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Pagination aria-label="分页">
                            <PaginationContent>
                                <PaginationItem>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() =>
                                            ((nextPage, nextPageSize) => {
                                                setPage(nextPage);
                                                setPageSize(nextPageSize);
                                            })(page - 1, pageSize)
                                        }
                                    >
                                        上一页
                                    </Button>
                                </PaginationItem>
                                <PaginationItem className="px-2 font-mono text-sm tabular-nums">
                                    {page} / {Math.max(1, Math.ceil(filteredAssets.length / pageSize))}
                                </PaginationItem>
                                <PaginationItem>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= Math.max(1, Math.ceil(filteredAssets.length / pageSize))}
                                        onClick={() =>
                                            ((nextPage, nextPageSize) => {
                                                setPage(nextPage);
                                                setPageSize(nextPageSize);
                                            })(page + 1, pageSize)
                                        }
                                    >
                                        下一页
                                    </Button>
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                        <PageSizeSelect
                            value={String(pageSize)}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger aria-label="每页数量">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {[10, 20, 50, 100].map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size} 条 / 页
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </PageSizeSelect>
                    </div>
                </div>
            </main>

            <Dialog
                open={isAssetOpen}
                onOpenChange={(open) => {
                    if (!open) (() => setIsAssetOpen(false))();
                }}
            >
                <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 980, maxWidth: "calc(100vw - 2rem)" }}>
                    <DialogHeader>
                        <DialogTitle>{editingAsset ? "编辑资产" : "新增资产"}</DialogTitle>
                    </DialogHeader>
                    <div>
                        <div className="grid gap-6 pt-1 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <FieldGroup>
                                <Controller
                                    name="kind"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="asset-kind">{"类型"}</FieldLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    setFormKind(value as AssetKind);
                                                }}
                                            >
                                                <SelectTrigger id="asset-kind" aria-invalid={fieldState.invalid}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="text">{"文本"}</SelectItem>
                                                        <SelectItem value="image">{"图片"}</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="title"
                                    control={form.control}
                                    rules={{ required: "请输入标题", validate: (value) => !!String(value ?? "").trim() || "请输入标题" }}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="asset-title">{"标题"}</FieldLabel>
                                            <Input {...field} value={field.value ?? ""} id="asset-title" aria-invalid={fieldState.invalid} placeholder={"给资产起一个容易检索的名字"} />
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="coverUrl"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="asset-coverUrl">{"封面 URL"}</FieldLabel>
                                            <InputGroup>
                                                <InputGroupInput {...field} value={field.value ?? ""} id="asset-coverUrl" aria-invalid={fieldState.invalid} placeholder="可粘贴图片 URL，也可以上传本地封面" />
                                                <InputGroupAddon align="inline-end">
                                                    <InputGroupButton onClick={() => coverInputRef.current?.click()}>
                                                        <Upload data-icon="inline-start" />
                                                        上传
                                                    </InputGroupButton>
                                                </InputGroupAddon>
                                            </InputGroup>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="tags"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="asset-tags">{"标签"}</FieldLabel>
                                            <Combobox
                                                multiple
                                                items={Array.from(new Set([...assets.flatMap((asset) => asset.tags), ...(tagsInput.trim() ? [tagsInput.trim()] : [])]))}
                                                value={field.value || []}
                                                inputValue={tagsInput}
                                                onInputValueChange={setTagsInput}
                                                onValueChange={(tags) => {
                                                    field.onChange(tags);
                                                    setTagsInput("");
                                                }}
                                            >
                                                <ComboboxChips ref={tagsAnchor}>
                                                    {(field.value || []).map((tag: string) => (
                                                        <ComboboxChip key={tag} aria-label={`移除标签：${tag}`}>
                                                            {tag}
                                                        </ComboboxChip>
                                                    ))}
                                                    <ComboboxChipsInput
                                                        id="asset-tags"
                                                        placeholder="输入标签后回车"
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter" && tagsInput.trim() && !event.nativeEvent.isComposing) {
                                                                event.preventDefault();
                                                                field.onChange(
                                                                    Array.from(
                                                                        new Set([
                                                                            ...(field.value || []),
                                                                            ...tagsInput
                                                                                .split(/[,，]/)
                                                                                .map((tag) => tag.trim())
                                                                                .filter(Boolean),
                                                                        ]),
                                                                    ),
                                                                );
                                                                setTagsInput("");
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            if (tagsInput.trim()) {
                                                                field.onChange(
                                                                    Array.from(
                                                                        new Set([
                                                                            ...(field.value || []),
                                                                            ...tagsInput
                                                                                .split(/[,，]/)
                                                                                .map((tag) => tag.trim())
                                                                                .filter(Boolean),
                                                                        ]),
                                                                    ),
                                                                );
                                                                setTagsInput("");
                                                            }
                                                        }}
                                                    />
                                                </ComboboxChips>
                                                <ComboboxContent anchor={tagsAnchor}>
                                                    <ComboboxList>
                                                        {(tag: string) => (
                                                            <ComboboxItem key={tag} value={tag}>
                                                                {tag}
                                                            </ComboboxItem>
                                                        )}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Controller
                                        name="source"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="asset-source">{"来源"}</FieldLabel>
                                                <Input {...field} value={field.value ?? ""} id="asset-source" aria-invalid={fieldState.invalid} placeholder={"手动添加 / 画布"} />
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />
                                    <Controller
                                        name="note"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="asset-note">{"备注"}</FieldLabel>
                                                <Input {...field} value={field.value ?? ""} id="asset-note" aria-invalid={fieldState.invalid} placeholder={"可选"} />
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />
                                </div>
                                {formKind === "text" ? (
                                    <Controller
                                        name="content"
                                        control={form.control}
                                        rules={{ validate: (value) => form.getValues("kind") !== "text" || !!value?.trim() || "请输入文本内容" }}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="asset-content">{"文本内容"}</FieldLabel>
                                                <Textarea {...field} value={field.value ?? ""} id="asset-content" aria-invalid={fieldState.invalid} rows={8} placeholder={"保存提示词、说明文案、参考描述等文本资产"} />
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />
                                ) : (
                                    <Field>
                                        <FieldLabel>{"图片内容"}</FieldLabel>
                                        <div className="rounded-lg border border-dashed border-border p-4 ">
                                            <Button onClick={() => imageInputRef.current?.click()} type={"button"} variant={"secondary"} size="default">
                                                {<Upload data-icon="inline-start" />}
                                                {"选择图片文件"}
                                            </Button>
                                            {imageDraft ? (
                                                <span className={cn("secondary" === "secondary" && "text-muted-foreground", "ml-3 text-xs")}>
                                                    {imageDraft.width}x{imageDraft.height}· {formatBytes(imageDraft.bytes)}
                                                </span>
                                            ) : (
                                                <span className={cn("secondary" === "secondary" && "text-muted-foreground", "ml-3 text-xs")}>{"未选择图片"}</span>
                                            )}
                                        </div>
                                    </Field>
                                )}
                            </FieldGroup>
                            <div className="rounded-xl border border-border bg-muted p-4  ">
                                <span className={"font-medium"}>{"预览"}</span>
                                <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background ">
                                    {coverUrl || imageDraft?.dataUrl ? (
                                        <img src={coverUrl || imageDraft?.dataUrl} alt="" className="aspect-video w-full object-cover" />
                                    ) : (
                                        <div className="flex aspect-video items-center justify-center bg-muted p-5 text-center text-sm text-muted-foreground ">{content || "暂无封面"}</div>
                                    )}
                                    <div className="p-4">
                                        <span className={cn("font-medium", "truncate", "block")}>{title || "未命名资产"}</span>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {tags.length ? (
                                                tags.map((tag) => (
                                                    <Badge key={tag} className="m-0" variant={"secondary"}>
                                                        {tag}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <Badge className="m-0" variant={"secondary"}>
                                                    {"未打标签"}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                                void readCoverFile(event.target.files?.[0]);
                                event.target.value = "";
                            }}
                        />
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                                void readImageFile(event.target.files?.[0]);
                                event.target.value = "";
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAssetOpen(false)}>
                            {"取消"}
                        </Button>
                        <Button type="button" onClick={() => void saveAsset()}>
                            {"保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AssetDrawer asset={previewAsset} onClose={() => setPreviewAsset(null)} onCopy={copyAssetText} onDownload={downloadImage} />

            <input ref={assetInputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importAssetZip(event.target.files?.[0])} />

            <Dialog
                open={Boolean(deletingAsset)}
                onOpenChange={(open) => {
                    if (!open) (() => setDeletingAsset(null))();
                }}
            >
                <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"}>
                    <DialogHeader>
                        <DialogTitle>{"删除资产"}</DialogTitle>
                    </DialogHeader>
                    <div>{`确定删除「${deletingAsset?.title}」吗？删除后会从我的资产中移除。`}</div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeletingAsset(null)}>
                            {"取消"}
                        </Button>
                        <Button type="button" variant="destructive" disabled={({ danger: true } as { disabled?: boolean }).disabled} onClick={confirmDelete}>
                            {"删除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AssetCard({ asset, onOpen, onEdit, onCopy, onDownload, onDelete }: { asset: Asset; onOpen: () => void; onEdit: () => void; onCopy: (asset: Asset) => void; onDownload: (asset: Asset) => void; onDelete: () => void }) {
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision, () => 0);
    const cover = assetCoverUrl(asset);
    const summary = assetSummary(asset);
    return (
        <Card className="min-w-0 gap-3 rounded-xl pt-0">
            <AssetButton variant="ghost" className="grid aspect-video h-auto w-full overflow-hidden rounded-none p-0" onClick={onOpen} aria-label={`查看 ${asset.title}`}>
                {cover ? <img src={cover} alt={asset.title} loading="lazy" className="h-full w-full object-cover" /> : <span className="line-clamp-4 whitespace-normal px-5 text-center">{asset.kind === "text" ? asset.data.content : "暂无封面"}</span>}
            </AssetButton>
            <CardHeader>
                <CardTitle>
                    <AssetButton variant="ghost" className="h-auto w-full justify-start p-0" onClick={onOpen}>
                        <span className="truncate">{asset.title}</span>
                    </AssetButton>
                </CardTitle>
                <CardDescription>{asset.source || "未标注来源"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{summary}</p>
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{({ text: "文本", image: "图片", video: "视频", audio: "音频" } as Record<string, string>)[String(asset.kind)] || String(asset.kind)}</Badge>
                    {asset.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="flex-wrap gap-2 border-0 bg-transparent pt-0">
                <AssetButton variant="ghost" size="sm" onClick={onOpen}>
                    {"查看"}
                </AssetButton>
                {asset.kind !== "video" && (
                    <AssetButton variant="ghost" size="icon-sm" onClick={onEdit} aria-label={"编辑"}>
                        <PencilLine />
                    </AssetButton>
                )}
                {asset.kind === "text" ? (
                    <AssetButton variant="ghost" size="icon-sm" onClick={() => onCopy(asset)} aria-label={"复制"}>
                        <Copy />
                    </AssetButton>
                ) : (
                    <AssetButton variant="ghost" size="icon-sm" onClick={() => onDownload(asset)} aria-label={"下载"}>
                        <Download />
                    </AssetButton>
                )}
                <AssetButton variant="ghost" size="icon-sm" onClick={onDelete} aria-label={"删除"}>
                    <Trash2 />
                </AssetButton>
            </CardFooter>
        </Card>
    );
}

function AssetDrawer({ asset, onClose, onCopy, onDownload }: { asset: Asset | null; onClose: () => void; onCopy: (asset: Asset) => void; onDownload: (asset: Asset) => void }) {
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision, () => 0);
    const cover = asset ? asset.coverUrl || (asset.kind === "image" ? asset.data.dataUrl : "") : "";
    return (
        <Sheet
            open={Boolean(asset)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <SheetContent side="right" aria-describedby={undefined} style={{ width: 640, maxWidth: "100vw" }}>
                <SheetHeader>
                    <SheetTitle>{"资产详情"}</SheetTitle>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
                    {asset ? (
                        <div className="flex flex-col gap-5">
                            {cover ? (
                                <MediaPreview src={assetCoverUrl(asset)} alt={asset.title} className="rounded-lg" previewSrc={cover} />
                            ) : (
                                <div className="rounded-lg border border-border bg-muted p-5 text-sm leading-6 text-brand-body   ">{asset.kind === "text" ? asset.data.content : "暂无封面"}</div>
                            )}
                            <div>
                                <h4 className={"!mb-2"}>{asset.title}</h4>
                                <div className={"flex gap-2 items-center flex-wrap"}>
                                    <Badge variant={"secondary"}>{({ text: "文本", image: "图片", video: "视频", audio: "音频" } as Record<string, string>)[String(asset.kind)] || String(asset.kind)}</Badge>
                                    {(asset.tags || []).map((tag) => (
                                        <Badge key={tag} variant={"secondary"}>
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border p-4 ">
                                <span className={cn("secondary" === "secondary" && "text-muted-foreground", "block text-xs")}>{"文本内容"}</span>
                                {asset.kind === "text" ? (
                                    <p className={"mt-2 whitespace-pre-wrap"}>{asset.data.content}</p>
                                ) : asset.kind === "video" ? (
                                    <video src={asset.data.url} controls className="mt-2 aspect-video w-full rounded-lg bg-black" />
                                ) : (
                                    <span className={"mt-2 block"}>
                                        {asset.data.width}x{asset.data.height}· {formatBytes(asset.data.bytes)}· {asset.data.mimeType}
                                    </span>
                                )}
                            </div>
                            {asset.note ? (
                                <div>
                                    <span className="text-muted-foreground">{"备注"}</span>
                                    <p className={"mt-1"}>{asset.note}</p>
                                </div>
                            ) : null}
                            <div className={"flex gap-2 items-center"}>
                                {asset.kind === "text" ? (
                                    <Button onClick={() => onCopy(asset)} type={"button"} variant={"default"} size="default">
                                        {<Copy data-icon="inline-start" />}
                                        {"复制文本"}
                                    </Button>
                                ) : null}
                                {asset.kind === "image" || asset.kind === "video" ? (
                                    <Button onClick={() => onDownload(asset)} type={"button"} variant={"default"} size="default">
                                        {<Download data-icon="inline-start" />}
                                        {asset.kind === "video" ? "下载视频" : "下载图片"}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    );
}

async function readAssetMediaBlob(asset: Extract<Asset, { kind: "image" | "video" }>) {
    const storageKey = asset.data.storageKey;
    if (storageKey) {
        const stored = asset.kind === "image" ? await getImageBlob(storageKey) : await getMediaBlob(storageKey);
        if (stored) return stored;
    }
    const url = asset.kind === "video" ? asset.data.url : asset.data.dataUrl || asset.coverUrl;
    if (!url) return null;
    const response = await fetch(url);
    return response.ok ? response.blob() : null;
}

function assetSummary(asset: Asset) {
    if (asset.kind === "text") return asset.data.content;
    return `${asset.data.width}x${asset.data.height} · ${formatBytes(asset.data.bytes)} · ${asset.data.mimeType}`;
}

function assetSearchText(asset: Asset) {
    return [asset.title, asset.source || "", asset.note || "", (asset.tags || []).join(" "), asset.kind === "text" ? asset.data.content : asset.data.mimeType].join(" ").toLowerCase();
}
