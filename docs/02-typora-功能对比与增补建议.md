# Typora 对比与功能增补建议

> **实施状态（2026-11-22 更新）**：第一档已全部落地并通过测试，详见文末「附录 A：第一档实施报告」。

> 日期：2026-11-22
> 事实来源：Typora 官网功能页（typora.io / typora.net）、v2.typora.io 预览页、第三方编辑器目录 markdownlist.com（标注 2026-11-08 核对）、本项目源码与 `docs/01` 实施记录。
> 边界说明：**未实际安装 Typora 跑 UI**，结论基于官方功能描述 + 第三方核对 + 本项目代码路径。Typora 2.0 截至本文仍是预览/候补状态（官网多处标注 Planned / Under review），只作为方向参考，**不计入已发布功能对比**。

---

## 0. 结论先行

| 档位 | 建议增补 | 为什么 | 与现有能力的关系 |
|---|---|---|---|
| **第一档**（高感知、低风险） | 字数统计 + 状态栏 | Typora 标志性功能；纯读取文档，零往返风险 | 全新，无依赖 |
| | 专注模式 + 打字机模式 | 项目卖点就是 "Typora-like hybrid editing"，唯独这两项没做 | 复用 Decoration，不改文档 |
| | 自动配对（括号/引号） | 写作手感的基础 | 需实测，勿碰 Markdown 符号配对 |
| | 深色主题 | 连明暗切换都没有，主题地基缺失 | 复用 prefs 持久化 |
| **第二档**（刚需、需独立排期） | 图片增强（拖放/相对路径/缩放） | 当前图片仅支持菜单填 URL，写作断点 | 已有 `@tiptap/extension-image` |
| | Mermaid / 流程图渲染 | Typora 强项，技术写作常见 | 需复用 `md-*` 专用节点经验，保证往返 |
| | KaTeX 真渲染 | `docs/01` 里唯一完全没动的项 | `md-math.ts` 已有节点基础 |
| **第三档**（差异化 / 自己的想法） | Wiki 链接重命名跟随 | 我们有 `[[Wiki Link]]`，但重命名文件会断链 | 已有 wiki-link 解析层 |
| | 代码块行号 + 列表类型转换 | 补齐编辑手感细节 | 低成本 |
| | 文章列表（Articles 面板） | Typora 双面板之一，日记/博客场景有用 | 复用 workspace-index |

**一句话判断**：Typora 强在**单文档写作手感**（专注/打字机/自动配对/字数），本项目已经强在**工作区知识管理**（全文搜索、标签、反链、文档内查找替换——这些正是 Typora 的弱项）。真正该补的是前者，而不是去追 Typora 的图表全家桶。

---

## 1. 先厘清一个根本差异（这是全篇的地基）

**Typora 是"单文档写作工具"，本项目是"工作区知识库 + 双向编辑器"。** 这个差异决定了什么该抄、什么不该抄。

### 1.1 我们已经超出 Typora 的部分（不要自我否定，盲目照抄）

| 能力 | Typora | 本项目 |
|---|---|---|
| 工作区全文搜索 | 无（只有单文档查找） | ✅ 跨文件索引 + 高亮片段 |
| Front Matter 标签索引 | 仅语法兼容，无标签面板 | ✅ 标签云 + 点击打开 |
| 反向链接 | 1.x 无；2.0 才规划 Wiki 链接 | ✅ 出链 + 反链 + 上下文 |
| 文档内查找替换 | 查找有，替换能力弱 | ✅ 大小写/全词 + 替换全部 |
| 面板可见性管理 | 固定布局 | ✅ 视图菜单 toggle + 勾选状态 |

这些是 Typora 作为"专注单文件"工具刻意不做的事。继续在这个方向投入，不和它正面竞争。

### 1.2 Typora 强而我们弱的部分（真正的差距）

1. **无干扰写作体验**：专注模式（其余行淡出）、打字机模式（当前行恒定居中）——这是 Typora 的灵魂，我们完全没有。
2. **写作手感细节**：自动配对、字数统计状态栏、表格拖拽调整、Emoji 补全。
3. **富内容渲染**：Mermaid/流程图/序列图、数学公式真渲染、图片缩放。

### 1.3 本项目独有的工程约束（Typora 没有的枷锁）

Typora 是"渲染即终点"——公式/图表渲染成 HTML 就结束了，源文件始终是 `$$...$$` 或 fenced code。
我们是**双向编辑器**：任何新节点都必须回答三个问题——

1. Node/Mark 放在 ProseMirror schema 的哪里？
2. `toMarkdown` 如何字节级序列化回去？
3. 编辑光标落进去时，焦点块的标记如何显示？

`docs/01` 附录 B/C/E 已经踩过一轮：`markdown-it-footnote` 直接注册会把 `[^1]` 转义成 `\\[^1\\]`；脚注 atom 用 `<sup>` 会被 Superscript mark 吞掉；扩展注册标记放闭包里会因多 Editor 复用静默失效。**任何"接一个 Typora 渲染库"的提案，不回答这三点就是不合格提案。**

---

## 2. Typora 能力清单（对比基准）

### 2.1 已发布（1.x）官方功能

**编辑与呈现**
- 所见即所得实时预览（无预览窗、无模式切换）
- 标题 / 加粗 / 斜体 / 行内代码 / 删除线 / 引用 / 水平线 / 任务列表
- 有序 / 无序 / 任务列表互换；Tab / Shift+Tab 缩进嵌套
- GFM 表格（拖拽调整大小、快速重排、快捷键插入）
- 代码语法高亮（约 100 种语言）
- Emoji 自动补全
- CJK 字符集强/强调正确渲染
- 自定义 CSS（字号、对齐、标题自动编号）

**图片与链接**
- 拖放插入图片、相对路径（可设基准目录）、图片缩放（`<img>` 尺寸/zoom）、云上传（macOS iPic）

**导航与组织**
- 文件树 + 文章列表双面板、大纲面板、`[TOC]` 目录、标题内部跳转链接
- Front Matter、脚注悬停显示

**写作辅助**
- 字数统计（词/字符/行数/阅读分钟）、专注模式、打字机模式、自动配对（括号/引号 + Markdown 符号）、行号、错误提示

**数学与图表**
- MathJax 扩展（mhchem / AMSmath / BBox）、公式自动编号
- flowchart.js 流程图、Mermaid（流程图/序列/甘特）、序列图

**导入导出**
- PDF（带书签）、HTML；依赖 Pandoc 导出 docx / OpenOffice / LaTeX / MediaWiki / Epub

### 2.2 预览中（2.0，未发布，仅参考）

官网 feature board 列出：Focus mode with typewriter scrolling（Planned）、Footnote popovers on hover（Under review）、自定义导出模板、按文件夹主题/字体、Wiki 风格链接（重命名后仍有效）。**这些不能当作"Typora 已有"来对比**——其中"脚注悬停"我们已有更强的跳转闭环，"Wiki 链接"我们已经有双向解析。

---

## 3. 逐项对照

图例：✅ 已做 ／ 🟡 部分 ／ ❌ 缺口 ／ ⛔ 不建议照搬

| Typora 功能 | 本项目 | 判定 |
|---|---|---|
| 实时预览 / 混合编辑 | CurrentBlockMarkdown 焦点块显标记 | ✅ |
| 标题/加粗/斜体/引用/水平线/任务列表 | 段落+格式菜单全套动作 | ✅ |
| 列表缩进/缩出 | indent / outdent | ✅ |
| 列表类型转换 | bullet/ordered/task 分开插入，无一键互换 | 🟡 |
| GFM 表格插入 | insertTable | ✅ |
| 表格拖拽调整 / 重排 | 无 | ⛔ 见 §5.3 |
| 代码语法高亮 | lowlight | ✅ |
| 代码块行号 | 无 | ❌ 低成本 |
| 标题锚点 + TOC | 共享 slugger，TOC 与导出锚点一致 | ✅ |
| Front Matter | 语法 + 标签索引面板 | ✅ 超出 |
| 脚注 | 引用↔定义双向跳转 | ✅ 超出（2.0 的 hover 还在评审） |
| Wiki 链接 / 反链 | 解析 + 反链面板 | ✅ 超出（重命名不跟随，见 §4.3⑧） |
| 工作区搜索 / 标签 / 查找替换 | 见 §1.1 | ✅ 超出 |
| 拖放图片 / 相对路径 / 缩放 | 仅菜单填 URL | ❌ 写作断点 |
| 图片云上传 | 无 | ⛔ 见 §5.1 |
| 自定义 CSS / 标题自动编号 | 无（连深色主题都没有） | 🟡 先做明暗，见 §4.1④ / §5.4 |
| Emoji 自动补全 | 无 | ⛔ 见 §5.5 |
| 数学公式 + 自动编号 | 仅源码保真，未渲染 | ❌ 见 §4.2⑦ |
| Mermaid / 流程图 / 序列图 | 无 | ❌ 见 §4.2⑥ |
| PDF / HTML 导出 | webContents.printToPDF + 自包含 HTML | ✅ |
| Pandoc 全格式导出 | 无 | ⛔ 见 §5.2 |
| 文件树 + 大纲面板 | 文件树 + 大纲 + 4 个可选面板 | ✅ 超出 |
| 文章列表（按时间排序） | 无 | ❌ 见 §4.3⑩ |
| **字数统计** | 无 | ❌ 见 §4.1① |
| **专注模式 + 打字机模式** | 无 | ❌ 见 §4.1② |
| **自动配对** | 无 | ❌ 见 §4.1③ |

---

## 4. 值得添加的功能（按档详述）

### 4.1 第一档：高感知、低风险（建议先做，可一次交付）

#### ① 字数统计 + 状态栏

- **现状**：App 底部无状态栏，任何统计都没有。
- **价值**：Typora 用户最常驻屏的信息；写作时"今天写了多少"的即时反馈。
- **落地**：
  - 纯逻辑放 `src/shared/word-count.ts`：遍历 ProseMirror doc 的 text node，区分 CJK 字符与西文词（CJK 按字计、西文按 `\b` 词计），并给出字符数、行数、阅读分钟（中文约 400 字/分钟）。
  - 渲染层 `StatusBar.tsx`，挂在 App 主区底部；从 Editor 拿当前 doc，debounce 150ms 更新，避免每次按键重算大文档。
  - 点击字数弹一个小明细（词/字符/行/阅读时长），对齐 Typora。
- **关键决策**：只读取、`tr.docChanged` 时重算；**绝不把统计写回文档**，零往返风险。
- **验证**：中英混排（含 `[[Wiki Link]]`、`$$...$$`、表格）的计数单测；编辑后状态栏更新的端到端测试。

#### ② 专注模式 + 打字机模式

- **现状**：卖点是 Typora-like，但这两项核心体验完全没做，`docs/01` 附录 D.5 一直挂在未完成。
- **价值**：这是"写作手感"的最大缺口，也是和 Typora 直觉最接近的能力。
- **落地**：
  - **专注模式**：ProseMirror `Decoration.node` 给非当前块加 class `is-dimmed`，CSS 降透明度；光标所在块高亮。只加 decoration，不动文档内容——和 `DocumentSearch.ts` 的高亮方案同构，已有成熟范式可抄。
  - **打字机模式**：监听 selection，把当前块.scrollIntoView 到视口垂直居中；用 `requestAnimationFrame` 节流。仅视觉滚动，不改文档。
  - 两个开关进状态栏（承接 ①）+ 偏好持久化（复用 `app-prefs` / `prefs-store` 通道，与 sidebarWidth 同套路）。
- **关键决策**：作用域限定在"当前打开的 tab"，切换标签时重置；不可影响导出（导出 HTML/PDF 不应带 dimmed class）。
- **验证**：开关切换后 decoration 数量变化测试；序列化前后 `getMarkdown()` 字节不变（延续 `DocumentSearch` 的断言思路）。

#### ③ 自动配对（括号/引号）

- **现状**：无任何输入补全。
- **价值**：写代码/公式时的基础手感。
- **落地**：ProseMirror `handleTextInput` 或 input rules：输入 `(`、`[`、`{`、`"`、`'` 时补右半边并把光标放回中间；有选区时包裹选区。
- **关键风险（务必实测）**：**不要自动配对 Markdown 符号**（`*`、`_`、`**`）。本项目的标记只在焦点块显示，自动补 `**` 会让光标位置和标记显隐打架。Typora 把这项做成"可选项"正是这个原因——我们默认只配括号/引号，Markdown 符号配对不做。

#### ④ 深色主题（明暗切换）

- **现状**：`styles.css` 只有浅色，无 `data-theme`，无切换入口。
- **价值**：门槛低、感知强；也是后续 Mermaid/KaTeX 渲染的前置（图表配色要跟主题走）。
- **落地**：把颜色抽成 CSS 变量（`:root` / `[data-theme='dark']`），主题状态进 prefs，状态栏或视图菜单加切换。导出 HTML 沿用当前主题快照。
- **验证**：明暗两套变量无遗漏（检查脚本或快照测试）；主题切换不改文档。

---

### 4.2 第二档：刚需但需独立排期（每项都要 fixture，不要和第一档一起承诺）

#### ⑤ 图片增强（拖放 / 相对路径 / 缩放）

- **现状**：仅通过菜单填 URL；本地图片无拖放、无相对路径策略、`docs/01` 附录 A.4 明确记为未决策。
- **落地**：
  - 拖放：复用 App 已有的 `onDrop` 文件处理（当前只接 `.md`），扩展识别图片扩展名，读入后按"相对文档目录 / 复制到 assets"策略落盘。
  - 相对路径：基于当前文档路径解析 `file://`，避免 `webSecurity:false`；沿用 `src/shared/paths.ts` 的规范化。
  - 缩放：给 image 节点加 `width`/`height` 属性，`toMarkdown` 输出 `<img src=... width=...>`（GFM 图片语法无尺寸，必须用 HTML——注意安全净化白名单要放行 `width`/`height`）。
- **风险**：Electron 本地图片加载的协议配置；路径策略要写进偏好并做迁移。
- **验证**：拖放后生成的 Markdown 路径正确、移动 .md 后图片仍可解析、往返不改尺寸。

#### ⑥ Mermaid / 流程图渲染

- **现状**：无。Typora 靠 fenced code + mermaid 引擎。
- **价值**：技术写作刚需，也是和 Typora 拉平的最显眼的一项。
- **落地（尊重往返约束）**：
  - 源码始终是 ` ```mermaid ... ``` `；编辑器内渲染走专用 node view（复用 `md-math.ts` 的节点经验：注册标记挂 md 实例、atom 用 `<span>` 避免被 mark 吞）。
  - `mermaid` 库设置 `securityLevel: 'strict'`（防 XSS），配色跟随主题（依赖 ④）。
  - 导出 HTML/PDF 时用同一份 mermaid → SVG，保证所见即所得。
- **风险**：mermaid 体积大（按需引入）/ 渲染失败要有降级（显示源码 + 错误提示，对齐 Typora 的"错误提示"）；**必须独立排期 + 独立 fixture**，吸取 `docs/01` 里表格/公式一起承诺的教训。

#### ⑦ KaTeX 真渲染

- **现状**：`$$...$$` 和 `$...$` 只做源码保真，等宽显示（`docs/01` 附录 C.6 唯一完全没动的项）。
- **落地**：`md-math.ts` 已有 block/inline 节点基础；接 KaTeX 渲染器，编译产物序列化回原 LaTeX 源码。公式自动编号先不做（Typora 也是偏好开关，非默认）。
- **风险**：KaTeX 体积 + 宏定义/序列化成本；同样独立排期。

---

### 4.3 第三档：差异化 / 我自己的想法（超出单纯抄 Typora）

#### ⑧ Wiki 链接重命名跟随

- **现状**：`[[Target|Alias]]` 能解析、能点开、有反链；但重命名/移动文件后链接断裂。
- **为什么值得**：这正是 Typora 2.0 规划里的 Wiki 链接卖点——"重命名后仍有效"。我们已经有链接图（workspace-links），补这一步成本不高，却能把知识库从"能查"升级到"可维护"。
- **落地**：重命名时遍历工作区 `.md`，替换 `[[old]]` → `[[new]]`，保留别名 `[[old|alias]]` 的 alias 与路径形式 `[[dir/old]]`；提供"预览 3 处将修改"再确认。
- **冲突诚实交代**：这需要对工作区文件**写入**，和现有"只读扫描"约定（附录 D/E，为避免索引/打包冲突）相悖。建议做成显式操作（用户点"重命名并更新链接"才触发），不自动后台跑。

#### ⑨ 代码块行号 + 列表类型转换

- 行号：CSS counter 或 `Decoration.line`，只对 fenced code block 生效，成本极低。
- 列表类型转换：选中列表时在 bullet/ordered/task 间一键切换；tiptap 的 `toggleBulletList`/`toggleOrderedList`/`toggleTaskList` 组合即可，注意先取消原类型再设置，避免嵌套错乱。

#### ⑩ 文章列表（Articles 面板）

- Typora 的第二个侧栏，按修改时间倒序列出所有笔记，适合日记/博客流。
- 复用 `workspace-index` 的 `IndexedFile`（已有 title/tags/headings/content），按 `mtime` 排序即可；做成视图菜单里可 toggle 的第六个面板，延续现有面板机制。

---

## 5. 明确**不**建议照搬的部分（评审自审）

按你的习惯，我把这份建议本身的漏洞也摆出来——如果我是评审方，会这样质疑：

### 5.1 图片云上传（iPic）
需要第三方账号 + 后端上传接口，和项目"本地优先、无账号"定位冲突；国内 iPic 生态也弱。**不做。**

### 5.2 Pandoc 全格式导出（docx/Epub/LaTeX/MediaWiki）
重外部依赖，Windows 用户要装 Pandoc，分发复杂度陡增。HTML/PDF 已覆盖绝大多数场景。**不做**，除非有明确用户要求。

### 5.3 表格拖拽调整列宽 / 快速重排
**GFM 表格语法没有列宽字段**——拖拽调整的结果无法写回 Markdown，只能靠 HTML 表格，会破坏"纯 Markdown"承诺且和 `docs/01` 附录 C 的"表格往返"目标冲突。ProseMirror 表格拖拽本身也是高成本交互。**不做。**

### 5.4 自定义 CSS 主题 / 标题自动编号
自定义 CSS 是长尾需求，先做明暗两档内置主题（④）即可；标题自动编号用 CSS counter 实现，会和本项目"稳定 slug + 导出锚点一致"的机制打架（编号变化但锚点不变）。**不做自动编号。**

### 5.5 Emoji 自动补全
输入法已覆盖绝大多数场景，收益低。**不做。**

### 5.6 这份建议自身的漏洞（重点自审）

1. **"先做字数统计和主题，是不是在挑软柿子？"** —— 部分是。它们感知/成本比最高，且是后续能力的地基（状态栏承载专注/打字机开关，深色主题承载 Mermaid/KaTeX 配色）。但不是逃避硬骨头：Mermaid/KaTeX 我明确要求独立排期 + fixture，不和第一档混在一起承诺。
2. **自动配对的冲突被低估**：Markdown 符号配对和"焦点块显标记"的交互没实测，可能做出来手感更差。缓解：默认只配括号/引号，先发再观察。
3. **重命名跟随与"只读扫描"约定正面冲突**：这是第三档里唯一需要写工作区文件的功能，风险高于其它项，必须做成显式确认操作，不能默默跑。
4. **事实来源局限**：未安装 Typora 实测 1.13 的 UI 细节（如替换能力、表格拖拽手感）；2.0 功能仍在变动。若要把某项作为"对标目标"，落地前应实际装一次确认。
5. **别用"功能数量"当目标**：我们在 §1.1 已经超出 Typora 四项。继续堆功能不是目的，写作手感的补齐（第一档）才是这次对比真正该拿走的东西。

---

## 6. 建议推进顺序

```
P1  字数统计 + 状态栏 ─► 专注/打字机模式 ─► 自动配对 ─► 深色主题
                              │  （状态栏承载开关，主题承载后续渲染配色）
P2  图片增强（拖放/相对路径/缩放）
    Mermaid / 流程图  ─┐
                      ├─ 各自独立排期 + 独立 fixture，不可一起承诺
    KaTeX 真渲染      ─┘
P3  Wiki 重命名跟随（显式操作）─► 行号/列表类型转换 ─► 文章列表面板
```

每完成一项：`npm test` 全绿（当前基线 316 条）+ `npm run build` 通过 + 加一条真实 `.md` 往返 fixture，再走本地固定目录打包。

---

## 附：关键文件速查

| 关注点 | 文件 |
|---|---|
| 文档→HTML 渲染 | `src/shared/markdown.ts` |
| 专用 Markdown 节点（往返保真范式） | `src/shared/md-math.ts`、`md-wiki-link.ts`、`md-footnote-ref.ts` |
| 扩展统一创建 | `src/shared/md-extensions.ts` |
| Decoration 高亮范式（专注模式可复用） | `src/renderer/extensions/DocumentSearch.ts` |
| 文档内查找/状态同步 | `src/renderer/FindBar.tsx`、`src/renderer/App.tsx` |
| 工作区只读索引（文章列表/重命名复用） | `electron/workspace-index.ts`、`src/shared/workspace-links.ts` |
| 偏好持久化（主题/开关） | `src/shared/prefs.ts`、`electron/prefs-store.ts`（`IpcChannels` 中 `getSidebarWidth` 同通道模式） |
| 样式主题 | `src/renderer/styles.css`（当前仅浅色） |
| 构建验证 | `npm test` / `npm run build` / `npm run dist:local`（固定目录） |

---

## 附录 A：第一档实施报告（2026-11-22 完成）

### A.1 已落地内容

| 功能 | 实现 | 关键文件 |
|---|---|---|
| 字数统计 + 状态栏 | 纯函数统计（CJK 按字、西文按词、字符/行/阅读分钟），底部状态栏点击展开明细 | `src/shared/word-count.ts`、`src/renderer/StatusBar.tsx` |
| 专注模式 | ProseMirror `Decoration.node` 给非当前顶层块加 `is-dimmed`，CSS 降透明度；不改文档 | `src/renderer/extensions/WritingMode.ts` |
| 打字机模式 | `view.update` 监听选区变化，当前块 `scrollIntoView({ block:'center' })` | 同上 |
| 自动配对 | `handleTextInput` 配对 `()[]{}""''` 与选区包裹；右侧已有闭符号时跳过；**不配 Markdown 符号** | `src/renderer/extensions/AutoPair.ts` |
| 深色主题 | `:root[data-theme='dark']` 覆盖块（浅色零改动）+ GitHub-dark 代码配色；切换持久化；导出 HTML 沿用主题 | `src/renderer/styles.css`、`src/shared/export-html.ts` |
| 偏好持久化 | `AppPrefs` 加 `theme`/`focusMode`/`typewriterMode`；新增 `getPrefs`/`setPrefs` IPC | `src/shared/prefs.ts`、`src/shared/prefs-store.ts`、`electron/main.ts`、`electron/preload.ts` |

三个开关（专注/打字机/主题）放在状态栏右侧，切换立即写回 prefs。

### A.2 与原计划的关键偏差（实施中发现并修正）

1. **专注/打字机合为一个扩展**：原计划分开的两个 ProseMirror Plugin 合并进 `WritingMode`，共用一个 meta 驱动的状态（独立开关），减少插件数量和相互干扰。
2. **深色主题改为"覆盖块"而非抽 CSS 变量**：902 行样式里颜色是硬编码且同一色值多处复用（部分语义不一），全局抽变量风险高。改为浅色规则完全不动、末尾追加 `[data-theme='dark']` 覆盖块——浅色零回归，深色靠明确的组件级覆盖实现。可维护性略差，但交付风险最低。
3. **自动配对排除 Markdown 符号**：原计划只配括号/引号，实施中进一步确认 `*` `_` `` ` `` `$` 必须排除——它们与"焦点块显标记"机制冲突，且 Markdown 本身靠这些符号表达结构。

### A.3 验证

- `npm test`：**346 条测试全绿**（45 个测试文件，从基线 316 增至 346；新增 word-count 10、StatusBar 3、WritingMode 3、AutoPair 5、prefs/prefs-store 6、导出主题 2、App 端到端 1 等）。
- `npm run build` 通过。
- `npm run dist:local` 固定目录打包成功；asar 验证含 `autoPair` / `writingMode` / `is-dimmed` / `countWords` / `getPrefs` / `data-theme` 等全部新标记；单目录无新建。
- 产物：`Markdown Editor Setup 0.1.1.exe`（83M）、`Markdown Editor 0.1.1.exe`（82M），位于 `C:/Users/85054/Downloads/markdown-editor-local`。

### A.4 仍需注意（未做，留给后续档）

- WritingMode 的打字机滚动在 happy-dom 下无法真实验证视觉效果（DOM scrollIntoView 无实际滚动）；仅验证了状态切换与文档不变。真实手感需人工在应用内确认。
- 深色主题为覆盖式实现，若后续大幅改浅色样式结构，需同步检查覆盖块是否仍命中对应选择器。
- 第二档（图片增强 / Mermaid / KaTeX）与第三档（Wiki 重命名跟随 / 行号 / 文章列表）未开始。
