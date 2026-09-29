import type { CSSProperties } from "react";
import { Modal, Tag, Timeline } from "@/components/ui/app-primitives";
import { useVersionCheck } from "@/hooks/use-version-check";
import { APP_VERSION } from "@/constant/env";

function getTagColor(type: string) {
    if (type === "新增" || type === "Added") return "green";
    if (type === "修复" || type === "Fixed") return "red";
    if (type === "调整" || type === "Changed") return "blue";
    if (type === "文档" || type === "Docs") return "purple";
    return "default";
}

function releaseTypeLabel(type: string) {
    const key = ({ 新增: "added", 修复: "fixed", 调整: "changed", 优化: "optimized", 文档: "docs" } as Record<string, string>)[type];
    return key ? (({ "added":"新增", "fixed":"修复", "changed":"调整", "optimized":"优化", "docs":"文档" } as Record<string, string>)[String(key)] || String(key)) : type;
}

type VersionReleaseModalProps = {
    className?: string;
    style?: CSSProperties;
};

export function VersionReleaseModal({ className, style }: VersionReleaseModalProps) {
    const { open, setOpen, openReleaseModal, latestVersion, releases, checking, hasNewVersion, checkLatestRelease } = useVersionCheck();

    return (
        <>
            <button
                type="button"
                className={className || "shrink-0 cursor-pointer text-xs font-medium text-muted-foreground transition hover:text-foreground"}
                style={style}
                onClick={openReleaseModal}
                title={"查看版本更新"}
            >
                <span className="relative inline-flex">
                    {APP_VERSION}
                    {hasNewVersion ? <span className="absolute -right-1.5 -top-1 size-1.5 rounded-full bg-green-500" /> : null}
                </span>
            </button>
            <Modal title={"版本更新"} open={open} width={680} centered footer={null} onCancel={() => setOpen(false)}>
                <div className="mb-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3 ">
                        <div className="text-xs text-muted-foreground ">{"当前版本"}</div>
                        <div className="mt-1 text-base font-semibold text-foreground ">{APP_VERSION}</div>
                    </div>
                    <div className="rounded-lg border border-border p-3 ">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-muted-foreground ">{"最新版本"}</div>
                            <button
                                type="button"
                                className="cursor-pointer bg-transparent p-0 text-[11px] font-normal text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
                                onClick={() => void checkLatestRelease(true)}
                            >
                                {(checking ? "检查中..." : "检查更新")}
                            </button>
                        </div>
                        <div className="mt-1 text-base font-semibold text-foreground ">{latestVersion}</div>
                    </div>
                </div>
                <div className="max-h-[56vh] overflow-y-auto pr-2">
                    <Timeline
                        items={releases.map((release) => ({
                            content: (
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground ">{release.version === "Unreleased" ? "未发布" : release.version}</span>
                                        <span className="text-xs text-muted-foreground ">{release.date}</span>
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            {release.version === latestVersion ? <Tag color="green">{"最新"}</Tag> : null}
                                            {release.version === APP_VERSION ? <Tag>{"当前"}</Tag> : null}
                                        </div>
                                    </div>
                                    <div className="mt-2 space-y-1.5">
                                        {release.items.map((item, index) => (
                                            <div key={`${release.version}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-brand-body ">
                                                <Tag color={getTagColor(item.type)} className="m-0 mt-0.5 shrink-0 whitespace-nowrap">
                                                    {releaseTypeLabel(item.type)}
                                                </Tag>
                                                <span className="min-w-0 flex-1">{item.content}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ),
                        }))}
                    />
                </div>
            </Modal>
        </>
    );
}
