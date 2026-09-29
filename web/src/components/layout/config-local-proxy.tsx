import { useAppFeedback } from "@/components/ui/app-feedback-provider";
import { Button, Form, Input, Switch } from "@/components/ui/app-primitives";
import { Copy, Network, Wifi } from "lucide-react";
import { useState } from "react";

import { useCopyText } from "@/hooks/use-copy-text";
import { testLocalProxy } from "@/services/api/local-proxy";
import { DEFAULT_LOCAL_PROXY_URL, LOCAL_PROXY_PACKAGE, normalizeLocalProxyUrl, useConfigStore } from "@/stores/use-config-store";

export function ConfigLocalProxy() {
    const { message } = useAppFeedback();
    const copyText = useCopyText();
    const [testing, setTesting] = useState(false);
    const config = useConfigStore((state) => state.config);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const command = localProxyCommand(config.proxyUrl);

    const testProxy = async () => {
        setTesting(true);
        try {
            message.success(`本地代理连接正常（${await testLocalProxy(config.proxyUrl)}）`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "无法连接本地代理，请确认命令已启动且地址填写正确。");
        } finally {
            setTesting(false);
        }
    };

    return (
        <Form layout="vertical" requiredMark={false}>
            <section className="rounded-lg border border-border p-3 ">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Network className="size-4" />
                            {"本地代理"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{"开启后，拉取模型列表、生图、生视频、生成文本、生成音频和 WebDAV 同步等请求都会先发给本机代理再转发出去，用来绕开浏览器跨域限制。"}</div>
                    </div>
                    <Switch checked={config.proxyEnabled} onChange={(checked) => updateConfig("proxyEnabled", checked)} />
                </div>
                {config.proxyEnabled ? (
                    <>
                        <div className="mt-3 rounded-md bg-muted px-3 py-2 ">
                            <div className="mb-1 text-xs text-muted-foreground">{"先在终端运行下面的命令，并在使用画布期间保持运行："}</div>
                            <div className="flex items-center justify-between gap-3">
                                <code className="min-w-0 truncate text-xs">{command}</code>
                                <Button size="small" type="text" icon={<Copy className="size-3.5" />} onClick={() => copyText(command)} />
                            </div>
                        </div>
                        <Form.Item label={"代理地址"} extra={"需要和上面命令启动后打印的地址一致。"} className="mt-3 mb-0">
                            <Input
                                value={config.proxyUrl}
                                placeholder={DEFAULT_LOCAL_PROXY_URL}
                                onChange={(event) => updateConfig("proxyUrl", event.target.value)}
                                onBlur={(event) => updateConfig("proxyUrl", normalizeLocalProxyUrl(event.target.value) || DEFAULT_LOCAL_PROXY_URL)}
                            />
                        </Form.Item>
                        <Button className="mt-3" icon={<Wifi className="size-4" />} loading={testing} onClick={() => void testProxy()}>
                            {"测试连接"}
                        </Button>
                        <div className="mt-3 text-xs text-muted-foreground">{"渠道和 WebDAV 仍填写真实地址，不要填代理地址；关闭开关即可恢复直连。"}</div>
                    </>
                ) : null}
            </section>
        </Form>
    );
}

function localProxyCommand(proxyUrl: string) {
    // Pinned to @latest because npx otherwise reuses whatever version it already cached.
    const command = `npx ${LOCAL_PROXY_PACKAGE}@latest`;
    try {
        const port = new URL(normalizeLocalProxyUrl(proxyUrl) || DEFAULT_LOCAL_PROXY_URL).port;
        return port && port !== new URL(DEFAULT_LOCAL_PROXY_URL).port ? `${command} --port ${port}` : command;
    } catch {
        return command;
    }
}
