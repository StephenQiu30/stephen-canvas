import axios, { type AxiosRequestConfig } from "axios";

import { buildApiUrl, withLocalProxy, type AiConfig, type ModelCapability } from "@/stores/use-config-store";

type RequestOptions = { signal?: AbortSignal };

export type PluginHttpOptions = {
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    responseType?: "json" | "blob" | "text" | "arraybuffer";
};

export type PluginHttp = {
    url: (path: string) => string;
    post: (path: string, body?: unknown, options?: PluginHttpOptions) => Promise<unknown>;
    get: (path: string, options?: PluginHttpOptions) => Promise<unknown>;
};

export type PluginPollOptions = { intervalMs?: number; timeoutMs?: number };

export type RunPluginArgs = {
    capability: ModelCapability;
    script: string;
    config: AiConfig;
    prompt?: string;
    images?: string[];
    videos?: File[];
    audios?: File[];
    messages?: unknown[];
    params?: Record<string, unknown>;
    signal?: AbortSignal;
    onDelta?: (text: string) => void;
};

function pluginHeaders(extra?: Record<string, string>, hasJsonBody = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (hasJsonBody) headers["Content-Type"] = "application/json";
    return { ...headers, ...extra };
}

function pluginUrl(config: AiConfig, path: string) {
    if (/^https?:/i.test(path)) return withLocalProxy(path);
    return buildApiUrl(config.baseUrl, path.startsWith("/") ? path : `/${path}`);
}

function createPluginHttp(config: AiConfig, options?: RequestOptions): PluginHttp {
    const run = async (method: "get" | "post", path: string, body: unknown, opts?: PluginHttpOptions) => {
        const isForm = typeof FormData !== "undefined" && body instanceof FormData;
        const response = await axios.request({
            method,
            url: pluginUrl(config, path),
            data: method === "post" ? body : undefined,
            params: opts?.params,
            headers: pluginHeaders({ Authorization: `Bearer ${config.apiKey}`, ...opts?.headers }, method === "post" && !isForm && body !== undefined),
            responseType: opts?.responseType || "json",
            signal: options?.signal,
        });
        return response.data;
    };
    return {
        url: (path) => pluginUrl(config, path),
        post: (path, body, opts) => run("post", path, body, opts),
        get: (path, opts) => run("get", path, undefined, opts),
    };
}

/** Raw request with no automatic auth header — the script controls method, url, headers, body entirely. */
function createPluginRequest(config: AiConfig, options?: RequestOptions) {
    return async (requestConfig: AxiosRequestConfig & { url: string }) => {
        const response = await axios.request({ ...requestConfig, url: pluginUrl(config, requestConfig.url), signal: options?.signal });
        return response.data;
    };
}

function sleep(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}

function createPoll(signal?: AbortSignal) {
    return async function poll<T, R>(request: () => Promise<T>, extract: (value: T) => R | null | undefined | false, options?: PluginPollOptions): Promise<R> {
        const intervalMs = options?.intervalMs ?? 2500;
        const timeoutMs = options?.timeoutMs ?? 300000;
        const deadline = performance.now() + timeoutMs;
        for (;;) {
            if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
            const result = extract(await request());
            if (result !== null && result !== undefined && result !== false) return result;
            if (performance.now() >= deadline) throw new Error("插件轮询超时，请检查调用脚本或稍后重试");
            await sleep(intervalMs, signal);
        }
    };
}

/**
 * Run a user-authored model call script. Locals are injected (see PLUGIN_VARIABLES); templates wrap them in an async function.
 * The script still runs as an async function body and must `return` the result.
 */
export async function runModelPlugin<T = unknown>(args: RunPluginArgs): Promise<T> {
    const { config } = args;
    const http = createPluginHttp(config, { signal: args.signal });
    const request = createPluginRequest(config, { signal: args.signal });
    const poll = createPoll(args.signal);
    const runner = new Function(
        "prompt",
        "images",
        "videos",
        "audios",
        "messages",
        "params",
        "model",
        "baseUrl",
        "apiKey",
        "systemPrompt",
        "reasoningEffort",
        "http",
        "request",
        "poll",
        "sleep",
        "signal",
        "onDelta",
        `"use strict"; return (async () => {\n${args.script}\n})();`,
    ) as (...fnArgs: unknown[]) => Promise<T>;
    try {
        return await runner(
            args.prompt || "",
            args.images || [],
            args.videos || [],
            args.audios || [],
            args.messages || [],
            args.params || {},
            config.model,
            config.baseUrl,
            config.apiKey,
            config.systemPrompt || "",
            config.reasoningEffort,
            http,
            request,
            poll,
            (ms: number) => sleep(ms, args.signal),
            args.signal,
            args.onDelta,
        );
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (axios.isCancel(error)) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`模型调用脚本执行失败：${message}`);
    }
}

export type PluginVariable = { name: string; type: string; desc: string; capabilities?: ModelCapability[] };

/** Documentation surface shown in the script editor. */
export function getPluginVariables(): PluginVariable[] {
    return [
        { name: "prompt", type: "string", desc: "用户输入的提示词（已拼接系统提示词）", capabilities: ["image", "video", "audio"] },
        { name: "images", type: "string[]", desc: "参考图，dataURL 数组（改图 / 图生视频时有值）", capabilities: ["image", "video"] },
        { name: "videos", type: "File[]", desc: "参考视频 File 数组，可直接 form.append；画布或工作台接入的参考视频，无则为空数组", capabilities: ["video"] },
        { name: "audios", type: "File[]", desc: "参考音频 File 数组，可直接 form.append；画布或工作台接入的参考音频，无则为空数组", capabilities: ["video"] },
        { name: "messages", type: "{ role, content }[]", desc: "对话消息数组，含系统消息", capabilities: ["text"] },
        { name: "params", type: "object", desc: "生成参数：生图 {size,quality,count,background}、视频 {mode,seconds,size,resolution,ratio,generateAudio,watermark}（mode 为 frames 首尾帧或 reference 全能参考；超过 2 张图时为 reference）、音频 {voice,format,speed,instructions}" },
        { name: "model", type: "string", desc: "模型名称（不含渠道前缀）" },
        { name: "baseUrl", type: "string", desc: "渠道接口地址（原样，未拼 /v1）" },
        { name: "apiKey", type: "string", desc: "渠道 API Key，请求头里自己带上" },
        { name: "systemPrompt", type: "string", desc: "系统提示词原文" },
        { name: "reasoningEffort", type: '"auto" | "low" | "medium" | "high" | "xhigh"', desc: "文本推理强度；auto 表示由脚本决定是否传递", capabilities: ["text"] },
        { name: "http", type: "object", desc: "便捷请求：http.post(path, body, {headers,params,responseType})、http.get(path, opts)、http.url(path)；默认带 Authorization: Bearer apiKey，可用 headers 覆盖；path 相对时按 baseUrl 拼 /v1" },
        { name: "request", type: "function", desc: "原始请求 request({ method, url, headers, params, data, responseType })，不加任何默认头，鉴权头自己写；url 相对时按 baseUrl 拼接（不加 /v1）" },
        { name: "poll", type: "function", desc: "轮询 poll(request, extract, {intervalMs,timeoutMs})，extract 返回真值即结束" },
        { name: "sleep", type: "function", desc: "sleep(ms) 延时" },
        { name: "signal", type: "AbortSignal", desc: "取消信号，可透传给 http/request" },
        { name: "onDelta", type: "function", desc: "onDelta(text) 推送流式文本（文本模型）", capabilities: ["text"] },
    ];
}

export function getPluginReturn(capability: ModelCapability) {
    return (({ "image":"文生图（images 为空）和图生图（images 有参考图）接口不同，脚本需自行区分；返回图片 URL 或 dataURL 字符串，也可返回它们的数组，或 [{ dataUrl }] / [{ url }] / [{ b64_json }]", "video":"脚本内部完成轮询，返回 { url } 或 { blob } 或视频 URL 字符串", "audio":"返回 Blob，或 base64 / dataURL 字符串，或 { b64_json } / { data } / { url }", "text":"用 onDelta(text) 推送流式，最终 return 完整文本字符串" } as Record<string, string>)[String(capability)] || String(capability));
}

export function getPluginAuthoringPrompt(capability: ModelCapability, modelName: string, draft = "") {
    const variables = getPluginVariables().filter((variable) => !variable.capabilities || variable.capabilities.includes(capability));
    const lines = [
        `请为 Stephen Canvas 编写一段模型调用脚本。能力类型：${(({ "image":"生图", "video":"视频", "text":"文本", "audio":"音频" } as Record<string, string>)[String(capability)] || String(capability))}。目标模型：${modelName || "（当前选中的模型）"}。`,
        "",
        "请写成一个 async function，把用到的变量写在参数列表里，并把 params 拆成 size、quality、count 等字段，方便对照。不要 import，不要 Markdown 代码围栏。函数内发请求并 return 结果；因为运行时会注入同名局部变量，最后需要 return await 函数名({ 同样的参数 })。",
        "",
        "返回要求",
        getPluginReturn(capability),
        "",
        "可用变量",
        ...variables.map((variable) => `- ${variable.name} (${variable.type}): ${variable.desc}`),
        "",
        "写法要求",
        "- 写成 async function，参数列表列出用到的变量；params 拆开写出 size、quality、count、seconds 等字段。函数上方用 /** */ 注释写清每个字段。\n- 用 request({ method, url, headers, params, data, responseType }) 发原始 HTTP 请求；需要自动带 Authorization: Bearer apiKey 时用 http.post / http.get。\n- 相对路径：request 按 baseUrl 拼接且不加 /v1；http 的相对 path 会按 baseUrl 拼 /v1。\n- 异步视频任务通常先创建再 poll(request, extract, { intervalMs, timeoutMs })，extract 返回真值即结束。\n- images 是参考图 dataURL 字符串数组。videos、audios 是参考视频/音频 File 数组，可直接 form.append(字段名, file)；没有参考时为空数组。\n- 使用 FormData 时不要手动设置 Content-Type，交给浏览器带 boundary。\n- 函数末尾 return 结果，并在文件最后 return await 函数名({ 同样的参数 })。只输出完整脚本，不要解释。",
    ];
    const templates = getPluginTemplates()[capability];
    if (templates.length) {
        lines.push("", "完整示例（请按实际接口改写，不要原样照搬）");
        for (const template of templates) {
            lines.push("", `${template.label}`, template.script);
        }
    }
    if (draft.trim()) {
        lines.push("", "用户当前草稿（请在此基础上修改；若为空则从零编写）", draft.trim());
    }
    return lines.join("\n");
}

export type PluginTemplate = { label: string; script: string };

export function getPluginTemplates(): Record<ModelCapability, PluginTemplate[]> {
    return {
    image: [
        {
            label: "OpenAI 规范",
            script: `/**
 * OpenAI image generation and editing.
 * Text-to-image uses POST /v1/images/generations (JSON) when images is empty.
 * Image editing uses POST /v1/images/edits (multipart) when images has data URLs.
 * @param {string} prompt
 * @param {string[]} images - reference images as data URLs; empty for text-to-image
 * @param {object} params
 * @param {string} params.size - output size, e.g. "1024x1024" or "auto"
 * @param {string} params.quality - "low" | "medium" | "high"
 * @param {number} params.count - number of images
 * @param {string} [params.background] - "transparent" when requested
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {function} request - raw HTTP helper; relative urls join baseUrl without /v1
 * @returns {Promise<string[]>} image URLs or data URLs
 */
async function generateImage({
  prompt,
  images,
  params: {
    size,
    quality,
    count,
    background,
  },
  model,
  baseUrl,
  apiKey,
  request,
}) {
  if (images.length === 0) {
    const data = await request({
      method: "post",
      url: \`\${baseUrl}/v1/images/generations\`,
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${apiKey}\`,
      },
      data: {
        model: model,
        prompt: prompt,
        n: count,
        size: size,
        quality: quality,
        background: background,
        response_format: "b64_json",
      },
    });
    const urls = [];
    for (const item of data.data || []) {
      urls.push(item.b64_json ? \`data:image/png;base64,\${item.b64_json}\` : item.url);
    }
    return urls;
  }

  const form = new FormData();
  form.set("model", model);
  form.set("prompt", prompt);
  form.set("n", String(count));
  form.set("size", size);
  form.set("quality", quality);
  form.set("background", background);
  form.set("response_format", "b64_json");
  const imageField = images.length > 1 ? "image[]" : "image";
  for (const dataUrl of images) {
    form.append(imageField, await (await fetch(dataUrl)).blob(), "ref.png");
  }
  const edited = await request({
    method: "post",
    url: \`\${baseUrl}/v1/images/edits\`,
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
    },
    data: form,
  });
  const urls = [];
  for (const item of edited.data || []) {
    urls.push(item.b64_json ? \`data:image/png;base64,\${item.b64_json}\` : item.url);
  }
  return urls;
}

return await generateImage({
  prompt,
  images,
  params,
  model,
  baseUrl,
  apiKey,
  request,
});`,
        },
        {
            label: "Gemini 规范",
            script: `/**
 * Gemini image generation via models/{model}:generateContent.
 * Reference images go into parts.inline_data. size maps to aspectRatio; quality maps to imageSize.
 * @param {string} prompt
 * @param {string[]} images - reference images as data URLs
 * @param {object} params
 * @param {string} params.size - "1024x1024", "16:9", "auto", etc.; sent as aspectRatio
 * @param {string} params.quality - "low" | "medium" | "high"; sent as imageSize 1K/2K/4K
 * @param {number} params.count - number of generateContent calls
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {function} request
 * @returns {Promise<string[]>} image data URLs
 */
async function generateImage({
  prompt,
  images,
  params: {
    size,
    quality,
    count,
  },
  model,
  baseUrl,
  apiKey,
  request,
}) {
  const parts = [{ text: prompt }];
  for (const dataUrl of images) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      parts.push({
        inline_data: {
          mime_type: match[1],
          data: match[2],
        },
      });
    }
  }

  const aspectRatioMap = {
    "1024x1024": "1:1",
    "1280x720": "16:9",
    "720x1280": "9:16",
    "1536x1024": "3:2",
    "1024x1536": "2:3",
  };
  const imageSizeMap = {
    low: "1K",
    medium: "2K",
    high: "4K",
  };
  let aspectRatio = "1:1";
  if (size && size !== "auto") {
    aspectRatio = aspectRatioMap[size] || size;
  }
  let imageSize = "1K";
  if (imageSizeMap[quality]) {
    imageSize = imageSizeMap[quality];
  }
  const n = Number(count) || 1;
  const urls = [];

  for (let i = 0; i < n; i++) {
    const data = await request({
      method: "post",
      url: \`\${baseUrl}/v1beta/models/\${model}:generateContent\`,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      data: {
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: imageSize,
          },
        },
      },
    });
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        const img = part.inlineData || part.inline_data;
        if (img && img.data) {
          urls.push(\`data:\${img.mimeType || img.mime_type || "image/png"};base64,\${img.data}\`);
        }
      }
    }
  }
  return urls;
}

return await generateImage({
  prompt,
  images,
  params,
  model,
  baseUrl,
  apiKey,
  request,
});`,
        },
    ],
    video: [
        {
            label: "OpenAI 规范",
            script: `/**
 * OpenAI-compatible video: POST /v1/videos (multipart), then poll GET /v1/videos/{id}.
 * Do not set Content-Type on FormData; the browser adds the boundary.
 * @param {string} prompt
 * @param {string[]} images - reference images as data URLs
 * @param {File[]} videos - reference videos; empty when none
 * @param {File[]} audios - reference audio; empty when none
 * @param {object} params
 * @param {string} params.mode - "frames" uses first/last frame fields; "reference" sends all images as references. More than 2 images become "reference".
 * @param {string|number} params.seconds - duration
 * @param {string} params.size - output size, e.g. "1280x720"
 * @param {string} params.resolution - e.g. "720p"
 * @param {boolean} params.generateAudio
 * @param {boolean} params.watermark
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {function} request
 * @param {function} poll
 * @returns {Promise<{url: string}|Blob>}
 */
async function generateVideo({
  prompt,
  images,
  videos,
  audios,
  params: {
    mode,
    seconds,
    size,
    resolution,
    generateAudio,
    watermark,
  },
  model,
  baseUrl,
  apiKey,
  request,
  poll,
}) {
  const form = new FormData();
  form.set("model", model);
  form.set("prompt", prompt);
  form.set("seconds", String(seconds || 8));
  form.set("size", String(size || "1280x720"));
  form.set("resolution_name", String(resolution || "720p"));
  form.set("generate_audio", String(generateAudio !== false));
  form.set("watermark", String(watermark === true));
  form.set("mode", mode);
  if (mode === "frames") {
    if (images[0]) {
      form.append("first_frame", await (await fetch(images[0])).blob(), "first.png");
    }
    if (images[1]) {
      form.append("last_frame", await (await fetch(images[1])).blob(), "last.png");
    }
  } else {
    for (const dataUrl of images) {
      form.append("image[]", await (await fetch(dataUrl)).blob(), "ref.png");
    }
  }
  for (const file of videos) {
    form.append("video[]", file);
  }
  for (const file of audios) {
    form.append("audio[]", file);
  }

  const headers = {
    Authorization: \`Bearer \${apiKey}\`,
  };
  const task = await request({
    method: "post",
    url: \`\${baseUrl}/v1/videos\`,
    headers,
    data: form,
  });

  return await poll(
    async () => {
      const state = await request({
        method: "get",
        url: \`\${baseUrl}/v1/videos/\${task.id}\`,
        headers,
      });
      if (state.status === "failed" || state.status === "cancelled") {
        throw new Error(state.error && state.error.message ? state.error.message : "video generation failed");
      }
      if (state.video_url || state.url) {
        return { url: state.video_url || state.url };
      }
      if (state.status === "completed") {
        return await request({
          method: "get",
          url: \`\${baseUrl}/v1/videos/\${task.id}/content\`,
          headers,
          responseType: "blob",
        });
      }
      return null;
    },
    (result) => result,
    { intervalMs: 2500, timeoutMs: 300000 },
  );
}

return await generateVideo({
  prompt,
  images,
  videos,
  audios,
  params,
  model,
  baseUrl,
  apiKey,
  request,
  poll,
});`,
        },
        {
            label: "Gemini 规范",
            script: `/**
 * Gemini Veo video: POST models/{model}:predictLongRunning, then poll the operation.
 * First/last-frame mode: images[0] -> image, images[1] -> lastFrame.
 * Reference mode: all images -> referenceImages.
 * @param {string} prompt
 * @param {string[]} images - reference images as data URLs
 * @param {File[]} videos - reference videos; empty when none
 * @param {File[]} audios - reference audio; empty when none
 * @param {object} params
 * @param {string} params.mode - "frames" or "reference"
 * @param {string|number} params.seconds - sent as durationSeconds
 * @param {string} params.size - pixel size; mapped to aspectRatio when needed
 * @param {string} params.ratio - aspect ratio, e.g. "16:9"
 * @param {string} params.resolution - e.g. "720p"
 * @param {boolean} params.generateAudio
 * @param {boolean} params.watermark - sent as addWatermark
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {function} request
 * @param {function} poll
 * @returns {Promise<{url: string}>}
 */
async function generateVideo({
  prompt,
  images,
  videos,
  audios,
  params: {
    mode,
    seconds,
    size,
    resolution,
    ratio,
    generateAudio,
    watermark,
  },
  model,
  baseUrl,
  apiKey,
  request,
  poll,
}) {
  async function toInline(source) {
    if (typeof source === "string") {
      const match = source.match(/^data:([^;]+);base64,(.*)$/);
      return {
        bytesBase64Encoded: match ? match[2] : "",
        mimeType: match ? match[1] : "image/png",
      };
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(source);
    });
    const match = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
    return {
      bytesBase64Encoded: match ? match[2] : "",
      mimeType: match ? match[1] : (source.type || "application/octet-stream"),
    };
  }

  const aspectRatioMap = {
    "1280x720": "16:9",
    "1920x1080": "16:9",
    "720x1280": "9:16",
    "1080x1920": "9:16",
  };
  let aspectRatio = ratio || size || "16:9";
  if (aspectRatio === "auto") {
    aspectRatio = "16:9";
  }
  if (aspectRatioMap[aspectRatio]) {
    aspectRatio = aspectRatioMap[aspectRatio];
  }

  const instance = {
    prompt: prompt,
  };
  if (mode === "frames") {
    if (images[0]) {
      instance.image = await toInline(images[0]);
    }
    if (images[1]) {
      instance.lastFrame = await toInline(images[1]);
    }
  } else {
    instance.referenceImages = [];
    for (const dataUrl of images) {
      instance.referenceImages.push({
        image: await toInline(dataUrl),
        referenceType: "asset",
      });
    }
  }
  if (videos[0]) {
    instance.video = await toInline(videos[0]);
  }
  if (audios[0]) {
    instance.audio = await toInline(audios[0]);
  }

  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };
  const op = await request({
    method: "post",
    url: \`\${baseUrl}/v1beta/models/\${model}:predictLongRunning\`,
    headers,
    data: {
      instances: [instance],
      parameters: {
        aspectRatio: aspectRatio,
        durationSeconds: Number(seconds) || 8,
        resolution: resolution || "720p",
        generateAudio: generateAudio !== false,
        addWatermark: watermark === true,
      },
    },
  });

  return await poll(
    () => request({
      method: "get",
      url: \`\${baseUrl}/v1beta/\${op.name}\`,
      headers,
    }),
    (state) => {
      if (state.error) {
        throw new Error(state.error.message || "video generation failed");
      }
      if (!state.done) return null;
      const uri = state.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error("Gemini did not return a video URI");
      if (uri.includes("key=")) return { url: uri };
      const separator = uri.includes("?") ? "&" : "?";
      return { url: uri + separator + "key=" + apiKey };
    },
    { intervalMs: 5000, timeoutMs: 300000 },
  );
}

return await generateVideo({
  prompt,
  images,
  videos,
  audios,
  params,
  model,
  baseUrl,
  apiKey,
  request,
  poll,
});`,
        },
    ],
    audio: [
        {
            label: "OpenAI 规范",
            script: `/**
 * OpenAI speech: POST /v1/audio/speech.
 * @param {string} prompt - text to speak
 * @param {object} params
 * @param {string} params.voice
 * @param {string} params.format - response_format, e.g. "mp3"
 * @param {string|number} params.speed
 * @param {string} [params.instructions] - voice style instructions
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {function} request
 * @returns {Promise<Blob>}
 */
async function generateAudio({
  prompt,
  params: {
    voice,
    format,
    speed,
    instructions,
  },
  model,
  baseUrl,
  apiKey,
  request,
}) {
  return await request({
    method: "post",
    url: \`\${baseUrl}/v1/audio/speech\`,
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${apiKey}\`,
    },
    responseType: "blob",
    data: {
      model: model,
      input: prompt,
      voice: voice,
      response_format: format,
      speed: Number(speed),
      instructions: instructions,
    },
  });
}

return await generateAudio({
  prompt,
  params,
  model,
  baseUrl,
  apiKey,
  request,
});`,
        },
        {
            label: "Gemini 规范",
            script: `/**
 * Gemini TTS: POST models/{model}:generateContent with AUDIO modality.
 * Audio bytes are returned in inlineData.data (base64 PCM).
 * @param {string} prompt - text to speak
 * @param {object} params
 * @param {string} params.voice - prebuilt voice name
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {function} request
 * @returns {Promise<{data: string}>}
 */
async function generateAudio({
  prompt,
  params: {
    voice,
  },
  model,
  baseUrl,
  apiKey,
  request,
}) {
  const data = await request({
    method: "post",
    url: \`\${baseUrl}/v1beta/models/\${model}:generateContent\`,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    data: {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    },
  });
  const parts = data.candidates?.[0]?.content?.parts || [];
  let audio = null;
  for (const part of parts) {
    audio = part.inlineData || part.inline_data;
    if (audio && audio.data) break;
  }
  if (!audio || !audio.data) throw new Error("Gemini did not return audio");
  return { data: audio.data };
}

return await generateAudio({
  prompt,
  params,
  model,
  baseUrl,
  apiKey,
  request,
});`,
        },
    ],
    text: [
        {
            label: "OpenAI 规范",
            script: `/**
 * OpenAI text: POST /v1/responses.
 * @param {{role: string, content: string}[]} messages - includes the system message when present
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {string} reasoningEffort - "auto" | "low" | "medium" | "high" | "xhigh"; omit reasoning when "auto"
 * @param {function} request
 * @param {function} onDelta - push streaming text
 * @returns {Promise<string>}
 */
async function generateText({
  messages,
  model,
  baseUrl,
  apiKey,
  reasoningEffort,
  request,
  onDelta,
}) {
  const body = {
    model: model,
    input: messages,
  };
  if (reasoningEffort && reasoningEffort !== "auto") {
    body.reasoning = {
      effort: reasoningEffort,
    };
  }
  const data = await request({
    method: "post",
    url: \`\${baseUrl}/v1/responses\`,
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${apiKey}\`,
    },
    data: body,
  });
  const text = data.output_text
    || (data.output || []).flatMap((o) => o.content || []).map((c) => c.text || "").join("")
    || "";
  onDelta(text);
  return text;
}

return await generateText({
  messages,
  model,
  baseUrl,
  apiKey,
  reasoningEffort,
  request,
  onDelta,
});`,
        },
        {
            label: "Gemini 规范",
            script: `/**
 * Gemini text: POST models/{model}:generateContent.
 * System messages are skipped in contents; systemPrompt goes to systemInstruction.
 * @param {{role: string, content: string}[]} messages
 * @param {string} systemPrompt
 * @param {string} model
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {function} request
 * @param {function} onDelta - push streaming text
 * @returns {Promise<string>}
 */
async function generateText({
  messages,
  systemPrompt,
  model,
  baseUrl,
  apiKey,
  request,
  onDelta,
}) {
  const contents = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }
  const body = {
    contents: contents,
  };
  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }
  const data = await request({
    method: "post",
    url: \`\${baseUrl}/v1beta/models/\${model}:generateContent\`,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    data: body,
  });
  let text = "";
  for (const part of data.candidates?.[0]?.content?.parts || []) {
    text += part.text || "";
  }
  onDelta(text);
  return text;
}

return await generateText({
  messages,
  systemPrompt,
  model,
  baseUrl,
  apiKey,
  request,
  onDelta,
});`,
        },
    ],
    };
}

/** Normalize whatever an image script returns into the app's generated-image shape. */
export function normalizePluginImages(result: unknown): string[] {
    const items = Array.isArray(result) ? result : [result];
    const urls = items
        .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
                const record = item as Record<string, unknown>;
                if (typeof record.dataUrl === "string") return record.dataUrl;
                if (typeof record.url === "string") return record.url;
                if (typeof record.b64_json === "string") return `data:image/png;base64,${record.b64_json}`;
            }
            return "";
        })
        .filter(Boolean);
    if (!urls.length) throw new Error("模型调用脚本没有返回图片");
    return urls;
}
