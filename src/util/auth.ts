import * as storage from './storage'

export const getAuthTokens = async () => {
  if (import.meta.env.VITE_READINGS_API_TOKEN) {
    storage.saveKey('readingsApiToken', import.meta.env.VITE_READINGS_API_TOKEN)
  }

  if (import.meta.env.VITE_READINGS_API_SERVER) {
    storage.saveKey('readingsApi', import.meta.env.VITE_READINGS_API_SERVER)
  }

  if (import.meta.env.VITE_READINGS_UI_SERVER) {
    storage.saveKey('readingsUi', import.meta.env.VITE_READINGS_UI_SERVER)
  }
}
