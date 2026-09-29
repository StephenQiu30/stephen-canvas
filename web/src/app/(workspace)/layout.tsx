import { Suspense, type ReactNode } from "react";

import { AnalyticsTracker } from "@/components/layout/analytics-tracker";
import UserLayout from "@/layouts/user-layout";

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <Suspense fallback={null}>
            <UserLayout>
                <AnalyticsTracker />
                {children}
            </UserLayout>
        </Suspense>
    );
}
