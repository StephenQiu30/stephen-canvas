import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Ellipsis, Image as ImageIcon, Settings2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";

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
    const token = {
        colorBgElevated: "var(--popover)",
        colorBorderSecondary: "var(--border)",
        boxShadowSecondary: "0 8px 30px rgb(0 0 0 / 12%)",
        colorText: "var(--foreground)",
        colorFillAlter: "var(--muted)",
        colorTextSecondary: "var(--muted-foreground)",
    };
    const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
    const selectedTools = tools.filter((tool) => selected.has(tool.id));
    const previewTools: PreviewTool[] = [...selectedTools, { id: "more", title: "配置快捷工具", label: "更多", icon: <Ellipsis className="size-4" />, active: true }];

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
                    <p className={cn("secondary" === "secondary" && "text-muted-foreground", "!mb-4")}>{"选择你想在图片节点编辑栏中使用的快捷工具。"}</p>
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>
                                {
                                    <div className={"flex gap-2 items-center"}>
                                        <Settings2 className="size-4" />
                                        {"节点预览"}
                                    </div>
                                }
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative flex min-h-[300px] w-full justify-center pt-20 pb-9">
                                <div
                                    className="thin-scrollbar absolute left-2 right-2 top-3 z-10 flex h-12 items-center overflow-x-auto rounded-[18px] border px-1 text-[13px]"
                                    style={{ background: token.colorBgElevated, borderColor: token.colorBorderSecondary, boxShadow: token.boxShadowSecondary, color: token.colorText }}
                                >
                                    {previewTools.map((tool) => (
                                        <PreviewToolbarItem key={tool.id} tool={tool} showLabels={showLabels} />
                                    ))}
                                </div>
                                <div className="flex h-48 w-full max-w-[360px] flex-col items-center justify-center rounded-xl border" style={{ background: token.colorFillAlter, borderColor: token.colorBorderSecondary, color: token.colorTextSecondary }}>
                                    <ImageIcon className="mb-2 size-8" />
                                    <span className="text-muted-foreground">{"图片节点"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <FieldGroup className={"!mb-0"}>
                        <Field className="!mb-4">
                            <FieldLabel>
                                {
                                    <div className={"flex gap-2 items-center"}>
                                        <span>{"快捷工具"}</span>
                                        <Badge className="m-0" variant={"secondary"}>
                                            {selectedTools.length}/{tools.length}
                                        </Badge>
                                    </div>
                                }
                            </FieldLabel>
                            <FieldSet>
                                {tools.map((tool) => (
                                    <label key={tool.id} className="flex items-center gap-2">
                                        <Checkbox checked={selected.has(tool.id)} onCheckedChange={(checked) => onToggle(tool.id, checked === true)} />
                                        <span className="inline-flex items-center gap-2">
                                            {tool.icon}
                                            {tool.label}
                                        </span>
                                    </label>
                                ))}
                            </FieldSet>
                        </Field>
                    </FieldGroup>
                </div>
                <DialogFooter>
                    {
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span>{"显示按钮文字"}</span>
                                <Switch checked={showLabels} onCheckedChange={onShowLabelsChange} />
                            </div>
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
                <span className="flex h-12 shrink-0 items-center px-1.5" style={{ color: tool.danger ? "#ef4444" : undefined }}>
                    <span className={`flex h-9 items-center rounded-lg px-2 ${showLabels ? "gap-2" : "justify-center"}`}>
                        {tool.icon}
                        {showLabels ? <span className="whitespace-nowrap">{tool.label}</span> : null}
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent side="top">{tool.title}</TooltipContent>
        </Tooltip>
    );
}
