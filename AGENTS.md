# AGENTS.md

本文档用于约束本项目中的 AI / 自动化开发行为。用户当前明确要求优先；其余开发行为遵循本文件和 `DESIGN.md`。

## 基本原则

- 先读现有代码，再动手修改，优先沿用项目已有结构和写法。
- 写代码保持最少行数，能简单实现就不要引入复杂抽象。
- 标准格式、协议、解析、压缩、加密、日期等通用能力优先使用成熟稳定的库，不要手写底层实现，除非用户明确要求或项目已有实现必须沿用。
- 不要为了“兼容更多场景”写大量分支，只实现当前明确需要的功能。
- 项目尚未上线，不需要兼容旧数据；本地存储结构调整时直接按新设计修改，不写旧字段兼容或数据迁移兜底，除非用户明确要求。
- 每次写完代码，不需要检查语法，不需要执行构建，用户会自己做。
- 不要改无关文件，不要顺手重构。
- 如果工作区已有用户改动，不要回滚，不要覆盖；只在必要范围内追加修改。

## 反复提醒沉淀

- 如果开发过程中总是遇到某个问题，或者用户反复提醒同一个注意事项，需要把该注意事项补充到本文件。
- 补充时写成明确、可执行的规则，避免只写模糊描述。
- 新规则应放到最相关的章节；找不到合适章节时放到“项目注意事项”。

## 前端规范

- 前端核心技术栈固定为 Next.js App Router + shadcn/ui + Radix UI + Tailwind CSS + ESLint + Prettier；使用 React、TypeScript，跨页面状态沿用 Zustand。
- 工程规范参考 Vercel 插件的 `vercel:nextjs`、`vercel:shadcn`、`vercel:geist` 指南和 `shadcn` skill；视觉与交互参考 [Vercel Geist](https://vercel.com/geist/introduction)、[Web Interface Guidelines](https://vercel.com/design/guidelines)，组件 API 以当前 shadcn 官方文档和项目源码为准。
- shadcn 配置以 `web/components.json` 为真源：`radix-nova`、Radix base、neutral、CSS variables、Lucide 和 `@/` 别名；不因指南中的通用推荐切换已有 preset、主题或组件基础库。
- Radix primitives 使用统一的 `radix-ui` 包。官方 Radix registry 组件声明的必要依赖按官方实现保留，例如 Combobox 的 `@base-ui/react`；这类依赖仅用于对应官方组件，不作为业务页面另起一套控件的入口。
- 修改 Next.js 行为前先读当前安装版本的 `web/node_modules/next/dist/docs/`。路由与布局默认保留 Server Component；交互、hooks 和浏览器 API 放在最小必要的 Client 边界，跨边界 props 必须符合 React 的可序列化要求，不把整个应用统一改成 Client Component。
- 外部服务请求统一放在 `web/src/services/api/`，由浏览器前端直连，不假设存在项目后端。
- 全局或跨页面状态优先放在 `web/src/stores/`。
- 已经放在全局 store 或全局 hook 中的状态/动作，组件需要时直接使用对应 store/hook，不要为了“纯组件”层层透传 props；避免一个组件传递过多参数。
- 全局组件、全局常量、全局配置等全局性质的内容不要作为 props 或参数层层传递；哪里需要就在哪里直接从对应全局入口获取。
- 多个页面重复出现的 UI 副作用动作，例如复制文本并提示、下载并提示、统一确认弹窗，优先抽成 `web/src/hooks/` 下的全局 hook；不要放进 store，除非它确实是需要共享/订阅的状态。
- Next.js 路由入口放在 `web/src/app/`，业务页面放在 `web/src/screens/`，页面布局放在 `web/src/layouts/`。
- 工作台页面统一由 `web/src/layouts/basic-layout.tsx` 组合 `AppHeader`、页面内容和 `AppFooter`；主题切换复用 `AppToolbarActions`，单画布编辑页隐藏页头和页脚以保留完整画布空间。
- 画布业务页面放在 `web/src/screens/canvas/`，Next.js 路由入口放在 `web/src/app/(workspace)/canvas/`，画布组件放在 `web/src/components/canvas/`，画布状态放在 `web/src/stores/canvas/`，画布工具函数放在 `web/src/lib/canvas/`。
- 业务页面按目录组织，例如 `web/src/screens/image/index.tsx`；页面里只有一个主业务组件时直接写在对应页面入口中，不要单独拆 `Manager` 组件再传一堆 props。
- 不要新增只做简单转发的组件，例如只 `return <X>{children}</X>` 或只换个名字透传 props；直接在使用处使用真实组件或把逻辑写进当前文件。
- 页面私有 hook 放在对应页面目录下，例如 `admin/assets/use-admin-assets.ts`；只有多个页面真实复用的 hook 才放到外层 `hooks/`。
- 管理后台页面私有组件放到各自页面目录的 `components/` 下，例如 `admin/assets/components/`、`admin/prompts/components/`；不要为了单页面使用放到 `admin/components/` 共享目录。
- 全局主题色统一使用 `web/src/app/globals.css` 中的 CSS 变量和 Tailwind 语义类；页面私有组件不要自行维护整套明暗主题分支。
- 全站视觉规范遵循仓库根目录 `DESIGN.md`；新增或调整页面时优先复用项目内 shadcn/ui 组件及官方 Radix primitives，并使用全局语义 token。
- 交互控件优先直接从 `@/components/ui/<组件名>` 引入 shadcn 官方组件，遵循 Radix 组合 API；不要新增旧式适配层调用或手写按钮、弹层替代已有组件。布局与导航保留语义化 HTML，组件名称应准确表达用途。
- 操作 shadcn 前在 `web/` 使用项目包运行器执行 `shadcn@latest info --json`，核对配置与已安装组件；新增前搜索 registry，使用或修改组件前执行 `docs <组件名>` 并读取返回的官方文档。组件更新先用 `--dry-run` / `--diff` 对照本地改动，不直接覆盖已有源码。
- 表单组合使用 `FieldGroup`、`Field`、`FieldLabel` 和 `FieldError`；输入附加操作使用 `InputGroup` 系列；少量选项使用 `ToggleGroup`。错误同时设置字段的 `data-invalid` 和控件的 `aria-invalid`，禁用同时设置 `data-disabled` 和 `disabled`。
- 保留完整组合关系：SelectItem 放在 SelectGroup 内，DropdownMenuItem 放在 DropdownMenuGroup 内，TabsTrigger 放在 TabsList 内；Card 按内容语义使用 Header、Title、Description、Content 和 Footer。Radix 自定义触发器使用 `asChild`，不混用其他基础库的触发器 API。
- 空态、加载、提示、状态和分隔分别使用 Empty、Skeleton / Spinner、Alert、Badge、Separator；Toast 沿用 Sonner。加载按钮组合 Spinner 与 `disabled`，保留操作文案，不添加 `isLoading` / `isPending` 等自造 props。
- Dialog、Sheet 等弹层必须有 Title；焦点管理、Escape、Portal、定位和层级由官方组件处理。导航使用 Next.js Link 或语义化链接，图标按钮提供中文可访问名称，所有操作支持键盘和可见焦点。
- 组件优先使用函数组件和现有 hooks，不新增大型状态管理方案。
- UI 图标使用配置指定的 `lucide-react` 或真实品牌 SVG，不使用文字、Unicode 符号或 emoji 充当图标。普通组件接收图标组件或元素；插件清单、SDK 运行时的图标标识只在宿主边界解析成真实 SVG，不直接展示字符串。
- Button 图标标记 `data-icon="inline-start"` / `data-icon="inline-end"`；Button、菜单、Sidebar 等官方组件内的图标尺寸交给组件管理，不在调用处重复添加尺寸类。装饰图标使用 `aria-hidden`，仅图标按钮的名称放在按钮上。
- 页面文案保持中文。
- 不要在组件里堆太多无关逻辑；复杂逻辑优先抽成同目录工具函数或小组件。
- 样式优先由组件自己管理；组件私有样式优先使用 Tailwind className 或少量内联 style，不要为单个组件新增大量全局 CSS。
- 官方组件优先使用内置 `variant` / `size`，调用处 `className` 主要负责布局；共享外观调整集中在组件变体或主题 token。间距使用 flex / grid 与 `gap-*`，等宽高使用 `size-*`，截断使用 `truncate`，条件类使用项目的 `cn()`；不在页面叠加原始颜色或手动 `dark:` 配色覆盖。
- ESLint 使用 `web/eslint.config.mjs` 的 Next.js Core Web Vitals 与 TypeScript flat config，负责代码质量；Prettier 使用 `web/.prettierrc.json` 负责格式，不另写相冲突的格式规则，也不为通过检查批量关闭规则。检查与格式化遵循本文件的执行约定，不在每次修改后自动运行全仓检查或构建。
- 全局 CSS 只放基础变量、全局重置、跨页面通用样式和少量第三方组件必要覆盖；不要在 `globals.css` 堆页面私有样式。
- 代码尽量短小直接，少拆不必要组件，少做多层 props 传递，避免为了抽象堆出更多代码。
- 前端业务数据需要浏览器本地持久化时，默认使用 `localforage`；`localStorage` 只用于极小的简单配置，不要用来保存业务列表、生成记录、图片、base64 或大 JSON。

## 画布 UI 规范

- 做 canvas 前端 UI 时必须遵循当前画布主题。
- 优先使用 `canvasThemes`、`useThemeStore` 或 Tailwind 语义颜色变量。
- 不要硬编码黑白、stone、slate 等颜色导致浅色/深色主题不一致。
- 新增画布按钮、弹窗、浮层时，尽量复用已有工具栏、节点面板、Modal 的视觉风格。
- 画布顶部工具栏和状态信息优先采用极简扁平风格：无边框、无阴影、无胶囊背景，融入整体背景，弱化按钮感，仅保留轻微 hover 反馈，保持简洁现代、低视觉重量。
- 左侧画布面板等列表里的节点/元素缩略图容器，非图片类型（文本、配置、视频、音频等）不要使用 `theme.node.fill`（`#e7e5df`/`#292524`）这类灰色背景，图标直接无背景展示，尽量不要给多余底色，保持干净。
- 画布内的操作按钮（如面板里的「添加」「导出」「选择」等）默认用扁平无底色样式：透明背景、仅通过语义 token 或当前 `canvasThemes` 提供轻微 hover 反馈，靠图标+文字表达，不要用 `theme.toolbar.activeBg`（`#e7e5df`/`#3a3631`）或 `theme.node.fill` 之类的灰色作为按钮填充底色。灰色 `activeBg` 只允许用于「选中态」等需要表达状态的高亮，不要当普通装饰底色。
- 图片节点尺寸逻辑要尊重原始比例，除非功能明确要求自由变形。
- 批量生成、多图展示、助手面板等画布交互要尽量简洁，不要占用过多画布空间。

## 项目说明与变更记录

- README 保持简洁，只放项目介绍、核心功能和快速开始；不要新增独立 `docs/` 文档站。
- 重大改动（新增、调整或删除用户可感知的功能、接口或工具）完成后，在 `CHANGELOG.md` 的 `Unreleased` 追加一条中文摘要，使用 `[新增]` / `[调整]` / `[修复]` / `[优化]` 前缀；纯内部重构、格式化和无用户可感知影响的小改动可不记。
- 项目说明不要写过期日期；除非用户明确要求记录具体时间。

## 发版本流程

- 发版本时，先把 `CHANGELOG.md` 的 `Unreleased` 变更整理成新的版本记录，并保留空的 `Unreleased` 标题。
- 应用版本号以 `CHANGELOG.md` 中最新的非 `Unreleased` 版本标题为准；发版本时更新该标题和 Git tag，不再维护单独的 `VERSION` 文件。
- 将当前未提交的代码全部提交到 Git。
- 提交完成后，给当前提交打最新版本号对应的 tag，例如 `v0.0.5`。
- 发版本流程中不要执行编译、测试或构建，除非用户明确要求。

## PR 审查与处理

- 审查 PR 时必须把“需求价值”和“实现质量”分开判断，分别给出结论；实现差不等于需求不需要，需求有价值也不等于当前代码可以合并。
- 需求价值需要单独结合项目方向、用户场景、现有能力和后续规划判断；无法从项目上下文确定是否需要时，必须询问用户，不得仅凭代码质量、作者或改动规模推断需求不需要。
- 实现质量重点检查正确性、安全性、改动范围、重复代码、无关文件、现有结构复用、可维护性、测试与文档以及与最新 `main` 的冲突。改动几十个文件、疑似 AI 批量生成、重复代码多只能作为重点复核或拒绝当前实现的信号，不能单独作为放弃需求的依据。
- 对“需求有价值但实现不合格”的 PR，优先考虑要求作者修改、提取可用思路后自行重做，或把需求保留到 issue/todo；不要直接把需求一起否定。
- 建议关闭 PR 前，必须先向用户分别说明需求价值、实现质量、可保留的思路和建议处理方式，并取得用户明确确认；批量关闭时也要让用户能看清每个 PR 的需求是否仍需保留。
- 可以先在独立分支审查、修复、测试和准备提交；任何合并进 `main` 的操作都必须先说明修复内容、测试结果、风险与冲突，并取得用户明确同意。需要 force-push PR 作者分支时也必须提前说明影响并取得同意。

## 项目注意事项

- 新增或调整超时、重试次数、大小限制、并发上限等会改变实际行为的边界值前，必须先向用户说明适用环节、默认值和失败后的处理方式，并取得确认；不要把经验值当成纯内部实现静默加入。
- 当前画布项目和“我的素材”主要保存在浏览器本地，不要在文档中误写成已支持云同步。
- 模型与服务信息通过 `useConfigStore.getState().setServiceConfig(...)` 由宿主在运行时注入，不恢复本地渠道、API Key、代理或 WebDAV 配置页面，也不把运行时服务配置持久化到浏览器。
- Docker 静态资源路径目前仍是待办项，文档中不要过度承诺生产部署已经完全验证。
- 画布及节点插件操作不依赖本地 Agent 服务；节点插件通过宿主的 `applyOps` 与 `ai` 接口调用画布和生成能力。
- 本地启动或浏览器验收时不要关闭用户已经打开的浏览器窗口或标签页；需要自动化验证时使用独立测试页面，避免打断用户当前页面和对话状态。
