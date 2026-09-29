import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { useCallback, useEffect, useMemo, useState } from "react";

import { APP_RELEASES, APP_VERSION } from "@/constant/env";
import { parseChangelog, type ReleaseInfo } from "@/lib/release";

const latestChangelogUrl = "https://raw.githubusercontent.com/StephenQiu30/stephen-canvas/main/CHANGELOG.md";

function readLocalReleases(): ReleaseInfo[] {
    return APP_RELEASES;
}

function toVersionParts(version: string) {
    const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
    return match ? match.slice(1).map(Number) : null;
}

function latestReleaseVersion(changelog: string) {
    return parseChangelog(changelog).find((release) => release.version !== "Unreleased")?.version;
}

function isNewerVersion(latestVersion: string, currentVersion: string) {
    const latest = toVersionParts(latestVersion);
    const current = toVersionParts(currentVersion);
    if (!latest || !current) return false;
    return latest.some((value, index) => value > current[index] && latest.slice(0, index).every((part, prevIndex) => part === current[prevIndex]));
}

export function useVersionCheck() {
    const currentVersion = APP_VERSION;
    const { message } = useAppFeedback();
    const localReleases = useMemo(readLocalReleases, []);
    const [latestVersion, setLatestVersion] = useState(currentVersion);
    const [releases, setReleases] = useState<ReleaseInfo[]>(localReleases);
    const [checking, setChecking] = useState(false);
    const [open, setOpen] = useState(false);
    const hasNewVersion = isNewerVersion(latestVersion, currentVersion);

    const checkLatestVersion = useCallback(async () => {
        try {
            const response = await fetch(latestChangelogUrl);
            if (!response.ok) return false;
            const version = latestReleaseVersion(await response.text());
            if (!version) return false;
            setLatestVersion(version);
            return true;
        } catch {
            return false;
        }
    }, [currentVersion]);

    const checkLatestRelease = useCallback(
        async (showMessage = false) => {
            setChecking(true);
            try {
                const changelogResponse = await fetch(latestChangelogUrl);
                if (!changelogResponse.ok) throw new Error("更新日志读取失败");
                const changelog = await changelogResponse.text();
                const version = latestReleaseVersion(changelog);
                if (!version) throw new Error("版本读取失败");
                setLatestVersion(version);
                setReleases(parseChangelog(changelog));
                if (showMessage) message.success("已获取最新版本信息");
                return true;
            } catch {
                setLatestVersion(currentVersion);
                setReleases(localReleases);
                if (showMessage) message.error("获取最新版本信息失败");
                return false;
            } finally {
                setChecking(false);
            }
        },
        [currentVersion, localReleases, message],
    );

    useEffect(() => {
        void checkLatestVersion();
    }, [checkLatestVersion]);

    const openReleaseModal = useCallback(() => {
        setOpen(true);
        void checkLatestRelease();
    }, [checkLatestRelease]);

    return {
        open,
        setOpen,
        openReleaseModal,
        latestVersion,
        releases,
        checking,
        hasNewVersion,
        checkLatestRelease,
    };
}
