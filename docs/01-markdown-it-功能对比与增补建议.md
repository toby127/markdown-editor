# markdown-it 对比与功能增补建议

> 目标项目：`markdown-editor` v0.1.0（Electron + React + TipTap 的 Typora 式桌面编辑器）
> 对比对象：[markdown-it](https://github.com/markdown-it/markdown-it)（MDIO 官方仓库，当前 15.0.3；本项目经 `tiptap-markdown@0.8.10` 间接使用 14.3.3）
> 日期：2026-11-18

> **实施状态（2026-11-18 更新）**：第一档已全部落地并通过测试，详见文末「附录 A：第一档实施报告」。
> 测试基线从 173 → **212 条全绿**；构建通过；改动文件均通过严格类型检查。

---

## 0. 结论先行

一句话：**本项目不是"另一个 markdown-it"，也不该照抄 markdown-it 的功能清单；它已经把 markdown-it 当作解析内核了，真正缺的是围绕这个内核的「编辑器侧语法闭环」和「产品化能力」。**

值得加的功能，按投入产出比分三档：

| 档位 | 功能 | 理由 |
|---|---|---|
| **第一档（高价值、应优先）** | GFM 表格、图片、代码块语法高亮、HTML 安全净化、导出 HTML/PDF | 高频刚需 / 已有能力被浪费 / 安全债 |
| **第二档（中价值、补生态位）** | 脚注、上下标、YAML Frontmatter、标题锚点自动 TOC、链接引用 | 对应 13 个 STUB 里最实用的几个，markdown-it 插件生态成熟 |
| **第三档（差异化、我的想法）** | 双向链接+反链、全文搜索、聚焦/打字机模式、往返保真测试矩阵、AI 改写 | 跳出"语法覆盖"竞争，做知识库工具的护城河 |

**最不该做的事**：看到 markdown-it 插件市场有几百个插件就全部 `.use()` 进来。对编辑器而言，每加一种语法要打通**四个点**（见 §3），成本远高于渲染库；堆语法只会做一个四不像。

---

## 1. 先厘清一个根本差异（这是全篇的地基）

markdown-it 是**单向渲染库**：`Markdown 字符串 → HTML 字符串`，仅此而已。它是 `md.render()` 的一个函数。

本项目是**双向编辑器**，链路是：

```
保存的 .md
   │ ① markdown-it.render()           ← tiptap-markdown 内部调用（项目已间接使用）
   ▼
HTML
   │ ② ProseMirror DOMParser
   ▼
TipTap EditorState（schema 文档树）    ← 用户在这里编辑，焦点块显示 # / - / [x] 标记
   │ ③ MarkdownSerializer
   ▼
Markdown 字符串 → 写回 .md
```

证据：`src/shared/markdown.ts:11-13`、`src/renderer/Editor.tsx:93-97`（`Markdown.configure({ html: true, ... })`）、`node_modules/tiptap-markdown/src/parse/MarkdownParser.js:17-21`。

**由此推出三条判断，后面所有建议都服从它们：**

1. **"markdown-it 支持某语法" ≠ "本项目支持某语法"。** markdown-it 默认预设能解析 GFM 表格成 `<table>`，但本项目 schema 里没有 table 节点，表格解析进来会被丢弃 → 实际不支持（`insertTable` 是 STUB，`editor-menu.ts:26-40`）。
2. **加一种语法 = 打通四个点，不是装一个插件**：① markdown-it 解析规则 → ② TipTap schema 的 Node/Mark + parseHTML → ③ `addStorage().markdown` 的 serialize 规则 → ④ 编辑器 UI（输入规则 / 菜单 / 快捷键）。缺 ③ 保存即丢，缺 ④ 用户用不了。
3. **本项目已经站在 markdown-it 肩上**，讨论"要不要引入 markdown-it"没有意义；真正的问题是"在它的基础上，编辑器侧还缺什么"。

---

## 2. markdown-it 官方能力清单（对比基准）

来自 README 与 `docs/usage.md`：

**核心卖点**
- 100% CommonMark 兼容，并加语法糖（URL 自动链接、typographer 智能排版）
- 语法可配置：可新增规则，也可替换已有规则
- 高速、默认安全（safe by default）
- 社区插件生态（npm `markdown-it-plugin` 关键词）

**三种预设（presets）**：`commonmark` / `default`（默认）/ `zero`。`default` 在 CommonMark 之上多开表格、删除线等。

**构造选项（本项目目前只显式开了 `html:true`，其余全默认）**

| 选项 | 默认 | 作用 | 对本项目是否有意义 |
|---|---|---|---|
| `html` | `false` | 是否透传原始 HTML | 被迫 `true`，否则往返失效；**带来 XSS 面**，见 §5 |
| `xhtmlOut` | `false` | 输出 XHTML 风格自闭合标签 | 无意义（产物进 ProseMirror，不直接交付） |
| `breaks` | `false` | 单换行转 `<br>` | 有意义，需产品决策（写作习惯差异） |
| `langPrefix` | `language-` | 代码块 class 前缀 | 做高亮时需与 CSS/主题对齐 |
| `linkify` | `false` | 裸文本 URL 自动转链接 | 有价值，但会改变用户文本，需谨慎 |
| `typographer` | `false` | 智能引号、破折号、(c)→© 等 | 中文场景收益有限，慎用 |
| `quotes` | `“”‘’` | typographer 的引号对 | 同上 |
| `highlight` | `null` | 代码块高亮回调 | **第一档建议**，见 §4.1 |
| `maxNesting` | `100` | 最大嵌套深度 | 安全兜底，编辑器侧可保留默认 |

**扩展机制**：core / block / inline 三套 ruler，可 `before/after/push` 增删规则；renderer rules 可覆盖任意 token 渲染；`md.use(plugin)` 挂载插件；token 流是中间产物。项目的 `tiptap-markdown` 就用了这套机制（修补 fence/code_block 渲染、注册 task-lists 插件）。

**生态中值得参考的插件**（注意：是本体的插件，不是本项目现成能用的）：
`markdown-it-footnote`、`markdown-it-table-of-contents`、`markdown-it-anchor`、`markdown-it-task-lists`（已通过依赖间接启用）、`markdown-it-abbr`、`markdown-it-container`、`markdown-it-deflist`、`markdown-it-sub`/`sup`、`markdown-it-emoji`、`markdown-it-front-matter`、`markdown-it-texmath`/`katex`、`markdown-it-multimd-table`。

---

## 3. 逐项对照：markdown-it / 生态有的 vs 本项目现状

| 语法/能力 | markdown-it 本体 | 生态插件 | 本项目现状 | 差距性质 |
|---|---|---|---|---|
| CommonMark 标题/列表/引用/强调/代码/水平线 | ✅ | — | ✅（StarterKit） | 已对齐 |
| 删除线 `~~` | ✅ default | — | ✅（StarterKit Strike） | 已对齐 |
| GFM 任务列表 `- [x]` | 需插件 | ✅ task-lists | ✅（TaskList/TaskItem） | 已对齐 |
| **GFM 表格** | ✅ default | ✅ multimd-table | ❌ STUB、schema 无 table 节点 | **真缺口（高频）** |
| 链接 / 自动链接 | ✅ / `linkify` 选项 | ✅ link-attributes | 链接 ✅；裸 URL 自动链接 ❌ | 部分 |
| **图片** | ✅ | — | ❌ STUB | **真缺口（高频）** |
| **代码块语法高亮** | `highlight` 回调 | ✅ highlight.js 等 | ❌ 无依赖、灰底 `<pre>` | **真缺口（高频）** |
| 脚注 | 需插件 | ✅ footnote | ❌ STUB | 生态位空缺 |
| 数学公式 | 需插件 | ✅ texmath/katex | ❌ STUB（测试里明确标为 "unsupported-looking"） | 生态位空缺 |
| 上下标 | 需插件 | ✅ sub/sup | ❌ STUB | 生态位空缺 |
| 高亮 `==x==` | 需插件 | ✅ mark | ✅（TipTap Highlight） | 已对齐（来源不同） |
| YAML Frontmatter | 需插件 | ✅ front-matter | ❌ STUB | 生态位空缺，且是知识库关键 |
| TOC / 标题锚点 | 需插件 | ✅ toc / anchor | ⚠️ 有侧栏大纲（正则提取），无稳定锚点 | 半成品 |
| 链接引用 `[x][ref]` | ✅ CommonMark | — | ❌ STUB | 真缺口 |
| 原始 HTML | `html` 选项 | — | ⚠️ 强制 `true`，无净化 | **安全债** |
| 换行 `<br>` | `breaks` 选项 | — | ❌ 默认 false | 产品决策项 |
| 智能排版 | `typographer` | — | ❌ 默认 false | 产品决策项 |
| 导出 HTML / PDF | 天然产物 `render()` | — | ⚠️ `markdownToHtml()` 只被测试调用 | **能力浪费** |
| 双向链接 `[[...]]` | ❌ 不在范畴 | 有第三方插件 | ❌ 完全没有 | 差异化机会 |
| 全文搜索 / 标签 | ❌ 不在范畴 | — | ❌ 完全没有 | 差异化机会 |

---

## 4. 值得添加的功能（按档位详述）

### 4.1 第一档：高价值、应优先做

**① GFM 表格** — 最高频的"语法缺口"，markdown-it 默认预设本来就能解析，卡在编辑器 schema。
- 落地：`@tiptap/extension-table` + TableRow/TableHeaderCell/TableCell/TableHeader；在扩展的 `addStorage().markdown` 补 `table/table_row/table_cell` 的 serialize；菜单把 `insertTable` 从 STUB 移除（`editor-menu.ts:75`）。
- 风险：markdown 表格的列对齐（`:---:`）在往返中容易丢；先在 `markdown.test.ts` 加一条"含对齐表格往返"用例再动手。
- 参考：`markdown-it-multimd-table` 的合并单元格先不要，先把基础表格闭环。

**② 图片** — `image` 是 STUB（`editor-menu.ts:126`），写作刚需。
- 落地：`@tiptap/extension-image`；关键决策是**本地图片路径如何存**：相对路径（可移植，但需随 .md 定位）vs 复制到 assets 目录 vs base64 内联（文件膨胀）。建议相对路径 + 复制策略可选。
- 注意：Electron 里 `file://` 图片的加载要在主进程配置 `webSecurity`/协议，别为图省事直接关掉安全策略。

**③ 代码块语法高亮** — markdown-it 的 `highlight` 回调是现成插槽，项目完全没接。
- 落地两条路：
  - **低风险**：`highlight.js` / `lowlight`，在 TipTap CodeBlock 上加 `lowlight` 扩展，输出带 class 的 `<code>`，CSS 主题着色。
  - **更彻底**：在 tiptap-markdown 的 markdown-it 实例上注入 `highlight` 回调——但因为它同时负责解析和序列化，容易污染往返，不推荐。
- 建议先做第一种，主题跟随明暗模式（`styles.css` 目前只适配浅色，见 §6 自审）。

**④ HTML 安全净化（不是新功能，是还债）**
- 项目 `html:true` 是被往返逼出来的（`markdown.ts:11-12` 注释写明），但这意味着打开一个带 `<script>` 或 `onerror` 的 .md 就可能在渲染层执行脚本。markdown-it 的 "safe by default" 在这里被绕过了。
- 落地：在 markdown-it → ProseMirror 之间加 `DOMPurify`（Electron 渲染进程可用 `isomorphic-dompurify` 或浏览器版），白名单化标签/属性；保留 `html:true` 但净化后再解析。
- 这是**唯一一条我建议先于语法功能做的事**：它不增加用户可见功能，但决定了这个编辑器能不能安全打开陌生文件。

**⑤ 导出 HTML / PDF** — `markdownToHtml()` 已经写好了（`markdown.ts:19-27`），却只有测试在调用。
- 落地：主进程加 IPC `export:html`（套一份带样式的 HTML 模板）+ `webContents.printToPDF`（Electron 内置，零新依赖）。
- 这是"投入最小、用户感知最强"的一条。

### 4.2 第二档：补生态位（对应 STUB）

以下都对应 `editor-menu.ts:26-40` 的 STUB，markdown-it 生态都有成熟实现，但要注意四个点全打通：

| 功能 | 参考插件 | 优先级判断 |
|---|---|---|
| 脚注 | `markdown-it-footnote` | 中：学术/技术写作常用，实现涉及脚注定义与引用的双向 ID 管理 |
| 上标/下标 | `markdown-it-sub/sup` | 中低：低频，但实现简单，可顺手做 |
| YAML Frontmatter | `markdown-it-front-matter` | **中高**：它不只是语法，是知识库的元数据入口（标签、日期、状态都靠它） |
| 标题锚点 + 稳定 TOC | `markdown-it-anchor` + toc | 中：现有大纲靠正则（`outline.ts:7-19`），换成从文档树读 + 稳定 slug，跳转才不会点偏 |
| 链接引用 `[x][ref]` | CommonMark 原生 | 中低：编辑器里编辑引用定义体验差，收益有限 |
| 公式块 / 内联公式 | `markdown-it-texmath` + KaTeX | **中高**：技术写作刚需，但 KaTeX 体积 + 往返序列化成本高，建议单独排期 |
| 自动链接 `linkify` | markdown-it 选项 | 低：会改写用户输入的裸 URL，中文写作场景收益小，建议默认关、可选开 |
| 智能排版 `typographer` | markdown-it 选项 | 低：主要面向西文引号/破折号；中文场景甚至会误伤，不建议默认开 |

### 4.3 第三档：我自己的想法（超出 markdown-it 范畴）

markdown-it 解决的是"把 Markdown 变成 HTML"。但用户真正愿意为一个桌面编辑器付费/留存的原因不在语法覆盖，而在下面这些——这也是我认为值得投入差异化的方向：

**① 双向链接 `[[Wiki Link]]` + 反向链接面板**
- markdown-it 不负责这个（它是单文件渲染器）。但本项目已有文件树、多标签、大纲，天然是"知识库工具"的骨架。
- 落地：正则/轻量 parser 扫描工作区所有 .md 的 `[[...]]`，建内存索引；侧栏加"反链"页。成本可控，价值极高。
- 与 Frontmatter 组合就是个人知识库的 Core（标签 + 反链 + 搜索）。

**② 全文搜索（工作区级）**
- 目前只有文件树过滤（`tabs.ts` 的 `filterDirEntries`），没有内容搜索。
- 落地：主进程起一个轻量索引（可先用简单的文件内容扫描 + debounce，数据量大再上 SQLite FTS5）。

**③ 往返保真测试矩阵（工程能力，不是用户功能）**
- 这是我最想强调的一条：编辑器的命门是"打开→编辑→保存"不丢内容。当前 176 条测试里，往返测试只有 `markdown.test.ts:5-28` 覆盖基础语法，且明确把 `$$...$$` 归为"unsupported-looking"（`:30-31`）。
- 落地：建一个 golden fixtures 集，每条覆盖一种语法的 md → doc → md 往返，CI 里跑。加任何新语法前先加 fixture。**这是让前两档功能不出回归的安全网。**

**④ 聚焦模式 / 打字机模式**
- 项目卖点是 "Typora-like hybrid editing"，但当前混合编辑只做了焦点块标记（`CurrentBlockMarkdown.ts`），Typora 的核心体验（聚焦当前段、其余淡出）还没做。这是低成本、高感知的体验补齐。

**⑤ AI 改写（可选，长期）**
- WorkBuddy 有免密钥 LLM 调用能力，可做"选中段落 → 润色/Translate/续写"。但排在最后：它依赖前四档的地基稳，否则 AI 返回的 Markdown 进来就丢格式。

---

## 5. 明确**不**建议照搬的部分（自审）

按你的习惯，我把这个建议本身的漏洞也列出来——如果我是评审方，会这样质疑：

1. **"把 markdown-it 插件都接进来"是最大陷阱。** 插件是给渲染器用的，本项目是双向编辑器。例如 `markdown-it-container` 解析成 `<div class="warning">`，但 ProseMirror schema 没有对应节点，解析后内容会丢失。任何"接插件"提案都必须先回答：Node/Mark 放哪、serialize 怎么写、UI 怎么触发。
2. **表格和公式的成本被低估。** 表格往返涉及 GFM 对齐、单元格内 inline、可能的多行内容；公式涉及 KaTeX 宏定义与序列化。这两项各需要独立排期 + fixture，**不要和第一档其他功能一起承诺**。
3. **`html:true` 不能简单改成 `false`。** `markdown.ts:12` 注释明确说 `html:false` 会让 `htmlToMarkdown` 失效。正确做法是保留 `true` + 净化，而不是关掉它——我上面的建议已考虑这点，但实现时容易被"简单修掉"的冲动带偏。
4. **`breaks`/`typographer` 是产品决策，不是技术问题。** 中文写作里 `breaks:true`（单换行成 `<br>`）会改变大量既有 .md 的渲染；`typographer` 的西文排版规则对中文几乎无用。建议做成设置项，而非默认值。
5. **版本风险未验证。** 本项目经 `tiptap-markdown@0.8.10` 锁在 markdown-it 14.x；官方最新是 15.0.3（有 migration guide，含破坏性变更）。我没有评估升级对往返测试的影响，**不建议为了"用新版"而升级**——除非 14.x 有明确安全问题。
6. **明暗主题缺失。** `styles.css` 目前只适配浅色（Explore 结论）；语法高亮做进来后，深色主题会是自然诉求。这一点我在 §4.1③ 里点到但没展开，属于建议的盲区。
7. **本对比的事实来源**：官方 README + usage.md + 项目源码通读；**未实际运行项目验证 UI 行为**（如表格 STUB 的点击效果），结论基于代码路径推断。落地前建议用真实 .md 文件跑一遍基线。

---

## 6. 建议的推进顺序

```
P0  安全净化（还债）  ──►  golden fixtures 往返测试矩阵（安全网）
                              │
P1  表格 ─► 图片 ─► 代码高亮 ─► 导出 HTML/PDF
                              │
P2  Frontmatter ─► 稳定大纲/锚点 ─► 脚注/上下标 ─► 公式（独立排期）
                              │
P3  双向链接+反链 ─► 全文搜索 ─► 聚焦/打字机模式 ─► AI 改写
```

每完成一档，跑一遍 `npm test`（当前基线：22 个测试文件、约 176 用例全绿），并补一条真实 .md 的往返 fixture。

---

## 附：关键文件速查

| 文件 | 与增补相关的作用 |
|---|---|
| `src/shared/editor-menu.ts:26-40` | 13 个 STUB 动作清单（增补的天然 TODO） |
| `src/renderer/Editor.tsx:80-100` | TipTap 扩展注册点（加 Node/Mark 的主入口） |
| `src/shared/markdown.ts` | 无头编辑器 + `markdownToHtml`（导出复用的入口） |
| `src/shared/outline.ts:7-19` | 正则提取标题（稳定锚点要替换这里） |
| `src/renderer/extensions/CurrentBlockMarkdown.ts` | 焦点块标记（聚焦模式的基础） |
| `src/shared/markdown.test.ts` | 往返测试（fixture 矩阵的起点） |
| `src/renderer/styles.css` | 样式（高亮主题 / 明暗模式的落点） |
| `package.json:15-28` | 依赖清单（新扩展加在这里） |

---

## 附录 A：第一档实施报告（2026-11-18 完成）

### A.1 已落地内容

| 项 | 实现 | 验证 |
|---|---|---|
| **往返安全网** | 新增 `src/shared/markdown.fixtures.ts`（13 条 golden fixture）+ `markdown.fixtures.test.ts`；加语法前先加 fixture | 10 条字节级往返 + task list 语义往返全绿 |
| **扩展配置统一** | 新增 `src/shared/md-extensions.ts` 的 `createMarkdownExtensions()`，无头编辑器（`markdown.ts`）与屏幕编辑器（`Editor.tsx`）共用，消除配置漂移（此前无头端缺 TaskList/Image/Table/Underline） | 4 条红灯 fixture 全部转绿 |
| **HTML 安全净化** | 新增 `src/shared/sanitize.ts` + `md-sanitize-extension.ts`，在 markdown-it 的 `html_block`/`html_inline` token 层净化 | 10 条净化单测 + 3 条端到端；`<script>` 不再执行 |
| **GFM 表格** | 接入 `@tiptap/extension-table` 系列；`insertTable` 从 STUB 变为真实命令（3×3 带表头） | 往返 fixture + 菜单单测 + 真实 DOM 冒烟（2 表头 2 单元格） |
| **图片** | 接入 `@tiptap/extension-image`；`image` 动作接 prompt URL/描述 | 往返 fixture + 菜单单测 + 真实 DOM 冒烟 |
| **代码块语法高亮** | `CodeBlockLowlight` + lowlight(common) 替换 StarterKit 原生 codeBlock；独立导出 HTML 用 highlight.js | lowlight 配置测试 + 真实 DOM 冒烟确认 `hljs-*` span |
| **导出 HTML/PDF** | 新增 `src/shared/export-html.ts`（自包含 HTML + 内联高亮 CSS + 代码块着色）；IPC `export:html`/`export:pdf`，PDF 用离屏窗口 `printToPDF`；文件菜单加入口 | 4 条导出单测（含注入防护）；主进程构建通过 |

### A.2 与原计划的关键偏差（实施中发现并修正）

1. **安全净化的注入点变了**。原计划"在 markdown-it → ProseMirror 之间用 DOM 净化"。实测发现 `<script>` 在 happy-dom 的 DOMParser 阶段**就执行了**（探针报 `alert is not a function`），太晚。根因：markdown-it `html:true` 把原始 HTML 透传给 DOMParser。修正为在 markdown-it 的 `html_block`/`html_inline` renderer 规则里净化**字符串**（`parse.setup` 钩子），在 DOMParser 之前清除。
   - 中途试过 DOMPurify，发现它在 happy-dom 下绑定到 window 的时机不可靠（净化返回空串），改用不依赖 DOM 绑定的字符串净化（明确剔除危险标签/`on*`/危险 URL），测试与生产行为一致。
   - 另一个坑：markdown-it 把 `<u>`/`</u>` 拆成两个 inline token，逐片段做"解析成 DOM 再序列化"会破坏标签配对——因此字符串净化必须是"剔除危险构造、其余原样保留"，不做结构重建。

2. **task list 采用语义往返而非字节往返**。tiptap-markdown 把 taskList 序列化为 loose list（项间插空行），且 tightLists 只覆盖 bullet/ordered。内容/勾选状态无损，但字节不等，故从严格 fixture 移出，单列语义测试。

3. **代码高亮是 ProseMirror Decoration**。不进文档树，因此 `getHTML()`/`getMarkdown()` 看不到高亮 span——这是正确架构（高亮不应污染 Markdown）。测试策略相应改为：验证 lowlight 配置 + 真实编辑器 DOM 的 `hljs-*` span，而往返测试只断言无损。

### A.3 新增/修改文件清单

**新增**
- `src/shared/md-extensions.ts`、`src/shared/md-sanitize-extension.ts`、`src/shared/sanitize.ts`
- `src/shared/markdown.fixtures.ts`、`src/shared/markdown.fixtures.test.ts`
- `src/shared/md-extensions.test.ts`、`src/shared/sanitize.test.ts`
- `src/shared/export-html.ts`、`src/shared/export-html.test.ts`
- `src/renderer/Editor.smoke.test.tsx`

**修改**
- `src/shared/markdown.ts`（改用共享扩展）、`src/renderer/Editor.tsx`（同）
- `src/shared/editor-menu.ts`（table/image 去 STUB 并接命令）、`src/shared/editor-menu.test.ts`
- `src/shared/ipc.ts`、`electron/preload.ts`、`electron/main.ts`（导出 IPC）
- `src/shared/file-menu.ts`（导出菜单项）、`src/renderer/App.tsx`（导出接线）
- 相应测试的精确快照/API mock：`ipc.test.ts`、`file-menu.test.ts`、`App.test.tsx`
- `package.json` / lock（新增 9+ 依赖）

### A.4 仍需注意（未做，留给后续档）

- 表格**列对齐**（`:---:`）在往返中会丢失（内置 spec 固定写 `---`）——第一档只保证基础表格闭环，合并单元格/对齐属第二档。
- 图片**本地路径策略**（相对路径 / 复制到 assets / base64）尚未决策，当前仅支持 URL。
- 导出 PDF 的页边距/页眉页脚未做配置；导出 HTML 采用浅色主题（与 `styles.css` 一致，深色主题仍缺）。
- 本档**未启动真实 Electron GUI 做人工点击验证**；UI 行为通过 happy-dom 真实渲染冒烟测试覆盖，但与生产 Chromium 仍有环境差异。

---

## 附录 B：段落内（inline）功能补齐（2026-11-18 完成）

用户反馈"段落里的功能很多都不支持"。实测盘点后，本轮聚焦行内语法，测试 173→**219 全绿**，构建通过。

### B.1 实测盘点（动手前）

| 语法 | 补齐前表现 | 性质 |
|---|---|---|
| `**粗体**` `*斜体*` `~~删除~~` `` `代码` `` `[链接]()` `![图]()` `<u>下划</u>` | 正常 | 已支持 |
| `<sup>` / `<sub>` HTML | 渲染成 `x2`，**吞掉上下标** | 内容破坏 |
| `[^1]` + 定义行 | 曲解成 `text[^1](note)` 链接 | 内容破坏 |
| `==高亮==` | 原样文本 | 缺语法 |
| 裸 URL | 不转链接 | linkify 关闭 |

### B.2 落地内容

| 功能 | 实现 | 验证 |
|---|---|---|
| **高亮 `==x==`** | `markdown-it-mark` 把 `==x==` → `<mark>`，复用现有 Highlight mark；自定义 serialize spec 输出 `==x==` | 严格往返 fixture + UI DOM 冒烟 |
| **上标 `^x^`** | `markdown-it-sup` + TipTap Superscript；serialize 输出 `^x^` | 严格 fixture + UI DOM（`sup` 元素）|
| **下标 `~x~`** | `markdown-it-sub` + TipTap Subscript；serialize 输出 `~x~` | 严格 fixture + UI DOM（`sub` 元素）|
| **裸 URL 自动链接** | `Markdown.configure({ linkify: true })`（原生选项）| UI DOM 冒烟确认 `<a href>` |
| **脚注内容保全** | `FootnoteGuard`：parse 前把 `[^label]:` 的冒号转义，阻止 markdown-it 当链接定义 | 防曲解测试 + UI DOM 冒烟 |

新增文件：`src/shared/md-inline-syntax.ts`、`md-footnote-guard.ts`、`markdown-it-plugins.d.ts`；扩展 `markdown.fixtures.ts`（+2 条严格 fixture）、`markdown.test.ts`、`Editor.smoke.test.tsx`（+5 条 UI 冒烟）；`md-extensions.ts` 接线。

### B.3 脚注为何只做"内容保全"而非完整 GFM（诚实交代）

完整 GFM 脚注需要自定义 ProseMirror 节点 + 跨块 ID 管理（正文引用 ↔ 文末定义区）。实测证明走捷径会破坏文档：

- 直接注册 `markdown-it-footnote`：它渲染出 `<hr class=footnotes-sep><section class=footnotes><ol>...`，TipTap schema 无对应节点，被压平成游离的有序列表；序列化输出 `text^\[1\]^](#fn1)` 这种残缺 Markdown。
- 且 `parse.setup` 每次 parse 都执行，`md.use(footnote)` 会累积注册导致定义区重复 3 次（用标志位只注册一次可缓解，但结构问题仍在）。

因此当时选择务实的中间路线：**保证不丢内容、不被曲解为错误链接**，并把 `\[^1\]` 记为已知规范化差异。**该状态已在附录 C 升级**：`FootnoteRef` 作为行内 atom 接住 `[^label]`，定义行继续由 `FootnoteGuard` 保护，现在 `[^1]` 与 `[^1]: note` 都能字节级往返，`\[^1\]` 差异已消除。结论不变的部分是：**直接注册 `markdown-it-footnote` 仍然是错误做法**，结构化节点必须自己写。

### B.4 新增的已知规范化差异（追加到 §4.3③ 清单）

- ~~脚注 `\[^1\]`：反斜杠转义~~ — 附录 C 已消除，改为真正的 `FootnoteRef` 节点。
- 裸 URL 经 linkify 后序列化为 `<https://...>`（autolink 形式）而非裸写，语义相同。
- `^x^` / `~x~` / `==x==` 中有空格时不被识别（markdown-it-sup/sub/mark 插件的既定规则，如 `a^b c^` 不是上标）。

---

## 附录 C：功能栏「段落」菜单功能补齐

### C.1 问题定位

此前 `src/shared/editor-menu.ts` 的 `STUBS` 集合里有 11 个动作点击后只弹「暂不支持」，其中「段落」菜单占 7 个：`mathBlock`、`linkReference`、`footnote`、`toc`、`yamlFrontMatter`、`htmlBlock`、`deleteBlock`；「格式」菜单还有 `inlineMath`、`superscript`、`subscript`、`comment`。这不是 Markdown 段落内的行内语法问题（那是附录 B 的范围），而是原生菜单动作没有接实现。

### C.2 关键机制：Markdown 感知的内容插入

`tiptap-markdown` 会 patch `insertContentAt`，**传入字符串时按 Markdown 解析**，而不是按 HTML。这正好复用打开 `.md` 文件的同一条解析链，因此插入的块天然满足往返承诺：

```ts
// src/shared/editor-menu.ts
function insertMarkdown(editor: Editor, markdown: string): boolean {
  const { from, to } = editor.state.selection
  return editor.chain().focus().insertContentAt({ from, to }, markdown).run()
}
```

但实测发现，**仅靠插入源码并不够**：

| 片段 | 直接插入后的往返结果 | 结论 |
|---|---|---|
| `$$\nE = mc^2\n$$` | 折叠成 `$$ E = mc^2 $$`（paragraph softbreak） | 需专用块节点 |
| `---\ntitle: x\ntags: [a,b]\n---` | 变成 hr + heading，`[a,b]` 被转义 | 需专用块节点 |
| `[^1]: note` | 经 FootnoteGuard 后原样保留 | 可用 |
| `[text][ref]` + 定义 | 定义被 markdown-it 消费、丢失 | 规范化为 inline link |
| `<div>...</div>` | 标签被 schema 剥掉，只剩文本 | 用 fenced block 保真 |
| `- [Intro](#intro)` | 原样保留 | 可用 |

### C.3 新增的三个语义节点

| 节点 | 文件 | 作用 |
|---|---|---|
| `FootnoteRef` | `src/shared/md-footnote-ref.ts` | markdown-it inline rule 把 `[^label]` 解析为行内 atom；序列化输出 `[^label]`，消除 `\[^label\]` 转义 |
| `FrontMatter` | `src/shared/md-front-matter.ts` | block rule 在文档开头认领 `---` 对，body 逐字保存；序列化输出 `---\n...\n---` |
| `MathBlock` | `src/shared/md-math.ts` | block rule 认领 `$$` 围栏，避免软换行被折叠；序列化输出 `$$\n...\n$$` |

三者都通过 `addStorage().markdown.parse.setup` 注册 markdown-it 规则，并在 **md 实例上**打注册标记。踩过的坑：最初把 `registered` 标记放在 `addStorage()` 闭包里，而 extension 实例会被多个 Editor 复用，导致第二个编辑器创建新 md 实例时跳过注册——规则静默失效。标记必须挂在 `md` 上，而不是 extension 闭包上。

另一个坑：脚注 atom 最初用 `<sup data-footnote-ref>` 渲染，但 `<sup>` 同时匹配 Superscript mark，ProseMirror 优先选择 mark，节点被吞掉并序列化成 `^1^`。改用 `<span data-footnote-ref>` 后正常。

### C.4 各动作的最终实现层级

| 菜单动作 | 实现 | 层级 |
|---|---|---|
| 公式块 | `$$\n...\n$$` → `MathBlock` | **源码级保真**，尚未接 KaTeX 渲染 |
| YAML Front Matter | 文档开头插入/替换 `FrontMatter` 节点 | **结构化支持**（专用节点），但元数据未接入搜索/索引 |
| 脚注 | prompt 收集编号与内容，插入引用 + 定义 | **结构化行内节点 + 定义保全**；无跳转/反向引用 UI |
| 内容目录 | 扫描 heading 节点生成嵌套链接列表 | 生成标准 Markdown 列表；锚点用简单 slug（非 markdown-it-anchor 的稳定 slug） |
| HTML 内容 | prompt 收集后插入 ` ```html ` fenced block | **源码级保真**，不渲染 HTML |
| 链接引用 | prompt 收集文字/URL，插入 inline link | **语义规范化**：reference 定义会被 markdown-it 消费，故统一为 `[text](url)` |
| 删除块 | `deleteRange` 删除光标所在顶层块 | 完整实现 |
| 上下标 | 接 `toggleSuperscript` / `toggleSubscript` | 完整实现（扩展此前已装好却没接命令）|
| 内联公式 | 插入 `$...$` 文本 | 源码级保真，无 KaTeX 渲染 |
| 注释 | 插入 ` ```text ` fenced block 包住 `<!-- -->` | 源码级保真，schema 不渲染注释 |

### C.5 验证

- Golden fixtures 从 15 条增至 21 条，新增脚注、Front Matter、公式块、内联公式、HTML 源码块、TOC 链接的**严格字节往返**。
- `editor-menu.test.ts` 从 13 条增至 25 条，覆盖每个新动作的真实文档变更与取消操作。
- 全量测试 **237 条通过**；`npm run build` 通过。
- 变更文件：`editor-menu.ts`、`md-extensions.ts`、`markdown.fixtures.ts`、`markdown.test.ts`、`editor-menu.test.ts`，新增 `md-footnote-ref.ts`、`md-front-matter.ts`、`md-math.ts`。

### C.6 仍未做（不要误读为已完成）

- KaTeX 渲染与公式编号；当前公式是保真源码 + 等宽显示。
- ~~真正的 GFM 脚注区块~~ — 附录 D 已补引用↔定义双向跳转；文末定义区 UI 与反链仍未做。
- ~~Front Matter 标签的搜索/索引集成~~ — 附录 D 已补工作区标签面板。
- ~~稳定标题锚点~~ — 附录 D 已用共享 slugger 打通 TOC 与导出锚点。

---

## 附录 D：锚点闭环、脚注跳转与标签索引

### D.1 稳定标题锚点 + TOC 闭环

此前 TOC 用本地简单 slug（只做小写、空格转 `-`），而导出的 HTML 没有给标题加 `id`——TOC 链接在导出文件里根本点不中。修复方式是把 slug 算法抽成共享模块 `src/shared/slugger.ts`：

- `slugifyHeading()` 对齐 markdown-it-anchor 的默认规则（小写、去 ASCII/中文标点、空白转 `-`），额外覆盖全角标点区段（中文标题里的 `：`、`，` 很常见）。
- `createHeadingSlugger()` 按文档顺序生成，重复标题追加 `-1`/`-2`。
- TOC 插入（`editor-menu.ts`）与 HTML 导出（`export-html.ts`）各持一个 slugger 实例按序遍历，保证后缀对齐。
- 新增 `src/renderer/extensions/AnchorJump.ts`，用 ProseMirror `handleClick` 处理编辑器内的 `#slug` 链接：按同一套 slug 找到标题并滚动定位。不改动文档，不影响 Markdown 序列化。

验证：`slugger.test.ts` 直接断言「TOC 生成的锚点序列 == 导出 HTML 的 id 序列」，含重复标题与中文标题。

### D.2 脚注引用 ↔ 定义双向跳转

`AnchorJump` 同时处理 `span[data-footnote-ref]`：

- 点击正文 `[^1]` → 找到首个 `paragraph` 且首子节点为该标签的 `footnoteRef` atom（即定义行）并定位。
- 点击定义行里的标记 → 反向找到正文里第一个非定义段落的引用并定位。

仍然是在 view 层做导航，不改变文档内容，往返序列化不受影响。4 条插件测试覆盖两条跳转方向与「找不到目标时忽略」。

### D.3 Front Matter 标签索引

把 FrontMatter 从「能存」推进到「能用」：

| 层 | 文件 | 内容 |
|---|---|---|
| 解析 | `src/shared/frontmatter.ts` | 轻量 YAML 子集：标题、行内 `tags: [a, b]`、块式 `- item`；引号内逗号不拆分 |
| 扫描 | `electron/workspace-tags.ts` | 递归读取工作区 `.md`，跳过 `node_modules`/`.git`/`release*` 等，只读不写 |
| IPC | `ipc.ts` / `preload.ts` / `main.ts` | 新增 `workspace:scanTags` |
| UI | `src/renderer/TagPanel.tsx` + `Sidebar.tsx` | 侧栏新增「标签」页：标签云带计数，按标签筛选文件，点击打开 |

扫描刻意只读：结合附录「文件占用排查」的结论，任何对工作区内大文件的写操作都可能与打包/索引冲突。

### D.4 验证

- 全量测试 **257 条通过**（32 个测试文件），`npm run build` 通过。
- `vitest.config.ts` 的 include 扩展到 `electron/**/*.test.ts`，否则主进程的扫描器测试不会被执行。
- 新增测试：`slugger.test.ts`（4）、`export-html.test.ts`（+2）、`AnchorJump.test.ts`（4）、`frontmatter.test.ts`（5）、`TagPanel.test.tsx`（3）、`workspace-tags.test.ts`（2）。

### D.5 仍未完成

- **KaTeX 真渲染**：公式块目前是保真源码 + 等宽显示，没有公式排版与编号。这是 C.6 里唯一完全没动的一项，涉及新依赖和体积评估，建议单独排期。
- GFM 脚注的文末定义区 UI、反向引用面板。
- 第三档剩余：聚焦/打字机模式、AI 改写。（双向链接与全文搜索已在附录 E 完成。）

---

## 附录 E：统一索引层、全文搜索与双向链接

### E.1 一次扫描，三处复用

标签索引（附录 D）原本是独立 IPC。继续加搜索和反向链接时没有再开两个扫描器，而是抽出 `electron/workspace-scan.ts` 作为唯一只读遍历入口，再分成两个消费者：

| 消费者 | IPC | 数据 |
|---|---|---|
| 标签 | `workspace:scanTags`（保留兼容） | 仅带 tags 的文件 |
| 搜索 / 反链 | `workspace:buildIndex`（新增） | title、tags、headings、links、完整正文 |

`App.tsx` 现在只调用 `buildIndex`，标签页从索引派生——同一份快照同时喂给三个侧栏页，避免两次磁盘遍历，也保证 skip 规则与大小上限不会漂移。`scanTags` 通道保留是为了不破坏既有调用方。

### E.2 `[[Wiki Link]]`：为什么又是一个专用节点

跟脚注 `[^1]` 同样的理由：普通文本会被 tiptap-markdown 转义成 `\[\[Target\]\]`，Link mark 又会序列化成 `[Alias](Target)`，两者都不是 Wiki 语法。新增 `src/shared/md-wiki-link.ts`：

- markdown-it inline rule 在 `link` 之前认领 `[[Target]]` / `[[Target|Alias]]`，输出 `<span data-wiki-link data-wiki-alias>`
- TipTap `wikiLink` inline atom 保留 target/alias 两个 attr，serialize 原样写回 `[[...]]`
- 注册标记挂在 md 实例上（延续附录 C 的修复，避免多 Editor 复用时静默失效）
- `AnchorJump` 扩展新增 `onWikiLink` 回调：点击 `span[data-wiki-link]` 时把 target 交给 App 层解析并打开文件
- 解析/归一化/解析目标都在 `src/shared/wiki-link.ts`，主进程扫描与渲染进程点击共用同一套规则（精确 basename > 精确路径 > 后缀匹配）

代码块里的 `[[example]]` 不会成为链接：markdown-it 的 inline rule 不进 fenced code，索引扫描时也先把 ``` 和 ` 包裹内容剥掉。

### E.3 全文搜索与反向链接面板

- `workspace-search.ts`：大小写不敏感检索文件名、Front Matter 标题和逐行正文；标题命中优先，每文件最多 3 条带行号的片段；结果上限 80 个文件。
- `SearchPanel.tsx`：侧栏「搜索」页，输入即查，`<mark>` 高亮命中词，点击标题打开对应文件。刷新按钮重建索引。
- `workspace-links.ts`：按当前文件的 basename 作为 wiki 身份，统计出链与被引用；两者都带来源行作为上下文。
- `BacklinksPanel.tsx`：侧栏「反链」页，分别列出出链和反向链接，点击可跳转。
- 侧栏现在有 5 个页签（文件/大纲/标签/搜索/反链），相应收窄了页签内边距。

### E.4 验证

- 全量测试 **282 条通过**（38 个测试文件），`npm run build` 通过。
- Golden fixtures 增至 24 条，新增 `[[Target]]` / `[[Other|Alias]]` 严格字节往返。
- 新增测试：`wiki-link.test.ts`（5）、`workspace-index.test.ts`（2）、`workspace-search.test.ts`（4）、`workspace-links.test.ts`（4）、`SearchPanel.test.tsx`（4）、`BacklinksPanel.test.tsx`（3），`AnchorJump.test.ts` +1（点击委托），`Sidebar.test.tsx` +1（页签切换）。
- 搜索是在渲染进程对内存索引做字符串匹配，没有新增 IPC 往返；超大工作区（数千文件）的索引体积是在内存里，若成为瓶颈再考虑增量索引。

### E.5 仍未完成

- **KaTeX 真渲染**：公式仍是保真源码 + 等宽显示。
- GFM 脚注的文末定义区 UI 与反向引用面板（已有关联跳转，但没有集中展示）。
- 聚焦/打字机模式、AI 改写。
- Wiki 链接目前只按文件名/路径解析，不支持 Obsidian 式的 block reference（`[[note#^block]]`）与标题锚点定位。
