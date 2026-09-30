import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Search } from "lucide-react";
import { useState } from "react";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import type { CanvasNodeData } from "@/types/canvas";

export function CanvasNodeSearchDialog({ open, nodes, title = "搜索节点", onSelect, onClose }: { open: boolean; nodes: CanvasNodeData[]; title?: string; onSelect: (id: string) => void; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const filtered = nodes.filter((node) => [node.title, node.metadata?.prompt, node.type === "text" ? node.metadata?.content : ""].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase())));
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    setQuery("");
                    onClose();
                }
            }}
        >
            <DialogContent
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    document.querySelector<HTMLElement>("[data-canvas-viewport]")?.focus({ preventScroll: true });
                }}
                aria-describedby={undefined}
                className="max-h-[80dvh] overflow-hidden"
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <InputGroup>
                    <InputGroupInput
                        aria-label="搜索节点名称或提示词"
                        placeholder="搜索节点名称或提示词"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.nativeEvent.isComposing && filtered[0]) {
                                onSelect(filtered[0].id);
                                setQuery("");
                                onClose();
                            }
                        }}
                    />
                    <InputGroupAddon>
                        <Search aria-hidden />
                    </InputGroupAddon>
                </InputGroup>
                <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
                    {filtered.map((node) => (
                        <Button
                            key={node.id}
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                                onSelect(node.id);
                                setQuery("");
                                onClose();
                            }}
                        >
                            {getNodeDefinition(node.type)?.icon}
                            <span className="truncate">{node.title || "未命名节点"}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{getNodeDefinition(node.type)?.title || node.type}</span>
                        </Button>
                    ))}
                    {!filtered.length ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyDescription>没有匹配的节点</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
