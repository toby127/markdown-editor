/**
 * Shared UI strings for the Electron main-process menus and the renderer.
 *
 * Each value is a [zh, en] tuple. `t()` interpolates `{name}` placeholders.
 * Keeping this table in `shared/` makes menus and panels use exactly the same
 * wording, and lets both processes switch language from one source of truth.
 */

export type Language = 'system' | 'zh' | 'en'
export type ResolvedLanguage = 'zh' | 'en'

type Entry = readonly [string, string]

const DICT = {
  // Menus — chrome
  menuFile: ['文件', 'File'],
  menuEdit: ['编辑', 'Edit'],
  menuView: ['视图', 'View'],
  menuAppearance: ['外观', 'Appearance'],
  menuParagraph: ['段落', 'Paragraph'],
  menuFormat: ['格式', 'Format'],
  viewFiles: ['文件', 'Files'],
  viewOutline: ['大纲', 'Outline'],
  viewTags: ['标签', 'Tags'],
  viewBacklinks: ['反链', 'Backlinks'],
  appearanceFocus: ['专注模式', 'Focus Mode'],
  appearanceTypewriter: ['打字机模式', 'Typewriter Mode'],
  appearanceDarkTheme: ['深色主题', 'Dark Theme'],
  appearanceSpellcheck: ['拼写检查', 'Spell Check'],
  appearanceLanguage: ['语言', 'Language'],
  languageSystem: ['跟随系统', 'Follow System'],
  languageZh: ['简体中文', '简体中文 (Chinese)'],
  languageEn: ['English', 'English'],
  editUndo: ['撤销', 'Undo'],
  editRedo: ['重做', 'Redo'],
  editCut: ['剪切', 'Cut'],
  editCopy: ['复制', 'Copy'],
  editPaste: ['粘贴', 'Paste'],
  editSelectAll: ['全选', 'Select All'],
  editFind: ['查找', 'Find'],
  editFindReplace: ['查找并替换', 'Find and Replace'],

  // Menus — file
  fileNoRecents: ['无最近打开', 'No Recent Files'],
  fileClearRecents: ['清除最近打开', 'Clear Recent Files'],
  fileNew: ['新建', 'New'],
  fileNewFile: ['新建文件', 'New File'],
  fileNewFolder: ['新建文件夹', 'New Folder'],
  fileOpen: ['打开…', 'Open…'],
  fileOpenFolder: ['打开文件夹…', 'Open Folder…'],
  fileReload: ['从磁盘重新加载', 'Reload from Disk'],
  fileRecents: ['最近打开', 'Open Recent'],
  fileSave: ['保存', 'Save'],
  fileSaveAs: ['另存为…', 'Save As…'],
  fileExportHtml: ['导出为 HTML…', 'Export as HTML…'],
  fileExportPdf: ['导出为 PDF…', 'Export as PDF…'],

  // Menus — paragraph / format
  heading1: ['一级标题', 'Heading 1'],
  heading2: ['二级标题', 'Heading 2'],
  heading3: ['三级标题', 'Heading 3'],
  heading4: ['四级标题', 'Heading 4'],
  heading5: ['五级标题', 'Heading 5'],
  heading6: ['六级标题', 'Heading 6'],
  promoteHeading: ['提升标题级别', 'Promote Heading'],
  demoteHeading: ['降低标题级别', 'Demote Heading'],
  table: ['表格', 'Table'],
  codeBlock: ['代码块', 'Code Block'],
  mathBlock: ['公式块', 'Math Block'],
  blockquote: ['引用', 'Blockquote'],
  orderedList: ['有序列表', 'Ordered List'],
  bulletList: ['无序列表', 'Bullet List'],
  taskList: ['任务列表', 'Task List'],
  taskState: ['任务状态', 'Task State'],
  toggleTask: ['切换任务状态', 'Toggle Task State'],
  markDone: ['标记为已完成', 'Mark as Done'],
  markUndone: ['标记为未完成', 'Mark as Not Done'],
  listIndent: ['列表缩进', 'List Indent'],
  indent: ['增加缩进', 'Increase Indent'],
  outdent: ['减少缩进', 'Decrease Indent'],
  linkReference: ['链接引用', 'Link Reference'],
  footnote: ['脚注', 'Footnote'],
  horizontalRule: ['水平分割线', 'Horizontal Rule'],
  toc: ['内容目录', 'Table of Contents'],
  htmlBlock: ['HTML 内容', 'HTML Block'],
  deleteBlock: ['删除块', 'Delete Block'],
  bold: ['加粗', 'Bold'],
  italic: ['斜体', 'Italic'],
  underline: ['下划线', 'Underline'],
  code: ['代码', 'Code'],
  inlineMath: ['内联公式', 'Inline Math'],
  strike: ['删除线', 'Strikethrough'],
  highlight: ['高亮', 'Highlight'],
  superscript: ['上标', 'Superscript'],
  subscript: ['下标', 'Subscript'],
  comment: ['注释', 'Comment'],
  hyperlink: ['超链接', 'Hyperlink'],
  image: ['图像', 'Image'],
  clearFormat: ['清除样式', 'Clear Format'],

  // Prompts / dialogs
  promptImageUrl: ['图片 URL', 'Image URL'],
  promptImageDesc: ['图片描述（可选）', 'Image description (optional)'],
  promptLatex: ['LaTeX 公式', 'LaTeX formula'],
  promptLinkText: ['链接文字', 'Link text'],
  promptLinkUrl: ['链接 URL', 'Link URL'],
  promptFootnoteLabel: ['脚注编号', 'Footnote number'],
  promptFootnoteBody: ['脚注内容', 'Footnote text'],
  promptDocTitle: ['文档标题（YAML title）', 'Document title (YAML title)'],
  promptTags: ['标签（逗号分隔，可留空）', 'Tags (comma-separated, optional)'],
  promptHtmlContent: ['HTML 内容', 'HTML content'],
  promptInlineMath: ['LaTeX 行内公式', 'Inline LaTeX formula'],
  promptComment: ['注释内容', 'Comment text'],
  promptNewFile: ['新文件名', 'New file name'],
  promptNewFolder: ['新文件夹名', 'New folder name'],
  promptRename: ['重命名 {name}', 'Rename {name}'],
  confirmDelete: ['确定删除 {name}？', 'Delete {name}?'],
  confirmUnsaved: ['「{name}」有未保存的更改，是否保存？', '"{name}" has unsaved changes. Save it?'],
  dialogUnsavedTitle: ['未保存的更改', 'Unsaved Changes'],
  dialogSave: ['保存', 'Save'],
  dialogDontSave: ['不保存', "Don't Save"],
  dialogCancel: ['取消', 'Cancel'],

  // Renderer — app / sidebar / status
  untitled: ['未命名', 'Untitled'],
  newFile: ['新建文件', 'New File'],
  newFolder: ['新建文件夹', 'New Folder'],
  openFile: ['打开文件', 'Open File'],
  openFolder: ['打开文件夹', 'Open Folder'],
  resizeSidebar: ['调整侧边栏宽度', 'Resize sidebar'],
  sidebarAria: ['侧边栏', 'Sidebar'],
  panelSearch: ['搜索', 'Search'],
  focusModeTitle: ['专注模式：淡化其它段落', 'Focus mode: fade other blocks'],
  focusMode: ['专注', 'Focus'],
  typewriterTitle: ['打字机模式：当前行保持居中', 'Typewriter mode: keep the current line centered'],
  typewriter: ['打字机', 'Typewriter'],
  switchLightTheme: ['切换到浅色主题', 'Switch to light theme'],
  switchDarkTheme: ['切换到深色主题', 'Switch to dark theme'],
  wordCountTitle: ['字数统计', 'Word count'],
  wordCountSummary: ['{words} 字 · {lines} 行 · 约 {minutes} 分钟', '{words} words · {lines} lines · ~{minutes} min read'],
  detailWords: ['字数 {count}', 'Words {count}'],
  detailChars: ['字符（不含空白）{count}', 'Characters (no spaces) {count}'],
  detailLines: ['行数 {count}', 'Lines {count}'],
  detailReading: ['阅读约 {count} 分钟', '~{count} min read'],

  // Renderer — find bar
  findNoResults: ['无结果', 'No results'],
  findAria: ['文档内查找', 'Find in document'],
  findPlaceholder: ['查找…', 'Find…'],
  findInputAria: ['查找内容', 'Find text'],
  findPrev: ['上一个 (Shift+Enter)', 'Previous (Shift+Enter)'],
  findPrevAria: ['上一个匹配', 'Previous match'],
  findNext: ['下一个 (Enter)', 'Next (Enter)'],
  findNextAria: ['下一个匹配', 'Next match'],
  toggleReplace: ['切换替换栏', 'Toggle replace'],
  closeFind: ['关闭 (Esc)', 'Close (Esc)'],
  closeFindAria: ['关闭查找', 'Close find'],
  caseSensitive: ['区分大小写', 'Match case'],
  wholeWord: ['全词匹配', 'Whole word'],
  replacePlaceholder: ['替换为…', 'Replace with…'],
  replaceAria: ['替换为', 'Replace with'],
  replaceCurrent: ['替换当前 (Enter)', 'Replace current (Enter)'],
  replace: ['替换', 'Replace'],
  replaceAll: ['替换全部', 'Replace all'],
  replaceAllShort: ['全部', 'All'],

  // Renderer — search panel
  searchNoWorkspace: ['打开文件夹后可搜索工作区', 'Open a folder to search the workspace'],
  searchAria: ['搜索工作区', 'Search workspace'],
  searchPlaceholder: ['搜索标题和正文…', 'Search titles and content…'],
  rebuildIndex: ['重建索引', 'Rebuild index'],
  scanning: ['扫描中', 'Scanning'],
  refresh: ['刷新', 'Refresh'],
  searchHint: ['输入关键词搜索 {count} 个 Markdown 文件', 'Type to search {count} Markdown files'],
  searchNoResults: ['没有找到「{query}」', 'No results for "{query}"'],
  searchResults: ['{count} 个文件匹配', '{count} files matched'],

  // Renderer — file tree / context menu
  toggleFolder: ['折叠/展开 {name}', 'Collapse/expand {name}'],
  ctxSearchFiles: ['搜索文件', 'Search files'],
  ctxNewFile: ['新建文件', 'New File'],
  ctxNewFolder: ['新建文件夹', 'New Folder'],
  ctxReload: ['从磁盘重新加载', 'Reload from Disk'],
  ctxRename: ['重命名', 'Rename'],
  ctxDelete: ['删除', 'Delete'],
  noWorkspace: ['未打开工作区', 'No workspace open'],

  // Renderer — outline / tags / backlinks
  outlineEmpty: ['暂无大纲', 'No outline yet'],
  tagsNoWorkspace: ['打开文件夹后可查看标签索引', 'Open a folder to view the tag index'],
  tagsScanning: ['正在扫描标签…', 'Scanning tags…'],
  tagsEmpty: ['没有找到带 tags 的 Markdown 文件', 'No Markdown files with tags found'],
  tagsSummary: ['{tags} 个标签 · {files} 个文件', '{tags} tags · {files} files'],
  fileCount: ['{count} 个文件', '{count} files'],
  all: ['全部', 'All'],
  backlinksNoWorkspace: ['打开文件夹后可查看双向链接', 'Open a folder to view backlinks'],
  backlinksNoFile: ['打开一个文件后可查看双向链接', 'Open a file to view backlinks'],
  outlinks: ['出链', 'Outgoing Links'],
  outlinksEmpty: ['这个文件中没有 [[wiki link]]', 'No [[wiki link]] in this file'],
  backlinks: ['反向链接', 'Backlinks'],
  backlinksEmpty: ['还没有其他文件链接到这里', 'No other files link here yet'],
  closeTab: ['关闭 {name}', 'Close {name}'],
  editorPlaceholder: ['开始写作…', 'Start writing…'],

  // Errors
  errSave: ['保存失败：{msg}', 'Save failed: {msg}'],
  errOpen: ['打开失败：{msg}', 'Open failed: {msg}'],
  errOpenFolder: ['打开文件夹失败：{msg}', 'Open folder failed: {msg}'],
  errReadDir: ['读取目录失败：{msg}', 'Read directory failed: {msg}'],
  errRead: ['读取失败：{msg}', 'Read failed: {msg}'],
  errExists: ['已存在同名项', 'An item with the same name already exists'],
  errCreate: ['创建失败：{msg}', 'Create failed: {msg}'],
  errRename: ['重命名失败：{msg}', 'Rename failed: {msg}'],
  errDelete: ['删除失败：{msg}', 'Delete failed: {msg}'],
  errExportHtml: ['导出 HTML 失败：{msg}', 'Export HTML failed: {msg}'],
  errExportPdf: ['导出 PDF 失败：{msg}', 'Export PDF failed: {msg}'],
  errScanWorkspace: ['扫描工作区失败：{msg}', 'Workspace scan failed: {msg}'],
  errScanTags: ['扫描标签失败：{msg}', 'Tag scan failed: {msg}'],
  errIndex: ['扫描工作区失败', 'Failed to scan workspace'],
  errLinkTarget: ['未找到链接目标：{target}', 'Link target not found: {target}'],
  errMarkdownOnly: ['仅支持 Markdown 文件', 'Only Markdown files are supported']
} satisfies Record<string, Entry>

export type TranslationKey = keyof typeof DICT

export function resolveLanguage(pref: Language | undefined, systemLanguage: string): ResolvedLanguage {
  if (pref === 'zh' || pref === 'en') return pref
  return systemLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function t(key: TranslationKey, lang: ResolvedLanguage, params?: Record<string, string | number>): string {
  const entry: Entry = DICT[key]
  let text: string = entry[lang === 'zh' ? 0 : 1]
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    )
  }
  return text
}
