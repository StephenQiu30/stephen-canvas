import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { APP_VERSION } from "@/constant/env";
import { useVersionCheck } from "@/hooks/use-version-check";
import type { CSSProperties } from "react";

function getTagColor(type: string) {
    if (type === "新增" || type === "Added") return "green";
    if (type === "修复" || type === "Fixed") return "red";
    if (type === "调整" || type === "Changed") return "blue";
    if (type === "文档" || type === "Docs") return "purple";
    return "default";
}

type VersionReleaseModalProps = {
    className?: string;
    style?: CSSProperties;
};

export function VersionReleaseModal({ className, style }: VersionReleaseModalProps) {
    const { open, setOpen, openReleaseModal, latestVersion, releases, checking, hasNewVersion, checkLatestRelease } = useVersionCheck();

    return (
        <>
            <Button variant="ghost" type="button" className={className || "shrink-0 cursor-pointer text-xs font-medium text-muted-foreground transition hover:text-foreground"} style={style} onClick={openReleaseModal} title={"查看版本更新"}>
                <span className="relative inline-flex">
                    {APP_VERSION}
                    {hasNewVersion ? <span className="absolute -right-1.5 -top-1 size-1.5 rounded-full bg-green-500" /> : null}
                </span>
            </Button>
            <Dialog
                open={open}
                onOpenChange={(open) => {
                    if (!open) (() => setOpen(false))();
                }}
            >
                <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 680, maxWidth: "calc(100vw - 2rem)" }}>
                    <DialogHeader>
                        <DialogTitle>{"版本更新"}</DialogTitle>
                    </DialogHeader>
                    <div>
                        <div className="mb-5 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border p-3 ">
                                <div className="text-xs text-muted-foreground ">{"当前版本"}</div>
                                <div className="mt-1 text-base font-semibold text-foreground ">{APP_VERSION}</div>
                            </div>
                            <div className="rounded-lg border border-border p-3 ">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs text-muted-foreground ">{"最新版本"}</div>
                                    <Button
                                        variant="ghost"
                                        type="button"
                                        className="cursor-pointer bg-transparent p-0 text-[11px] font-normal text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
                                        onClick={() => void checkLatestRelease(true)}
                                    >
                                        {checking ? "检查中..." : "检查更新"}
                                    </Button>
                                </div>
                                <div className="mt-1 text-base font-semibold text-foreground ">{latestVersion}</div>
                            </div>
                        </div>
                        <div className="max-h-[56vh] overflow-y-auto pr-2">
                            <ol className="flex flex-col gap-6">
                                {releases.map((release) => (
                                    <li key={release.version}>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-foreground ">{release.version === "Unreleased" ? "未发布" : release.version}</span>
                                                <span className="text-xs text-muted-foreground ">{release.date}</span>
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    {release.version === latestVersion ? <Badge variant="secondary">{"最新"}</Badge> : null}
                                                    {release.version === APP_VERSION ? <Badge variant={"secondary"}>{"当前"}</Badge> : null}
                                                </div>
                                            </div>
                                            <div className="mt-2 flex flex-col gap-1.5">
                                                {release.items.map((item, index) => (
                                                    <div key={`${release.version}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-brand-body ">
                                                        <Badge className="m-0 mt-0.5 shrink-0 whitespace-nowrap" variant={getTagColor(item.type) === "red" ? "destructive" : "secondary"}>
                                                            {item.type}
                                                        </Badge>
                                                        <span className="min-w-0 flex-1">{item.content}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
