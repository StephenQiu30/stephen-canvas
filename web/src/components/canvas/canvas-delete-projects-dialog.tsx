import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { useAssetStore } from "@/stores/use-asset-store";

export function CanvasDeleteProjectsDialog() {
    const ids = useCanvasUiStore((state) => state.deleteProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const removeSelectedIds = useCanvasUiStore((state) => state.removeSelectedProjectIds);
    const deleteProjects = useCanvasStore((state) => state.deleteProjects);
    const cleanupImages = useAssetStore((state) => state.cleanupImages);
    const confirm = () => {
        deleteProjects(ids);
        cleanupImages();
        removeSelectedIds(ids);
        setDeleteIds([]);
    };

    return (
        <Dialog
            open={ids.length > 0}
            onOpenChange={(open) => {
                if (!open) (() => setDeleteIds([]))();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"}>
                <DialogHeader>
                    <DialogTitle>{"删除画布？"}</DialogTitle>
                </DialogHeader>
                <div>
                    <p className="text-sm text-muted-foreground">{`将删除 ${ids.length} 个画布，里面的节点和连线也会一起移除。`}</p>
                </div>
                <DialogFooter>
                    {
                        <>
                            <Button onClick={() => setDeleteIds([])} type={"button"} variant={"secondary"} size="default">
                                {"取消"}
                            </Button>
                            <Button onClick={confirm} type={"button"} variant={"destructive"} size="default">
                                {"删除"}
                            </Button>
                        </>
                    }
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
