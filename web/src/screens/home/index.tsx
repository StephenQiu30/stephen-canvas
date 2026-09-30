"use client";

import { ChevronRight, FolderOpen, ImagePlus, Images, Plus, Settings2, Video, Workflow } from "lucide-react";
import Link from "next/link";

import { AssetCard } from "@/components/assets/asset-card";
import { CanvasDeleteProjectsDialog } from "@/components/canvas/canvas-delete-projects-dialog";
import { CanvasProjectCard } from "@/components/canvas/canvas-project-card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { WorkspaceCardSkeleton } from "@/components/workspace/workspace-card-skeleton";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useAssetStore } from "@/stores/use-asset-store";

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
    const recentProjects = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
    const recentAssets = [...assets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

    return (
        <main className="h-full overflow-y-auto px-4 pb-10 lg:px-10">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
                <Link
                    href="/canvas?mode=new"
                    className="group flex min-h-40 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[20px_20px] py-8 outline-none motion-safe:transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="grid h-14 w-24 place-items-center rounded-2xl bg-primary text-primary-foreground motion-safe:transition-transform motion-safe:group-hover:scale-105">
                        <Plus className="size-8" strokeWidth={1.8} />
                    </span>
                    <h1 className="text-lg font-medium tracking-tight">新建画布创作</h1>
                </Link>
                <section aria-label="创作工具" className="grid grid-cols-3 gap-x-4 gap-y-5 @min-[640px]:grid-cols-5">
                    {shortcuts.map(({ label, href, icon: Icon }) => (
                        <Link key={href} href={href} className="group flex flex-col items-center gap-3 rounded-xl text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="grid h-14 w-full max-w-28 place-items-center rounded-2xl bg-card motion-safe:transition-colors group-hover:bg-accent">
                                <Icon className="size-6" strokeWidth={1.6} />
                            </span>
                            {label}
                        </Link>
                    ))}
                </section>
                <section className="flex flex-col gap-4" aria-labelledby="recent-projects-title">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="recent-projects-title" className="text-lg font-medium tracking-tight">
                            最近项目
                        </h2>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/canvas">
                                查看全部
                                <ChevronRight data-icon="inline-end" />
                            </Link>
                        </Button>
                    </div>
                    {!hydrated || recentProjects.length ? (
                        <div className="grid gap-3 @min-[520px]:grid-cols-2 @min-[1050px]:grid-cols-4" aria-busy={!hydrated} aria-label="最近项目列表">
                            {!hydrated ? Array.from({ length: 4 }, (_, index) => <WorkspaceCardSkeleton key={index} compact />) : recentProjects.map((project) => <CanvasProjectCard key={project.id} project={project} compact />)}
                        </div>
                    ) : (
                        <Empty className="min-h-40 border py-6">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <FolderOpen />
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
                <section className="flex flex-col gap-4" aria-labelledby="recent-assets-title">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="recent-assets-title" className="text-lg font-medium tracking-tight">
                            最近素材
                        </h2>
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/assets">
                                查看全部
                                <ChevronRight data-icon="inline-end" />
                            </Link>
                        </Button>
                    </div>
                    {!assetsHydrated || recentAssets.length ? (
                        <div className="grid gap-x-4 gap-y-6 @min-[520px]:grid-cols-2 @min-[800px]:grid-cols-3 @min-[1000px]:grid-cols-4 @min-[1200px]:grid-cols-5" aria-busy={!assetsHydrated} aria-label="最近素材列表">
                            {!assetsHydrated ? Array.from({ length: 5 }, (_, index) => <WorkspaceCardSkeleton key={index} />) : recentAssets.map((asset) => <AssetCard key={asset.id} asset={asset} href={`/assets?asset=${encodeURIComponent(asset.id)}`} />)}
                        </div>
                    ) : (
                        <Empty className="min-h-40 border py-6">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Images />
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
            <CanvasDeleteProjectsDialog />
        </main>
    );
}
