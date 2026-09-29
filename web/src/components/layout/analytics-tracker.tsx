"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackPageview } from "@/lib/analytics";

// Observe SPA route changes and report page views; trackPageview is a no-op when analytics is not configured.
export function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams().toString();

    useEffect(() => {
        trackPageview(`${pathname}${searchParams ? `?${searchParams}` : ""}`);
    }, [pathname, searchParams]);

    return null;
}
