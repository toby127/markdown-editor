# Markdown Editor

**English** | [中文](README.zh-CN.md)

A desktop Markdown editor built with Electron, React, and TipTap. It uses Typora-like hybrid editing: the document stays formatted, and Markdown markers appear only on the block you are editing.

## Screenshots

![Editing view with file tree and centered reading column](docs/screenshots/editing.png)

*Editing view with file tree and centered reading column*

![Welcome screen when no file is open](docs/screenshots/welcome.png)

*Welcome screen when no file is open*

## Features

- **Hybrid editing** — markers show on the focused block, and formatting applies as you type
- **Files and navigation** — file tree, tabs, outline, and recent files and folders
- **Paragraph and Format menus** — laid out to match Typora
- **Resizable sidebar** — drag to resize; window size and sidebar width are remembered
- **Centered reading column** — on wide windows the text stays in a centered column

## Develop

```bash
npm install
npm run dev
npm test
```

`npm run dev` starts the Electron app. `npm test` runs the Vitest suite once.

## Windows build

```bash
npm run dist
```

The command builds the app, then packages a Windows x64 installer and a portable executable. Artifacts land under `release/`.

## License

[MIT](LICENSE)
