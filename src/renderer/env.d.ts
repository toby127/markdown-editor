/// <reference types="vite/client" />

import type { MarkdownEditorApi } from '../shared/ipc'

declare global {
  interface Window {
    api: MarkdownEditorApi
  }
}

export {}
