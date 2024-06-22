type StorageArea = chrome.storage.StorageArea
const storage: StorageArea = chrome.storage.local

/**
 * Save a value to Chrome storage
 * @param key - The key to store the value under
 * @param value - The value to store
 * @returns A promise that resolves when the value is saved
 */
const saveKey = <T>(key: string, value: T): Promise<void> => {
  return new Promise((resolve, reject) => {
    storage.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Retrieve a value from Chrome storage
 * @param key - The key of the value to retrieve
 * @returns A promise that resolves with the retrieved value
 */
const getKey = <T>(key: string): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    storage.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result[key] as T | undefined)
      }
    })
  })
}

/**
 * Remove a value from Chrome storage
 * @param key - The key of the value to remove
 * @returns A promise that resolves when the value is removed
 */
const removeKey = (key: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    storage.remove([key], () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Clear all values from Chrome storage
 * @returns A promise that resolves when all values are cleared
 */
const clearAll = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    storage.clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

export { clearAll, getKey, removeKey, saveKey }
