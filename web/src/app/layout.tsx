import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/layout/app-providers";

import "streamdown/styles.css";
import "./globals.css";

export const metadata: Metadata = {
    title: "Stephen Canvas",
    description: "AI 图像、视频与创意画布工作台",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <body>
                <Script src={`${basePath}/config.js`} strategy="beforeInteractive" />
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
