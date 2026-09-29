import { Suspense, type ReactNode } from "react";

import { AnalyticsTracker } from "@/components/layout/analytics-tracker";

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <>
            <Suspense fallback={null}>
                <AnalyticsTracker />
            </Suspense>
            {children}
        </>
    );
}
