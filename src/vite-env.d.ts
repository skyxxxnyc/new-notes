/// <reference types="vite/client" />

interface Window {
  appPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
  appConfirm: (message: string) => Promise<boolean>;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
