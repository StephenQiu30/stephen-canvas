import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchChannelModels } from "@/services/api/image";
import type { ModelChannel } from "@/stores/use-config-store";

// Channel model selector: fetch upstream models or add them manually, then include checked models in the channel list.
export function ModelSelectModal({ open, channel, selectedNames, onConfirm, onClose }: { open: boolean; channel: ModelChannel | null; selectedNames: string[]; onConfirm: (names: string[]) => void; onClose: () => void }) {
    const { message } = useAppFeedback();
    const [existing, setExisting] = useState<string[]>([]);
    const [fetched, setFetched] = useState<string[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState("new");
    const [search, setSearch] = useState("");
    const [manual, setManual] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setExisting(selectedNames);
        setFetched([]);
        setSelected(new Set(selectedNames));
        setActiveTab(selectedNames.length ? "existing" : "new");
        setSearch("");
        setManual("");
    }, [open, selectedNames]);

    const currentList = activeTab === "new" ? fetched : existing;
    const visibleList = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return keyword ? currentList.filter((name) => name.toLowerCase().includes(keyword)) : currentList;
    }, [currentList, search]);
    const visibleSelectedCount = visibleList.filter((name) => selected.has(name)).length;

    const toggle = (name: string, checked: boolean) =>
        setSelected((current) => {
            const next = new Set(current);
            if (checked) next.add(name);
            else next.delete(name);
            return next;
        });

    const selectVisible = (checked: boolean) =>
        setSelected((current) => {
            const next = new Set(current);
            visibleList.forEach((name) => (checked ? next.add(name) : next.delete(name)));
            return next;
        });

    const addManual = () => {
        const name = manual.trim();
        if (!name) return;
        if (!fetched.includes(name) && !existing.includes(name)) setFetched((current) => [name, ...current]);
        setSelected((current) => new Set(current).add(name));
        setManual("");
        setActiveTab("new");
    };

    const fetchModels = async () => {
        if (!channel) return;
        if (!channel.baseUrl.trim() || !channel.apiKey.trim()) {
            message.error("请先填写接口地址和 API Key");
            return;
        }
        setLoading(true);
        try {
            const models = await fetchChannelModels(channel);
            setFetched(models);
            setActiveTab("new");
            message.success(`已拉取 ${models.length} 个模型`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "拉取模型失败");
        } finally {
            setLoading(false);
        }
    };

    const confirm = () => {
        const ordered = [...existing, ...fetched].filter((name, index, list) => list.indexOf(name) === index).filter((name) => selected.has(name));
        onConfirm(ordered);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent aria-describedby={undefined} className={"max-h-[90dvh] overflow-y-auto"} style={{ width: 880, maxWidth: "calc(100vw - 2rem)" }}>
                <DialogHeader>
                    <DialogTitle>
                        {
                            <span>
                                {"选择渠道模型"} <span className="ml-2 text-xs font-normal text-muted-foreground">{`已选择 ${selected.size} / ${new Set([...existing, ...fetched]).size}`}</span>
                            </span>
                        }
                    </DialogTitle>
                </DialogHeader>
                <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
                    <div className="flex flex-wrap items-center gap-3">
                        <InputGroup className={"min-w-[200px] flex-1"}>
                            <InputGroupAddon>{<Search className="size-4 text-muted-foreground" />}</InputGroupAddon>
                            <InputGroupInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={"搜索模型"} />
                            <InputGroupAddon align="inline-end">
                                <InputGroupButton aria-label="清空" onClick={() => setSearch("")}>
                                    <X />
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                        <Input
                            className="min-w-[180px] flex-1"
                            value={manual}
                            onChange={(event) => setManual(event.target.value)}
                            placeholder={"输入模型名称"}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    addManual();
                                }
                            }}
                        />
                        <Button onClick={addManual} type={"button"} variant={"secondary"} size="default">
                            {"增加模型"}
                        </Button>
                        <Button onClick={() => void fetchModels()} type={"button"} variant={"secondary"} size="default" disabled={Boolean(loading) || false}>
                            {loading ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
                            {"拉取模型列表"}
                        </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{"如果上游不提供 OpenAI /models 模型列表接口，请在这里手动增加模型名称。"}</div>
                    <Tabs className="mt-3" value={activeTab} defaultValue={"new"} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value={"new"}>{`新获取的模型 (${fetched.length})`}</TabsTrigger>
                            <TabsTrigger value={"existing"}>{`已有的模型 (${existing.length})`}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{`当前列表已选择 ${visibleSelectedCount} / ${visibleList.length}`}</span>
                        <div className="flex gap-2">
                            <Button onClick={() => selectVisible(true)} type={"button"} variant={"secondary"} size="sm" disabled={!visibleList.length}>
                                {"全选当前列表"}
                            </Button>
                            <Button onClick={() => selectVisible(false)} type={"button"} variant={"secondary"} size="sm" disabled={!visibleSelectedCount}>
                                {"取消当前列表"}
                            </Button>
                        </div>
                    </div>
                    {visibleList.length ? (
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                            {visibleList.map((name) => (
                                <label key={name} className="flex items-center gap-2">
                                    <Checkbox checked={selected.has(name)} onCheckedChange={(checked) => toggle(name, checked === true)} />
                                    <span className="truncate" title={name}>
                                        {name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">{activeTab === "new" ? "点击「拉取模型列表」获取上游模型，或手动增加模型名称。" : "暂无已选择的模型。"}</div>
                    )}
                </div>
                <DialogFooter>
                    {[
                        <Button key="cancel" onClick={onClose} type={"button"} variant={"secondary"} size="default">
                            {"取消"}
                        </Button>,
                        <Button key="confirm" onClick={confirm} type={"button"} variant={"default"} size="default">
                            {"确定"}
                        </Button>,
                    ]}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
