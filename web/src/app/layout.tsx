import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";

import { AppProviders } from "@/components/layout/app-providers";
import { BasicLayout } from "@/layouts/basic-layout";

import "streamdown/styles.css";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
    title: "Stephen Canvas",
    description: "AI 图像、视频与创意画布工作台",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    return (
        <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
            <body className="font-sans">
                <Script src={`${basePath}/config.js`} strategy="beforeInteractive" />
                <AppProviders>
                    <Suspense fallback={null}>
                        <BasicLayout>{children}</BasicLayout>
                    </Suspense>
                </AppProviders>
            </body>
        </html>
    );
}
