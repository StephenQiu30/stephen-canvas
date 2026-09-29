"use client";

import { AppConfigPanel } from "@/components/layout/app-config-modal";

export default function ConfigPage() {
    return (
        <main className="h-full overflow-y-auto bg-background">
            <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-4 lg:px-10">
                <div className="mb-5">
                    <h1 className="text-2xl font-semibold text-foreground ">{"配置与用户偏好"}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{"渠道聚合、模型选择、同步与本地存储"}</p>
                </div>
                <AppConfigPanel />
            </div>
        </main>
    );
}
