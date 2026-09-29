import { Check, Download, Pencil, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { CanvasProjectCover } from "@/components/canvas/canvas-project-cover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { hasAgentUrlBootstrap } from "@/lib/agent/agent-url-bootstrap";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";

export function CanvasProjectCard({ project }: { project: CanvasProject }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const renameProject = useCanvasStore((state) => state.renameProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const editingId = useCanvasUiStore((state) => state.editingProjectId);
    const editingTitle = useCanvasUiStore((state) => state.editingProjectTitle);
    const startEditing = useCanvasUiStore((state) => state.startEditingProject);
    const setEditingTitle = useCanvasUiStore((state) => state.setEditingProjectTitle);
    const stopEditing = useCanvasUiStore((state) => state.stopEditingProject);
    const toggleSelected = useCanvasUiStore((state) => state.toggleSelectedProjectId);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const editing = editingId === project.id;
    const open = () => {
        const agentHash = hasAgentUrlBootstrap(window.location.hash) ? window.location.hash : "";
        const target = `/canvas/${project.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}${agentHash}`;
        if (agentHash) router.replace(target);
        else router.push(target);
    };
    const saveTitle = () => {
        renameProject(project.id, editingTitle);
        stopEditing();
    };

    return (
        <Card className="min-w-0 gap-3 rounded-xl pt-0">
            <Button variant="ghost" className="grid aspect-video h-auto w-full place-items-center overflow-hidden rounded-none p-0" onClick={open} disabled={editing} aria-label={`打开 ${project.title}`}>
                <CanvasProjectCover project={project} />
            </Button>
            <CardHeader className="grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <Checkbox checked={selectedIds.includes(project.id)} onCheckedChange={(checked) => toggleSelected(project.id, checked === true)} aria-label={`选择 ${project.title}`} />
                {editing ? (
                    <Input
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") saveTitle();
                            if (event.key === "Escape") stopEditing();
                        }}
                        aria-label="项目名称"
                        autoFocus
                    />
                ) : (
                    <CardTitle className="min-w-0">
                        <Button variant="ghost" className="h-auto w-full justify-start p-0" onClick={open}>
                            <span className="truncate">{project.title}</span>
                        </Button>
                    </CardTitle>
                )}
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{`${project.nodes.length} 个节点 · ${project.connections.length} 条连线`}</CardContent>
            <CardFooter className="flex-wrap justify-between gap-2 border-0 bg-transparent pt-0">
                <p className="text-xs text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString("zh-CN")}</p>
                <div className="flex items-center gap-1">
                    {editing ? (
                        <>
                            <Button variant="ghost" size="icon-sm" onClick={saveTitle} aria-label={"保存名称"}>
                                <Check />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={stopEditing} aria-label={"取消重命名"}>
                                <X />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="icon-sm" onClick={() => void exportCanvasProjects([project], project.title || "Stephen Canvas")} aria-label={"导出"}>
                                <Download />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => startEditing(project.id, project.title)} aria-label={"重命名"}>
                                <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteIds([project.id])} aria-label={"删除"}>
                                <Trash2 />
                            </Button>
                        </>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
