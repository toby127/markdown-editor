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

## Download

Prebuilt binaries are on the [Releases](https://github.com/toby127/markdown-editor/releases) page (currently [v0.1.0](https://github.com/toby127/markdown-editor/releases/tag/v0.1.0)):

- **Windows** — installer (`Markdown.Editor.Setup.*.exe`) and portable (`.exe`)
- **macOS** — DMG and ZIP for Intel (`x64`) and Apple Silicon (`arm64`)

macOS builds are unsigned. On first launch, if macOS blocks the app, right-click it → **Open**, then confirm. After that, a normal double-click works.

## Windows build

```bash
npm run dist
```

The command builds the app, then packages a Windows x64 installer and a portable executable. Artifacts land under `release/`.

## macOS build

```bash
npm run dist:mac
```

Requires macOS (or CI on `macos-latest`). Produces unsigned DMG and ZIP artifacts under `release/`. The GitHub Actions workflow `.github/workflows/release-mac.yml` builds these and attaches them to the release (default tag `v0.1.0` on manual dispatch; version tags `v*` on push).

## License

[MIT](LICENSE)
