import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

import { formatDuration } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

export function ImageGenerationPending({ className, label, compact = false }: { className?: string; label?: string; compact?: boolean }) {
    const [tick, setTick] = useState(0);
    const pendingMessages = ["正在创建图片", "马上就好了", "再等等", "正在整理细节"] as string[];

    useEffect(() => {
        const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const index = Math.floor(tick / 2) % pendingMessages.length;
    const progress = Math.min(98, 10 + (1 - Math.exp(-tick / 28)) * 88);

    return (
        <div className={cn("relative overflow-hidden bg-muted", compact ? "min-h-24" : "aspect-[4/3]", className)}>
            <div
                className="absolute inset-0 opacity-60"
                style={{
                    backgroundImage: "radial-gradient(circle, var(--border) 1.4px, transparent 1.6px)",
                    backgroundSize: "16px 16px",
                    maskImage: "radial-gradient(ellipse at 38% 68%, black 0%, black 28%, transparent 60%)",
                }}
            />
            <div className="absolute left-4 top-4 flex items-center gap-2 text-[15px] font-medium text-muted-foreground ">
                <Spinner />
                <span>{label || pendingMessages[index]}</span>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground ">
                    <span>{formatDuration(tick * 1000)}</span>
                    <span>{Math.floor(progress)}%</span>
                </div>
                <Progress value={progress} aria-label="图片生成进度估算" className="h-1.5" />
            </div>
        </div>
    );
}
