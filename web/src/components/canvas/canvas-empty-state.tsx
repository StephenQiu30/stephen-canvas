import { Button } from "@/components/ui/button";
import { CanvasNodeType } from "@/types/canvas";
import { ImagePlus, MousePointer2, Music2, Settings2, Type, Video } from "lucide-react";

const creationTools = [
    { type: CanvasNodeType.Image, label: "图片生成", icon: ImagePlus },
    { type: CanvasNodeType.Video, label: "视频生成", icon: Video },
    { type: CanvasNodeType.Audio, label: "音频创作", icon: Music2 },
    { type: CanvasNodeType.Text, label: "文本创作", icon: Type },
    { type: CanvasNodeType.Config, label: "生成配置", icon: Settings2 },
];

export function CanvasEmptyState({ onCreate }: { onCreate: (type: CanvasNodeType) => void }) {
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 pb-32 pt-16 @min-[760px]/canvas:pb-12">
            <div className="flex w-full max-w-5xl flex-col items-center gap-8">
                <p className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MousePointer2 className="size-5" />
                    双击画布，自由添加节点
                </p>
                <div data-canvas-no-zoom className="pointer-events-auto grid w-full grid-cols-2 gap-2 @min-[760px]/canvas:grid-cols-5">
                    {creationTools.map(({ type, label, icon: Icon }) => (
                        <Button key={type} variant="secondary" className="h-14 justify-start gap-3 rounded-2xl px-4" onClick={() => onCreate(type)}>
                            <Icon data-icon="inline-start" aria-hidden />
                            {label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
