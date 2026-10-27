# Markdown Editor

[English](README.md) | **中文**

基于 Electron、React 和 TipTap 的桌面 Markdown 编辑器。编辑方式接近 Typora：正文以排好版的样子呈现，只有正在编辑的段落会露出 Markdown 标记。

## 截图

![带文件树和居中阅读栏的编辑视图](docs/screenshots/editing.png)

*带文件树和居中阅读栏的编辑视图*

![未打开文件时的欢迎界面](docs/screenshots/welcome.png)

*未打开文件时的欢迎界面*

## 功能

- **混合编辑** — 焦点所在的块显示标记，格式随输入即时生效
- **文件与导航** — 文件树、标签页、大纲，以及最近打开的文件和文件夹
- **段落与格式菜单** — 菜单布局对齐 Typora
- **可调侧边栏** — 可拖动调整宽度；窗口大小和侧边栏宽度会被记住
- **居中阅读栏** — 窗口较宽时，正文保持在中间一栏

## 开发

```bash
npm install
npm run dev
npm test
```

`npm run dev` 会启动 Electron 开发窗口。`npm test` 用 Vitest 跑一遍测试。

## Windows 构建

```bash
npm run dist
```

这条命令会先完成构建，再打出 Windows x64 安装包和便携版。产物都在 `release/` 目录下。

## 许可证

[MIT](LICENSE)
