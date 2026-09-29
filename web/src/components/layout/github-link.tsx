import { GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";

type GitHubLinkProps = {
    className?: string;
    style?: React.CSSProperties;
};

export function GitHubLink({ className, style }: GitHubLinkProps) {
    return (
        <Button asChild variant="ghost" size="icon-sm" className={className} style={style}>
            <a
                href="https://github.com/StephenQiu30/stephen-canvas"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                title="GitHub"
            >
                <GitBranch />
            </a>
        </Button>
    );
}
