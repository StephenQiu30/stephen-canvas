"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export function AppFooter() {
    const pathname = usePathname();

    if (/^\/canvas\/[^/]+$/.test(pathname)) return null;

    return (
        <footer className="h-10 shrink-0 border-t border-border bg-background">
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2">
                    <Link href="/" className="shrink-0 font-medium text-foreground transition hover:text-muted-foreground">
                        {"Stephen Canvas"}
                    </Link>
                    <span aria-hidden="true">·</span>
                    <span className="hidden truncate sm:inline">{"开源 AI 创作工作台"}</span>
                </div>
                <a
                    href="https://github.com/StephenQiu30/stephen-canvas"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 transition hover:text-foreground"
                    aria-label={"项目仓库"}
                >
                    {"项目仓库"}
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
            </div>
        </footer>
    );
}
