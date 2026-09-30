"use client";

import dayjs from "dayjs";
import { Check, Download, Ellipsis, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";

import { CanvasProjectCover } from "@/components/canvas/canvas-project-cover";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { cn } from "@/lib/utils";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";

export function CanvasProjectCard({ project, compact = false }: { project: CanvasProject; compact?: boolean }) {
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
    const href = `/canvas/${project.id}`;
    const date = dayjs(project.updatedAt).format("YYYY-MM-DD");
    const saveTitle = () => {
        renameProject(project.id, editingTitle);
        stopEditing();
    };
    const actions = editing ? (
        <div className="relative z-10 flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={saveTitle} aria-label="保存名称">
                <Check />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={stopEditing} aria-label="取消重命名">
                <X />
            </Button>
        </div>
    ) : (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn("relative z-10 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 [@media(hover:none)]:opacity-100", !compact && "bg-background/90 hover:bg-background")}
                    aria-label={`${project.title} 的更多操作`}
                >
                    <Ellipsis />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => startEditing(project.id, project.title)}>
                        <Pencil />
                        重命名
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void exportCanvasProjects([project], project.title || "Stephen Canvas")}>
                        <Download />
                        导出项目
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteIds([project.id])}>
                        <Trash2 />
                        删除项目
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <Card
            variant="interactive"
            size="sm"
            data-selected={!compact && selectedIds.includes(project.id)}
            className={cn("h-full", compact ? "flex-row items-center gap-3 rounded-3xl bg-transparent p-1" : "gap-2 overflow-visible rounded-none border-0 bg-transparent py-0 shadow-none ring-0")}
        >
            {!editing && <Link href={href} className="absolute inset-0 rounded-[inherit] outline-none" aria-label={`打开 ${project.title}`} />}
            <div
                className={cn(
                    "pointer-events-none grid shrink-0 place-items-center overflow-hidden bg-muted",
                    compact
                        ? "size-20 rounded-xl"
                        : "aspect-video w-full rounded-xl border border-border group-hover/card:border-muted-foreground/40 group-focus-within/card:ring-2 group-focus-within/card:ring-ring group-data-[selected=true]/card:ring-2 group-data-[selected=true]/card:ring-ring",
                )}
            >
                <CanvasProjectCover project={project} />
            </div>
            {!compact && (
                <>
                    <span className="absolute left-2 top-2 z-10 grid size-7 place-items-center rounded-md bg-background/90 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 group-data-[selected=true]/card:opacity-100 [@media(hover:none)]:opacity-100">
                        <Checkbox checked={selectedIds.includes(project.id)} onCheckedChange={(checked) => toggleSelected(project.id, checked === true)} aria-label={`选择 ${project.title}`} />
                    </span>
                    <div className="absolute right-2 top-2 z-10">{actions}</div>
                </>
            )}
            <CardHeader className={cn("min-w-0", compact ? "flex-1 items-center gap-1.5 pl-0 pr-1" : "gap-1 px-2")}>
                {editing ? (
                    <Input
                        className="relative z-10"
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
                    <CardTitle className="truncate" title={project.title}>
                        {project.title}
                    </CardTitle>
                )}
                <CardDescription className="truncate">
                    <time dateTime={project.updatedAt} className="text-xs tabular-nums">
                        {date}
                    </time>
                </CardDescription>
                {compact && <CardAction>{actions}</CardAction>}
            </CardHeader>
        </Card>
    );
}
