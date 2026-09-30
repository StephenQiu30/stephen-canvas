<p align="center">
  <img src="web/public/logo.svg" width="96" alt="stephen-canvas logo">
</p>

<h1 align="center">Stephen Canvas (stephen-canvas)</h1>

<p align="center">
  <a href="https://render.com/deploy?repo=https://github.com/StephenQiu30/stephen-canvas"><img src="https://img.shields.io/badge/Render-Deploy-46e3b7?style=flat-square&logo=render&logoColor=111111" alt="Deploy to Render"></a>
  <a href="https://github.com/StephenQiu30/stephen-canvas"><img src="https://img.shields.io/github/stars/StephenQiu30/stephen-canvas?style=flat-square&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/StephenQiu30/stephen-canvas/tags"><img src="https://img.shields.io/github/v/tag/StephenQiu30/stephen-canvas?style=flat-square&label=version" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-f97316?style=flat-square" alt="License"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js"></a>
  <a href="https://ui.shadcn.com/"><img src="https://img.shields.io/badge/shadcn%2Fui-Radix-111111?style=flat-square" alt="shadcn/ui"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"></a>
</p>

<p align="center">
  <a href="LICENSE">开源协议</a> · <a href="SECURITY.md">漏洞提交</a>
</p>

Stephen Canvas 是一款面向图片创作的开源工作台。它把画布编排、AI 图片生成、参考图编辑、对话助手和素材沉淀放在同一个界面里，适合用来探索视觉方案并连续迭代图片结果。

> [!CAUTION]
> 项目目前处于开发阶段，不保证历史数据兼容。各种本地存储格式都可能直接调整。

> [!NOTE]
> 本项目 fork 自 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas)，遵循 MIT License 并保留原作者版权声明。

## 核心功能

- 无限画布：多画布项目、节点拖拽缩放、连线、小地图、撤销重做、导入导出。
- AI 创作：浏览器前台直连你配置的 OpenAI 兼容接口，支持文生图、图生图、参考图编辑、文本问答、音频和视频生成。
- 画布助手：围绕选中节点和上游节点对话、生图，并把结果插回画布。
- 插件系统：支持通过 URL 动态安装 / 启用 / 更新 / 卸载远程节点插件，并提供 TypeScript SDK 自行开发画布节点插件。
- 自定义接口调用：可自定义生图 / 视频接口的调用方式，灵活适配各类中转站与自建服务。

## 快速开始

AI API Key、Base URL、画布、素材和生成记录默认保存在浏览器本地。

画布和创作界面无需本地 Agent 服务；节点插件通过宿主提供的画布操作与生成接口运行。

### 本地开发

```bash
git clone git@github.com:StephenQiu30/stephen-canvas.git
cd stephen-canvas
cd web
bun install
bun run dev
```

### Docker 运行

```bash
git clone git@github.com:StephenQiu30/stephen-canvas.git
cd stephen-canvas
docker compose up -d
```

运行后默认端口3000，可访问 `http://localhost:3000`。

首次打开后进入右上角配置，填入自己的 OpenAI 兼容 `Base URL` 和 `API Key`。

如果默认的OpenAI接口调用方式与您的API不同，可自定义生图/视频脚本调用。

## 效果展示

<table width="100%">
  <tr>
    <td width="50%"><img src="https://i.ibb.co/TDFvGWDT/image.png" alt="image" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/zVwJq3YS/image.png" alt="image" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://i.ibb.co/PvY3qhhK/image.png" alt="image" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/7D04LwN/image.png" alt="image" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://i.ibb.co/bj30FtS5/5.png" alt="5" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/hxRvjw51/image.png" alt="image" border="0"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://i.ibb.co/jkWsF8q1/image.png" alt="image" border="0"></td>
    <td width="50%"><img src="https://i.ibb.co/XrnfXHx7/image.png" alt="image" border="0"></td>
  </tr>
</table>

## 开源协议

本项目使用 [MIT License](LICENSE)。任何人都可以免费使用、复制、修改、分发、再授权和商业使用本项目，也可以用于闭源产品。
