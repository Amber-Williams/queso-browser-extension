import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from '../package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

const { version } = packageJson

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch] = version.replace(/[^\d.-]/g, '').split(/[.-]/)

export default defineManifest(async (env) => ({
  manifest_version: 3,
  name: `${packageJson.displayName || packageJson.name}${isDev ? ` ➡️ Dev` : ''}`,
  version: `${major}.${minor}.${patch}`,
  description: packageJson.description,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-32.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  action: {
    default_icon: 'img/logo-48.png',
    default_popup: 'popup.html',
  },
  side_panel: {
    default_path: 'sidepanel.html',
  },
  options_page: 'options.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  chrome_url_overrides: {
    bookmarks: 'bookmarks.html',
  },
  content_scripts: [
    {
      matches: ['https://*/*'],
      js: ['src/contentScript/index.ts'],
    },
  ],
  permissions: ['activeTab', 'storage', 'sidePanel', 'contextMenus'],
}))
