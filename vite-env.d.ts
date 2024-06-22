/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly API_TOKEN: string
  readonly API_SERVER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
