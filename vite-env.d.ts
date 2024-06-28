/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TOKEN: string
  readonly VITE_API_SERVER: string
  readonly VITE_READINGS_UI_SERVER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
