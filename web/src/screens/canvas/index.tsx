"use client";

import { Button } from "@/components/ui/button";
import { Download, FileUp, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CanvasDeleteProjectsDialog } from "@/components/canvas/canvas-delete-projects-dialog";
import { CanvasProjectCard } from "@/components/canvas/canvas-project-card";
import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Button as ActionButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasAgentUrlBootstrap } from "@/lib/agent/agent-url-bootstrap";
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
    const agentMode = mode === "new" || mode === "recent" || mode === "choose";
    const agentQuery = agentMode ? `?${searchParams.toString()}` : "";
    const enterProject = (id: string) => {
        const agentHash = hasAgentUrlBootstrap(window.location.hash) ? window.location.hash : "";
        const target = `/canvas/${id}${agentQuery}${agentHash}`;
        if (agentHash) router.replace(target);
        else router.push(target);
    };
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
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">{"画布库"}</p>
                        <h1 className="mt-2 text-2xl font-semibold">{"Stephen Canvas"}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {selectedIds.length ? (
                            <>
                                <Button
                                    onClick={() =>
                                        void exportCanvasProjects(
                                            projects.filter((project) => selectedIds.includes(project.id)),
                                            `${"Stephen Canvas"}-${selectedIds.length}`,
                                        )
                                    }
                                    type={"button"}
                                    variant={"secondary"}
                                    size="default"
                                    disabled={!hydrated}
                                >
                                    {<Download data-icon="inline-start" />}
                                    {"导出选中"}
                                </Button>
                                <Button onClick={() => setDeleteIds(selectedIds)} type={"button"} variant={"secondary"} size="default" disabled={!hydrated}>
                                    {"删除选中"}
                                </Button>
                            </>
                        ) : null}
                        {projects.length ? (
                            <Button onClick={() => setDeleteIds(projects.map((project) => project.id))} type={"button"} variant={"secondary"} size="default" disabled={!hydrated}>
                                {"删除全部"}
                            </Button>
                        ) : null}
                        <Button onClick={() => inputRef.current?.click()} type={"button"} variant={"secondary"} size="default" disabled={!hydrated}>
                            {<FileUp data-icon="inline-start" />}
                            {"导入画布"}
                        </Button>
                        <Button onClick={createAndEnter} type={"button"} variant={"default"} size="default" disabled={!hydrated}>
                            {<Plus data-icon="inline-start" />}
                            {"新建画布"}
                        </Button>
                    </div>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Input placeholder="搜索项目" aria-label="搜索项目" value={keyword} onChange={(event) => setKeyword(event.target.value)} className="w-full sm:w-72" />
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

                {!hydrated ? (
                    <section className="flex min-h-[360px] items-center justify-center border-y border-border text-sm text-muted-foreground ">{"正在加载画布..."}</section>
                ) : projects.length ? (
                    <div className="grid gap-5 @min-[520px]:grid-cols-2 @min-[900px]:grid-cols-3 @min-[1200px]:grid-cols-4">
                        {!keyword && (
                            <ActionButton variant="outline" onClick={createAndEnter} className="h-auto min-h-60 flex-col gap-3 rounded-xl border-dashed">
                                <Plus />
                                新建画布创作
                            </ActionButton>
                        )}
                        {!visibleProjects.length && <p className="col-span-full py-12 text-center text-sm text-muted-foreground">没有找到匹配的项目</p>}
                        {visibleProjects.map((project) => (
                            <CanvasProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : (
                    <section className="flex min-h-[360px] flex-col items-center justify-center border-y border-border text-center ">
                        <h2 className="text-xl font-medium">{"还没有画布"}</h2>
                        <p className="mt-3 text-sm text-muted-foreground">{"新建一个画布后，就可以独立保存节点、连线和画布外观。"}</p>
                        <Button onClick={createAndEnter} type={"button"} variant={"default"} size="default" className={"mt-6"}>
                            {<Plus data-icon="inline-start" />}
                            {"新建画布"}
                        </Button>
                    </section>
                )}
            </div>

            <input ref={inputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importCanvas(event.target.files?.[0])} />
            <CanvasDeleteProjectsDialog />
        </main>
    );
}
