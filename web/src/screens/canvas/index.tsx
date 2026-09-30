"use client";

import { Button } from "@/components/ui/button";
import { Download, Ellipsis, FileUp, FolderOpen, Plus, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CanvasDeleteProjectsDialog } from "@/components/canvas/canvas-delete-projects-dialog";
import { CanvasProjectCard } from "@/components/canvas/canvas-project-card";
import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { WorkspaceCardSkeleton } from "@/components/workspace/workspace-card-skeleton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { readZip } from "@/lib/zip";
import { setMediaBlob } from "@/services/file-storage";
import { setImageBlob } from "@/services/image-storage";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import type { CanvasExportFile } from "@/types/canvas-export";

export default function CanvasPage() {
    const { message } = useAppFeedback();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [keyword, setKeyword] = useState("");
    const [sort, setSort] = useState("updated");
    const inputRef = useRef<HTMLInputElement>(null);
    const autoOpenRef = useRef(false);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const projects = useCanvasStore((state) => state.projects);
    const createProject = useCanvasStore((state) => state.createProject);
    const importProject = useCanvasStore((state) => state.importProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);

    const visibleProjects = projects.filter((project) => project.title.toLowerCase().includes(keyword.toLowerCase())).sort((a, b) => (sort === "name" ? a.title.localeCompare(b.title, "zh-CN") : b.updatedAt.localeCompare(a.updatedAt)));

    const mode = searchParams.get("mode");
    const enterProject = (id: string) => router.push(`/canvas/${id}`);
    const createAndEnter = () => enterProject(createProject(`Stephen Canvas ${projects.length + 1}`));
    const importCanvas = async (file?: File) => {
        if (!file) return;
        try {
            const zip = await readZip(file);
            const projectFile = zip.get("projects.json");
            if (!projectFile) throw new Error("missing projects.json");
            const data = JSON.parse(await projectFile.text()) as CanvasExportFile;
            await Promise.all(
                data.projects.flatMap((project) =>
                    project.files.map(async (item) => {
                        const blob = zip.get(item.path);
                        if (!blob) return;
                        const typedBlob = blob.type ? blob : blob.slice(0, blob.size, item.mimeType);
                        await (item.storageKey.startsWith("image:") ? setImageBlob(item.storageKey, typedBlob) : setMediaBlob(item.storageKey, typedBlob));
                    }),
                ),
            );
            data.projects.forEach((item) => importProject(item.project));
            message.success(`已导入 ${data.projects.length} 个画布`);
        } catch {
            message.error("导入失败，请选择有效的画布压缩包");
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (!hydrated || autoOpenRef.current || (mode !== "new" && mode !== "recent")) return;
        autoOpenRef.current = true;
        enterProject(mode === "new" ? createProject(`Stephen Canvas ${projects.length + 1}`) : projects[0]?.id || createProject(`Stephen Canvas ${projects.length + 1}`));
    }, [createProject, hydrated, mode, projects]);

    if (hydrated && (mode === "new" || mode === "recent")) return <main className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">{"正在打开画布..."}</main>;

    return (
        <main className="h-full overflow-auto bg-background text-foreground ">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pb-10 pt-4 lg:px-10">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-medium tracking-tight">我的项目</h1>
                        <p className="text-sm text-muted-foreground">继续最近的创作，或开始一张新的画布。</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" disabled={!hydrated} onClick={() => inputRef.current?.click()}>
                            <FileUp data-icon="inline-start" />
                            导入项目
                        </Button>
                        <Button disabled={!hydrated} onClick={createAndEnter}>
                            <Plus data-icon="inline-start" />
                            新建项目
                        </Button>
                        {projects.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="项目批量操作">
                                        <Ellipsis />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {selectedIds.length > 0 && (
                                        <>
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        void exportCanvasProjects(
                                                            projects.filter((project) => selectedIds.includes(project.id)),
                                                            `Stephen Canvas-${selectedIds.length}`,
                                                        )
                                                    }
                                                >
                                                    <Download />
                                                    导出选中项目
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuGroup>
                                        {selectedIds.length > 0 && (
                                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteIds(selectedIds)}>
                                                <Trash2 />
                                                删除选中项目
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteIds(projects.map((project) => project.id))}>
                                            <Trash2 />
                                            删除全部项目
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </header>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <InputGroup className="w-full @min-[520px]:w-72">
                        <InputGroupInput type="search" placeholder="搜索项目名称" aria-label="搜索项目" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>
                    <div className="flex items-center gap-3">
                        {selectedIds.length > 0 ? <Badge variant="secondary">已选 {selectedIds.length} 项</Badge> : <span className="text-xs text-muted-foreground">{visibleProjects.length} 个项目</span>}
                        <Select value={sort} onValueChange={setSort}>
                            <SelectTrigger aria-label="项目排序">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="updated">最近更新</SelectItem>
                                    <SelectItem value="name">按名称排序</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {!hydrated || visibleProjects.length ? (
                    <div className="grid gap-x-4 gap-y-6 @min-[520px]:grid-cols-2 @min-[800px]:grid-cols-3 @min-[1000px]:grid-cols-4 @min-[1200px]:grid-cols-5" aria-busy={!hydrated} aria-label="项目列表">
                        {!hydrated ? Array.from({ length: 5 }, (_, index) => <WorkspaceCardSkeleton key={index} showDate />) : visibleProjects.map((project) => <CanvasProjectCard key={project.id} project={project} />)}
                    </div>
                ) : (
                    <Empty className="min-h-72 border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FolderOpen />
                            </EmptyMedia>
                            <EmptyTitle>{projects.length ? "没有匹配的项目" : "还没有项目"}</EmptyTitle>
                            <EmptyDescription>{projects.length ? "试试其他名称，或清空搜索查看所有项目。" : "新建一张画布，保存你的节点、连线与创作想法。"}</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            {projects.length ? (
                                <Button variant="outline" onClick={() => setKeyword("")}>
                                    清空搜索
                                </Button>
                            ) : (
                                <Button onClick={createAndEnter}>
                                    <Plus data-icon="inline-start" />
                                    新建项目
                                </Button>
                            )}
                        </EmptyContent>
                    </Empty>
                )}
            </div>

            <input ref={inputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importCanvas(event.target.files?.[0])} />
            <CanvasDeleteProjectsDialog />
        </main>
    );
}
