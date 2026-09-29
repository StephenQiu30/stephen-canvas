"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/app-primitives";
import { useRouter } from "next/navigation";

import { navigationTools } from "@/constant/navigation-tools";

export default function IndexPage() {
    const router = useRouter();
    const [primaryTool] = navigationTools;

    return (
        <main className="relative h-full overflow-y-auto bg-background text-foreground">
            <section className="relative mx-auto flex min-h-full max-w-7xl items-center justify-center overflow-hidden px-6 py-16">
                <div aria-hidden="true" className="home-mesh pointer-events-none absolute inset-[12%] rounded-full opacity-70 dark:opacity-50" />
                <div className="relative flex flex-col items-center justify-center text-center">
                    <h1 className="max-w-5xl text-balance text-5xl font-semibold tracking-[-0.055em] sm:text-7xl lg:text-8xl">{"Stephen Canvas"}</h1>
                    <p className="mt-8 max-w-3xl text-balance text-lg leading-8 text-muted-foreground">
                        一个无限画布创作工具
                    </p>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <Button type="primary" size="large" onClick={() => router.push(`/${primaryTool.slug}`)} icon={<ArrowRight className="size-4" />} iconPlacement="end">
                            {"开始使用"}
                        </Button>
                        <Button size="large" variant="outline" onClick={() => router.push("/canvas")}>
                            {"打开画布"}
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
