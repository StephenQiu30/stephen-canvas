"use client";

import { Video } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getImagePreviewRevision, subscribeImagePreviews } from "@/services/image-storage";
import { assetCoverUrl, type Asset } from "@/stores/use-asset-store";

export function AssetCard({ asset, href, onOpen, children }: { asset: Asset; href?: string; onOpen?: () => void; children?: ReactNode }) {
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision, () => 0);
    const cover = assetCoverUrl(asset);
    const preview = (
        <>
            {cover ? (
                <img src={cover} alt="" loading="lazy" className="size-full object-cover motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover/card:scale-[1.03]" />
            ) : asset.kind === "text" ? (
                <p className="line-clamp-4 whitespace-normal px-6 text-left text-sm leading-6 text-muted-foreground">{asset.data.content}</p>
            ) : (
                <Video className="size-8 text-muted-foreground" strokeWidth={1.5} />
            )}
        </>
    );
    return (
        <Card variant="interactive" size="sm" className="h-full gap-2 overflow-visible rounded-none border-0 bg-transparent py-0 shadow-none ring-0">
            {href ? (
                <Link
                    href={href}
                    className="grid aspect-video place-items-center overflow-hidden rounded-xl border border-border bg-muted outline-none group-hover/card:border-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`查看 ${asset.title}`}
                >
                    {preview}
                </Link>
            ) : (
                <Button variant="ghost" className="grid aspect-video h-auto w-full overflow-hidden rounded-xl border border-border bg-muted p-0 group-hover/card:border-muted-foreground/40" onClick={onOpen} aria-label={`查看 ${asset.title}`}>
                    {preview}
                </Button>
            )}
            {children && <div className="absolute right-2 top-2 z-10 rounded-md bg-background/90 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 [@media(hover:none)]:opacity-100">{children}</div>}
            <CardHeader className="px-2">
                <CardTitle className="truncate" title={asset.title}>
                    {href ? (
                        <Link href={href} className="outline-none">
                            {asset.title}
                        </Link>
                    ) : (
                        <Button variant="ghost" className="h-auto w-full justify-start p-0" onClick={onOpen}>
                            <span className="truncate">{asset.title}</span>
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
        </Card>
    );
}
