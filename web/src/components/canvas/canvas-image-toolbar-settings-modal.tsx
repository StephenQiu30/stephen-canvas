import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Ellipsis, Image as ImageIcon, Settings2 } from "lucide-react";
import { useId, useMemo, type ReactNode } from "react";

import type { ImageQuickToolId } from "./canvas-image-toolbar-tools";

export type ImageToolbarSettingsTool = {
    id: ImageQuickToolId;
    title: string;
    label: string;
    icon: ReactNode;
    active?: boolean;
    danger?: boolean;
};

type PreviewTool =
    | ImageToolbarSettingsTool
    | {
          id: "more";
          title: string;
          label: string;
          icon: ReactNode;
          active?: boolean;
          danger?: boolean;
      };

export function ImageToolSettingsModal({
    open,
    tools,
    selectedIds,
    showLabels,
    onToggle,
    onShowLabelsChange,
    onCancel,
    onSave,
}: {
    open: boolean;
    tools: ImageToolbarSettingsTool[];
    selectedIds: ImageQuickToolId[];
    showLabels: boolean;
    onToggle: (id: ImageQuickToolId, visible: boolean) => void;
    onShowLabelsChange: (value: boolean) => void;
    onCancel: () => void;
    onSave: () => void;
}) {
    const id = useId();
    const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
    const selectedTools = tools.filter((tool) => selected.has(tool.id));
    const previewTools: PreviewTool[] = [...selectedTools, { id: "more", title: "配置快捷工具", label: "更多", icon: <Ellipsis data-icon="inline-start" aria-hidden />, active: true }];

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 760, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle>{"自定义工具栏"}</DialogTitle>
                </DialogHeader>
                <div>
                    <p className="mb-4 text-muted-foreground">{"选择你想在图片节点编辑栏中使用的快捷工具。"}</p>
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>
                                {
                                    <div className={"flex gap-2 items-center"}>
                                        <Settings2 data-icon="inline-start" aria-hidden />
                                        {"节点预览"}
                                    </div>
                                }
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative flex min-h-[300px] w-full justify-center pt-20 pb-9">
                                <div className="thin-scrollbar absolute left-2 right-2 top-3 flex h-12 items-center overflow-x-auto px-1">
                                    {previewTools.map((tool) => (
                                        <PreviewToolbarItem key={tool.id} tool={tool} showLabels={showLabels} />
                                    ))}
                                </div>
                                <div className="flex h-48 w-full max-w-[360px] flex-col items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                                    <ImageIcon className="mb-2" data-icon="inline-start" aria-hidden />
                                    <span className="text-muted-foreground">{"图片节点"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <FieldSet>
                        <FieldLegend variant="label" className="flex items-center gap-2">
                            快捷工具{" "}
                            <Badge variant="secondary">
                                {selectedTools.length}/{tools.length}
                            </Badge>
                        </FieldLegend>
                        <FieldGroup>
                            {tools.map((tool) => (
                                <Field key={tool.id} orientation="horizontal">
                                    <Checkbox id={`${id}-${tool.id}`} checked={selected.has(tool.id)} onCheckedChange={(checked) => onToggle(tool.id, checked === true)} />
                                    <FieldLabel htmlFor={`${id}-${tool.id}`}>
                                        {tool.icon}
                                        {tool.label}
                                    </FieldLabel>
                                </Field>
                            ))}
                        </FieldGroup>
                    </FieldSet>
                </div>
                <DialogFooter>
                    {
                        <div className="flex items-center justify-between gap-3">
                            <Field orientation="horizontal" className="w-auto">
                                <FieldLabel htmlFor={`${id}-labels`}>显示按钮文字</FieldLabel>
                                <Switch id={`${id}-labels`} checked={showLabels} onCheckedChange={onShowLabelsChange} />
                            </Field>
                            <div className={"flex gap-2 items-center"}>
                                <Button onClick={onCancel} type={"button"} variant={"secondary"} size="default">
                                    {"取消"}
                                </Button>
                                <Button onClick={onSave} type={"button"} variant={"default"} size="default">
                                    {"保存"}
                                </Button>
                            </div>
                        </div>
                    }
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PreviewToolbarItem({ tool, showLabels }: { tool: PreviewTool; showLabels: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className={cn("flex h-12 shrink-0 items-center px-1.5 [&_svg]:size-4", tool.danger && "text-destructive")}>
                    <span className={cn("flex h-9 items-center rounded-lg px-2", showLabels ? "gap-2" : "justify-center")}>
                        {tool.icon}
                        {showLabels ? <span className="whitespace-nowrap">{tool.label}</span> : null}
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent side="top">{tool.title}</TooltipContent>
        </Tooltip>
    );
}
