import type { Configuration } from 'react-native-mmkv'
import type { StateStorage } from 'zustand/middleware'
import { MMKV } from 'react-native-mmkv'

const createZustandMmkvStorage = (configuration?: Configuration): StateStorage => {
  const mmkvStorage = new MMKV(configuration)
  return {
    setItem: (name, value) => mmkvStorage.set(name, value),
    getItem: (name) => mmkvStorage.getString(name) ?? null,
    removeItem: (name) => mmkvStorage.delete(name),
  }
}

export { createZustandMmkvStorage }
