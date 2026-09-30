import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const sizeOptions = ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"];

type CanvasSizePickerProps = {
    value: string;
    className?: string;
    onChange: (value: string) => void;
};

export function CanvasSizePicker({ value, className, onChange }: CanvasSizePickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const extraOptions = [value, search.trim()].filter((item) => item && !sizeOptions.includes(item));
    const options = [...sizeOptions, ...Array.from(new Set(extraOptions))].map((size) => ({ value: size, label: size }));
    const selectSize = (next: string) => {
        onChange(next.trim());
        setSearch("");
        setOpen(false);
    };

    return (
        <div className={className}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button aria-label={"比例"} type={"button"} variant={"ghost"} size="default" className={cn("canvas-compact-control canvas-control-select h-full w-full justify-between", className)}>
                        <span className="truncate">{value || "比例"}</span>
                        <ChevronDown className="shrink-0 opacity-60" data-icon="inline-start" aria-hidden />
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="center" className={"w-48 p-2"}>
                    {
                        <div className="flex flex-col gap-1">
                            <Input
                                aria-label="搜索或输入比例"
                                autoFocus
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && !event.nativeEvent.isComposing && search.trim() && selectSize(search)}
                                placeholder={"比例"}
                            />
                            <div className="max-h-56 overflow-y-auto">
                                {options
                                    .filter((option) => !search || option.value.toLowerCase().includes(search.trim().toLowerCase()))
                                    .map((option) => (
                                        <Button variant="ghost" key={option.value} type="button" className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground" onClick={() => selectSize(option.value)}>
                                            {option.label}
                                        </Button>
                                    ))}
                            </div>
                        </div>
                    }
                </PopoverContent>
            </Popover>
        </div>
    );
}
