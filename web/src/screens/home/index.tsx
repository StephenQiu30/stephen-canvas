"use client";

import { Bot, ChevronRight, FileText, FolderOpen, ImagePlus, Images, Plus, Settings2, Video, Workflow } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { CanvasProjectCover } from "@/components/canvas/canvas-project-cover";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { getImagePreviewRevision, subscribeImagePreviews } from "@/services/image-storage";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useAgentStore } from "@/stores/use-agent-store";
import { assetCoverUrl, useAssetStore } from "@/stores/use-asset-store";

const shortcuts = [
    { label: "图片生成", href: "/image", icon: ImagePlus },
    { label: "视频生成", href: "/video", icon: Video },
    { label: "画布项目", href: "/canvas", icon: Workflow },
    { label: "我的素材", href: "/assets", icon: Images },
    { label: "模型配置", href: "/config", icon: Settings2 },
];

export default function HomePage() {
    const projects = useCanvasStore((state) => state.projects);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const assets = useAssetStore((state) => state.assets);
    const assetsHydrated = useAssetStore((state) => state.hydrated);
    const togglePanel = useAgentStore((state) => state.togglePanel);
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision, () => 0);
    const recentProjects = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
    const recentAssets = [...assets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

    return (
        <main className="h-full overflow-y-auto px-4 pb-10 lg:px-10">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-9">
                <Link href="/canvas?mode=new" className="group flex min-h-40 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card py-8 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="grid h-14 w-24 place-items-center rounded-2xl bg-foreground text-background transition group-hover:scale-105">
                        <Plus className="size-8" strokeWidth={1.8} />
                    </span>
                    <h1 className="text-lg font-medium">新建画布创作</h1>
                </Link>

                <section aria-label="创作工具" className="grid grid-cols-3 gap-x-4 gap-y-6 @min-[640px]:grid-cols-6">
                    {shortcuts.map(({ label, href, icon: Icon }) => (
                        <Link key={href} href={href} className="group flex flex-col items-center gap-3 rounded-lg text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="grid h-14 w-full max-w-28 place-items-center rounded-2xl bg-card transition group-hover:bg-accent">
                                <Icon className="size-6" strokeWidth={1.6} />
                            </span>
                            {label}
                        </Link>
                    ))}
                    <Button variant="ghost" className="h-auto flex-col gap-3 whitespace-normal p-0" onClick={togglePanel}>
                        <span className="grid h-14 w-full max-w-28 place-items-center rounded-2xl bg-card">
                            <Bot />
                        </span>
                        智能助手
                    </Button>
                </section>

                <section>
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-medium">最近项目</h2>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/canvas">
                                查看全部
                                <ChevronRight data-icon="inline-end" />
                            </Link>
                        </Button>
                    </div>
                    {!hydrated ? (
                        <Spinner aria-label="加载项目" />
                    ) : recentProjects.length ? (
                        <div className="grid gap-3 @min-[520px]:grid-cols-2 @min-[1050px]:grid-cols-4">
                            {recentProjects.map((project) => (
                                <Link key={project.id} href={`/canvas/${project.id}`} className="flex min-w-0 items-center gap-4 rounded-2xl border border-border p-2 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                                    <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-card">
                                        <CanvasProjectCover project={project} />
                                    </span>
                                    <div className="min-w-0 pr-2">
                                        <h3 className="truncate text-sm font-medium">{project.title}</h3>
                                        <p className="mt-2 text-xs text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString("zh-CN")}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia>
                                    <FolderOpen className="size-7 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>还没有项目</EmptyTitle>
                                <EmptyDescription>从第一张画布开始，把想法变成作品。</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button asChild variant="outline">
                                    <Link href="/canvas?mode=new">
                                        <Plus data-icon="inline-start" />
                                        创建项目
                                    </Link>
                                </Button>
                            </EmptyContent>
                        </Empty>
                    )}
                </section>

                <section>
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-medium">最近素材</h2>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/assets">
                                查看全部
                                <ChevronRight data-icon="inline-end" />
                            </Link>
                        </Button>
                    </div>
                    {!assetsHydrated ? (
                        <Spinner aria-label="加载素材" />
                    ) : recentAssets.length ? (
                        <div className="grid gap-x-5 gap-y-7 @min-[520px]:grid-cols-2 @min-[900px]:grid-cols-3 @min-[1200px]:grid-cols-4">
                            {recentAssets.map((asset) => {
                                const cover = assetCoverUrl(asset);
                                return (
                                    <Link key={asset.id} href={`/assets?asset=${encodeURIComponent(asset.id)}`} className="group min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <div className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-card">
                                            {cover ? (
                                                <img src={cover} alt={asset.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                            ) : asset.kind === "text" ? (
                                                <p className="line-clamp-4 px-6 text-sm leading-6 text-muted-foreground">{asset.data.content}</p>
                                            ) : asset.kind === "video" ? (
                                                <Video className="size-8 text-muted-foreground" />
                                            ) : (
                                                <FileText className="size-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <h3 className="mt-3 truncate text-sm font-medium">{asset.title}</h3>
                                        <p className="mt-1.5 truncate text-xs text-muted-foreground">{asset.tags.join(" · ") || (asset.kind === "image" ? "图片" : asset.kind === "video" ? "视频" : "文本")}</p>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <Empty className="border">
                            <EmptyHeader>
                                <EmptyMedia>
                                    <Images className="size-7 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>收藏你的创作素材</EmptyTitle>
                                <EmptyDescription>导入图片、视频和文本，或将生成结果保存到素材库。</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button asChild variant="outline">
                                    <Link href="/assets">
                                        打开素材库
                                        <ChevronRight data-icon="inline-end" />
                                    </Link>
                                </Button>
                            </EmptyContent>
                        </Empty>
                    )}
                </section>
            </div>
        </main>
    );
}
