import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ImageIcon, List, Music2, Settings2, Video, X } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { listNodeDefinitions, useNodeRegistryVersion } from "@/lib/canvas/node-registry";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type ConnectionHandle, type Position } from "@/types/canvas";

export type PendingConnectionCreate = {
    connection: ConnectionHandle;
    position: Position;
};

export function ConnectionCreateMenu({
    pending,
    onCreate,
    onClose,
}: {
    pending: PendingConnectionCreate;
    onCreate: (type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Config | CanvasNodeType.Video | CanvasNodeType.Audio) => void;
    onClose: () => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    return (
        <Popover
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <PopoverAnchor asChild>
                <span className="absolute" style={{ left: pending.position.x, top: pending.position.y }} />
            </PopoverAnchor>
            <PopoverContent align="start" sideOffset={0} className="w-[300px] p-3" data-connection-create-menu onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-sm font-medium" style={{ color: theme.node.muted }}>
                        {"引用该节点生成"}
                    </span>
                    <Button variant="ghost" type="button" className="grid size-7 place-items-center rounded-lg text-base opacity-55 transition hover:bg-white/10 hover:opacity-100" onClick={onClose} aria-label={"关闭"}>
                        ×
                    </Button>
                </div>
                <div className="grid gap-1">
                    <ConnectionCreateOption theme={theme} icon={<List className="size-5" />} title={"文本生成"} description={"脚本、广告词、品牌文案"} onClick={() => onCreate(CanvasNodeType.Text)} />
                    <ConnectionCreateOption theme={theme} icon={<ImageIcon className="size-5" />} title={"图片生成"} onClick={() => onCreate(CanvasNodeType.Image)} />
                    <ConnectionCreateOption theme={theme} icon={<Video className="size-5" />} title={"视频生成"} onClick={() => onCreate(CanvasNodeType.Video)} />
                    <ConnectionCreateOption theme={theme} icon={<Music2 className="size-5" />} title={"音频参考"} onClick={() => onCreate(CanvasNodeType.Audio)} />
                    <ConnectionCreateOption theme={theme} icon={<Settings2 className="size-5" />} title={"配置节点"} description={"模型、尺寸、数量和输入顺序"} onClick={() => onCreate(CanvasNodeType.Config)} />
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function ConnectionCreateOption({ theme, icon, title, description, onClick }: { theme: (typeof canvasThemes)[keyof typeof canvasThemes]; icon: React.ReactNode; title: string; description?: string; onClick?: () => void }) {
    return (
        <Button variant="ghost" type="button" className="flex h-16 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left transition" onClick={onClick}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-base font-semibold leading-5">{title}</span>
                {description ? (
                    <span className="mt-1 block truncate text-sm" style={{ color: theme.node.muted }}>
                        {description}
                    </span>
                ) : null}
            </span>
        </Button>
    );
}

export function NodeCreateMenu({ position, onCreate, onClose }: { position: Position; onCreate: (type: string) => void; onClose: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    useNodeRegistryVersion();
    const definitions = listNodeDefinitions().filter((def) => def.showInCreateMenu !== false);
    return (
        <Popover
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <PopoverAnchor asChild>
                <span className="absolute" style={{ left: position.x, top: position.y }} />
            </PopoverAnchor>
            <PopoverContent align="start" sideOffset={0} className="max-h-[70vh] w-[300px] overflow-y-auto p-3" data-canvas-no-zoom onPointerDown={(event) => event.stopPropagation()}>
                <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-sm font-medium" style={{ color: theme.node.muted }}>
                        {"选择节点"}
                    </span>
                    <Button variant="ghost" type="button" className="grid size-7 place-items-center rounded-lg opacity-55 transition hover:opacity-100" onClick={onClose} aria-label={"关闭"}>
                        <X className="size-4" />
                    </Button>
                </div>
                <div className="grid gap-1">
                    {definitions.map((def) => (
                        <ConnectionCreateOption key={def.type} theme={theme} icon={def.icon} title={def.title} description={def.description} onClick={() => onCreate(def.type)} />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
