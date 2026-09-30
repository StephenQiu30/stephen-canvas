# Stephen Canvas 设计规范

## 方向

以 LibTV 的创作工作台布局和现有画布操作习惯为参考，围绕画布、图片、视频和素材组织页面。保留 Stephen Canvas 的品牌、Next.js App Router、shadcn/ui、Radix UI 和现有本地数据能力。

首页是可操作的工作台，不再使用大标题营销首屏。展示真实最近项目和素材；没有数据时展示可操作的空态。不要复制参考站点的会员、积分、社区、模型宣传或未实现的业务入口。

## 技术栈与规范依据

前端统一使用 Next.js + shadcn/ui + Radix UI + Tailwind CSS + ESLint + Prettier，配合 React 和 TypeScript；现有 Zustand、本地持久化与宿主服务接入沿用项目约定。

| 能力 | 项目基线 | 配置与入口 |
| --- | --- | --- |
| 路由与渲染 | Next.js App Router，按需建立 Client 边界 | `web/src/app/`、`web/next.config.ts` |
| 通用组件 | shadcn/ui 源码，`radix-nova` 风格 | `web/components.json`、`web/src/components/ui/` |
| 交互基础 | Radix UI，统一 `radix-ui` 包 | 官方组件内组合 primitives |
| 样式与主题 | Tailwind CSS v4，neutral 与 CSS variables | `web/src/app/globals.css` 的 `@theme inline`；画布使用 `canvasThemes` |
| 代码质量 | ESLint flat config，Next.js Core Web Vitals + TypeScript | `web/eslint.config.mjs` |
| 格式 | Prettier，4 空格、双引号、分号、尾逗号、LF，行宽 255 | `web/.prettierrc.json`、`web/.prettierignore` |

依据 [Vercel Geist](https://vercel.com/geist/introduction) 确定字体、层级与中性视觉，依据 [Web Interface Guidelines](https://vercel.com/design/guidelines) 确定交互与可访问性；组件配置与组合遵循 [shadcn 官方文档](https://ui.shadcn.com/docs) 和 `shadcn` skill，渲染边界遵循 [Next.js 官方文档](https://nextjs.org/docs/app/getting-started/server-and-client-components)。Vercel 插件用于查询和应用这些规范，控件实现继续使用项目内 shadcn 源码。

项目选择 Radix base。官方 Radix registry 的 [Combobox](https://ui.shadcn.com/docs/components/radix/combobox) 依赖 `@base-ui/react`，按官方源码保留这一必要依赖；业务页面统一通过 `components/ui/combobox` 使用它，不据此切换其他控件的基础库。组件 API 按实际 primitive 区分：Radix 触发器使用 `asChild`，Combobox 内部使用其官方 API。

## 开发与组件规则

- 路由入口负责路由组合，业务页面放在 `screens/`，共享布局放在 `layouts/`；只有交互、hooks、浏览器本地数据等需要的入口声明 `use client`。模块顶层不读取浏览器 API，不将运行时服务配置作为服务端渲染数据。
- 先复用已安装的官方组件，按语义组合子组件；`variant` / `size` 表达外观，调用处样式主要负责布局。共享外观扩展放在组件变体或全局主题中。
- 表单使用 FieldGroup / Field / FieldLabel / FieldError；输入附加内容使用 InputGroup；选项组使用 ToggleGroup；相关字段组使用 FieldSet / FieldLegend。
- SelectItem、DropdownMenuItem、TabsTrigger 保留各自的 Group / List；Card 按内容语义组合 Header / Title / Description / Content / Footer，不添加无实际内容的区块。
- 空态用 Empty，加载用 Skeleton / Spinner，提示用 Alert，状态用 Badge，分隔用 Separator，Toast 用 Sonner；不为这些通用能力另写一套样式结构。
- 组件颜色使用语义 token，间距使用 `gap-*`，等宽高使用 `size-*`，截断使用 `truncate`，条件类使用 `cn()`；页面不硬编码基础颜色，不用手动 `dark:` 分支维护另一套配色。
- 图标使用 Lucide 组件或真实品牌 SVG；普通组件传递图标组件或元素。Button 内图标标记 `data-icon`，尺寸由官方组件管理；独立图标按所在区域管理尺寸。插件清单与 SDK 的标识在宿主边界解析为 SVG。
- 弹层保留 Title、焦点返回、Escape 和键盘交互，定位与层级由官方组件管理。导航使用 Link / 链接，按钮提供可访问名称，装饰图标设置 `aria-hidden`，状态同时用文字表达。
- 加载时保留按钮文案并禁用重复提交；字段错误提供可访问提示；删除等危险操作使用 AlertDialog 或可撤销流程。遵循减少动画偏好，避免动画改变布局。

## 工具使用

在 `web/` 执行 shadcn CLI，包运行器跟随项目配置与可用环境：`bunx --bun shadcn@latest`、`npx shadcn@latest` 或 `pnpm dlx shadcn@latest`。本项目未声明 `packageManager`，不要仅为查询 CLI 改动依赖或锁文件。

1. `info --json` 核对 framework、base、style、iconLibrary、别名及已安装组件。
2. 新增组件前执行 `search` 确认来源；使用或修改前执行 `docs <组件名>` 并读取返回的官方文档。
3. 组件更新先执行 `add <组件名> --dry-run` / `--diff`，保留现有业务改动；安装后阅读实际源码，不通过批量覆盖重新初始化项目。

`web/package.json` 中的 `lint`、`format`、`format:check` 分别由 ESLint 和 Prettier 执行。格式以已有配置为准；全仓格式化、语法检查和构建按 `AGENTS.md` 与用户当前要求执行，不因制定规范自动运行。

## 全局布局

- 桌面使用官方 Sidebar 的 256px 导航，可收起为 48px 图标栏；顶部品牌和新建项目，页面按「工作空间」「创作工具」分组，底部仅放本地存储说明，不展示版本信息。
- 内容区顶部保留 64px 轻量工具栏，承载当前页面、主题与仓库入口。
- 页面横向内边距为桌面 40px、窄屏 16px，内容最大宽度 1600px；每页自行滚动。
- 桌面工作台由 `BasicLayout` 组合 `AppSidebar`、`AppHeader`、内容和 `AppFooter`。
- 768px 以下由官方 Sidebar 使用 Sheet 导航，链接点击后关闭，支持 Escape 和焦点返回。
- 内容区是 CSS 查询容器。卡片网格和生成工作台根据实际可用宽度切换分栏。
- 单画布编辑页隐藏全局侧栏、页头与页脚，保留完整画布及其专属工具。

## 颜色与字体

所有页面和弹层从 `web/src/app/globals.css` 读取语义 token；画布读取 `canvasThemes`。避免业务组件自行维护明暗配色。

| 用途 | 浅色 | 深色 |
| --- | --- | --- |
| 页面背景 | `#ffffff` | `#0a0a0a` |
| 侧栏 | `#fafafa` | `#161616` |
| 卡片/弹层 | `#ffffff` | `#1f1f1f` |
| 普通文本 | `#171717` | `#fafafa` |
| 次要文本 | `#737373` | `#a3a3a3` |
| 边框 | `#ebebeb` | `#333333` |
| 主操作 | `#171717` | `#ededed` |
| 主操作文本 | `#ffffff` | `#0a0a0a` |

- 保留 Geist Sans / Geist Mono 及系统中文回退字体。
- 业务页标题 24px，区块标题 18px，正文/导航 14px，元数据 12px。
- 字重以 400、500、600 为主；内容需要截断时保留可访问名称。
- 主操作使用高对比中性色；普通操作使用 ghost 或 outline，导航通过 SidebarMenuButton 的 isActive 表达当前项。
- 卡片无阴影；媒体网格只有封面使用细边框和圆角，文字区无底色、无外框、无分隔页脚。首页紧凑项目卡使用透明背景与轻量圆角边框；弹层继续采用全局 overlay 阴影。

## 页面结构

### 首页

1. 带语义色点阵背景的宽幅「新建画布创作」入口。
2. 图片、视频、画布及素材快捷入口。
3. 最近更新的四个项目，包含真实缩略图、标题和更新时间。
4. 最近八个素材，点击进入素材库并打开对应详情。

### 项目

- 左对齐标题与导入、新建、批量操作。
- 搜索名称，可按最近更新或名称排序。
- 16:9 项目封面，使用首个图片节点及现有预览缓存；无图片时显示画布图标。封面下只展示单行名称和 `YYYY-MM-DD` 日期，不展示节点/连线统计；常规网格按可用内容宽度显示一至五列。
- 保留选择、重命名、导出、删除操作，全部使用可键盘操作的控件。
- 选择和更多操作放在封面角落，悬停、卡片内部键盘聚焦或已选中时显示；触屏设备常显。当前选中项目以封面轮廓表达。
- 无项目和无搜索结果分别显示真实空态。

### 素材

- 素材页使用左对齐标题、搜索/筛选和媒体网格，保留导入导出、编辑、预览与分页。素材卡片只展示封面和名称，来源、标签、日期及媒体规格放到详情中；首页与素材页复用同一张卡片。
- 本地素材和画布不代表云同步；不得在界面中暗示数据已上传。

### 图片与视频生成

- 保留模型选择、提示词、参考资源、参数、生成结果及历史操作。
- 模型与服务信息由宿主在运行时提供；不展示渠道、API Key、代理或服务配置入口。尚未接入服务时提示「生成服务尚未接入」，不引导打开本地配置页。
- 内容区较窄时纵向排列；至少 800px 时并排显示输入与结果。
- 至少 1280px 时增加历史侧栏；其余宽度通过历史按钮打开原有抽屉。
- 长表单与结果区域可滚动，生成按钮必须可达。

### 画布

- 复用现有节点、连线、工具栏、插件和快捷键；画布与创作界面无需本地 Agent 服务。
- 顶部工具与状态采用扁平透明风格，不添加装饰阴影或灰色胶囊。
- 图片保持原比例，非图片类型的列表缩略图保持无底色。
- 新画布默认点阵背景；空态提供图片、视频、音频、文本和生成配置入口，中央提示双击添加节点。已有项目保留原背景配置。
- 底部中央集中添加节点、选择/移动、资产、撤销/重做、外观和更多操作；危险操作收进菜单。创建、外观和缩放使用官方 Popover，不手动计算浮层位置。
- 左下为整理画布、适合屏幕、小地图、连线显隐、网格吸附和缩放百分比。窄画布时与中央工具栏分成两行，避免重叠。
- 缩放范围保持 5%–500%，支持百分比输入、预设和 Ctrl/Cmd + 0、+、-；缩放锚点与屏幕坐标统一换算。尺寸监听在画布挂载后生效，不使用默认尺寸代替真实视口。
- 网格吸附默认关闭，开启时使用既有 48 单位逻辑网格；多选节点共享位移，保留相对位置。点阵只做视觉细分与缩小时抽样，不修改节点坐标。
- 新用户默认收起资产侧栏；已有显式展开偏好保留。手机资产管理使用 Sheet，画布/资产使用 Tabs。
- 移动工具拖动节点表面时平移视图；连线端点与缩放手柄独立响应。连线预览与结果使用相同曲率，描边和点击区域保持屏幕尺寸。

- 默认使用选择工具；V/H 切换选择/抓手，按住 Space 临时平移，松开恢复当前工具；中键平移。普通滚轮与触控板双轴滚动平移，Ctrl/Cmd 滚轮或触控板捏合按指针锚点缩放，保留 5%–500% 范围。
- 在未选节点的画布按 Tab 或双击空白处创建节点；选区存在时 Tab 用于焦点导航。Ctrl/Cmd + D 创建选区副本，Option/Alt 拖动复制；复制组时保留子节点、内部连线和引用标识映射，副本不继承运行中的任务。
- Ctrl/Cmd + F 搜索名称、提示词和文本并定位；Ctrl/Cmd + L 或键盘激活端点选择连接节点。方向键微调位置，Shift + 方向键按现有 48 单位网格移动；尺寸手柄支持方向键并保留图片比例约束。
- Option/Alt + Shift + F 整理选区，无选区时整理画布；多选工具提供边缘对齐与水平/垂直分布。组织操作参与撤销/重做，组及内部成员一起移动。
- 图片、视频、音频、文本与配置创建后进入对应编辑目标。生成参数、手工文本和插件面板位于屏幕浮层，尺寸不随画布倍率缩放；由 Radix 在画布可用边界内定位，内容超出时可滚动。节点内保留内容及配置摘要，节点工具可在编辑浮层中操作。
- 生成输入 Enter 换行，Ctrl/Cmd + Enter 生成；输入法组合期间不触发操作。正在编辑的输入、按钮、选择器和弹层不被画布快捷键截获；Escape 与关闭操作返回画布焦点。参考选择与创建提示位于屏幕层。
- 服务或模型未接入时先显示具体原因，并禁用生成按钮和对应提交；宿主注入后重新计算可用状态，保留草稿。继续通过宿主运行时配置直连服务。
- 生成历史统一记录画布及图片/视频创作页的新请求，按项目、类型、状态和关键词筛选，支持复用参数及引用、插入结果、使用当前服务重试；原有图片/视频页面记录保留。记录使用 localforage，不保存 API Key、服务地址或渠道配置，不代表云同步。
- 历史保存请求状态、错误、结果与引用快照，批量部分失败及取消前已经完成的结果仍可查；刷新后中断的请求明确标记，已有视频任务继续通过原节点查询。删除节点、项目、资产或页面记录时，仅清理不再被其他数据与历史引用的媒体文件。
- 音频与图片、视频、文本一样支持保存资产、筛选、播放预览、回插以及压缩包导出/导入；非图片列表缩略图使用无底色图标。画布没有可见节点时提供返回节点操作。

## 组件与状态

- 新控件直接使用项目内 shadcn Button、Input、Select、Checkbox、Card、Sheet、Empty 等官方组合 API。
- 不新增 Ant Design、React Router 或旧式控件适配层调用。
- 导航使用语义化链接，当前项设置 `aria-current`；图标按钮有明确名称。
- 加载、空数据、无匹配、禁用、选中、焦点和错误状态必须可区分。
- 卡片加载时使用与最终封面、标题及日期布局对应的 Skeleton；无数据与无筛选结果使用不同 Empty 文案和下一步操作。
- 组件封装只组合现有 shadcn API 和实际复用的业务内容；交互卡片通过共享 Card variant 表达悬停与焦点，不增加旧式适配层。
- 图片使用现有缩略图缓存，不把展示用缩略图写入业务数据。
- 遵循系统减少动画设置，悬停动画只用于轻微反馈。

## 官方组件迁移约束

以 [Vercel Geist](https://vercel.com/geist/introduction) 和 [Web Interface Guidelines](https://vercel.com/design/guidelines) 作为视觉与交互依据，LibTV 作为工作台布局和现有画布操作习惯的参考；保留项目主题、组件体系和本地数据边界，不复制商业入口。故事板、角色造型室、智能剪辑、Director 和项目内多画布另定功能范围。

- 通用控件直接组合 `components/ui` 中通过 shadcn 官方 registry 安装的源码；删除 `app-primitives` 旧 API 适配层，不另建兼容层。
- 表单使用 React Hook Form 与 Field、FieldLabel、FieldError；多标签使用 Combobox，选项组使用 ToggleGroup，带前后缀的输入使用 InputGroup。
- 选择器包含 SelectGroup；标签页包含 TabsList、TabsTrigger、TabsContent；弹窗与抽屉保留标题、焦点管理、Escape 和外部点击行为。
- 节点插件通过宿主提供的 `applyOps` 和 `ai` 接口操作画布、调用生成能力，不依赖本地 Agent 协议。
- 弹层交给官方组件管理定位、Portal 与层级；画布工作区隔离内部层级，画布快捷键忽略正在交互的弹层。
- 画布节点绘制、连线、内容编辑、素材预览和第三方代码编辑器属于业务能力，保留专用实现；内部通用按钮和输入使用官方组件。
- 禁用和加载状态共同阻止重复提交；图标按钮与数值输入提供可访问名称；遵循系统减少动画偏好。
