import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * On the phone AsyncStorage always works. On the web it is localStorage, which
 * a sandboxed host (an embedded artifact viewer, Safari private mode) can
 * refuse — and a refusal must not take the app down. Probe once, fall back to
 * memory, and let the UI say so, because in that mode nothing survives a
 * reload.
 */

let memoryOnly = false;
const memory = new Map<string, string>();

function probe(): boolean {
  if (Platform.OS !== 'web') return true;
  try {
    const key = '__hk_probe__';
    window.localStorage.setItem(key, '1');
    const ok = window.localStorage.getItem(key) === '1';
    window.localStorage.removeItem(key);
    return ok;
  } catch {
    return false;
  }
}

memoryOnly = !probe();

/** False when writes are lost on reload, so the UI can warn about it. */
export const persistenceAvailable = !memoryOnly;

export const storage = {
  async getItem(name: string): Promise<string | null> {
    if (memoryOnly) return memory.get(name) ?? null;
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  async setItem(name: string, value: string): Promise<void> {
    if (memoryOnly) {
      memory.set(name, value);
      return;
    }
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Quota or a host that revoked access mid-session: keep the app usable.
      memoryOnly = true;
      memory.set(name, value);
    }
  },
  async removeItem(name: string): Promise<void> {
    memory.delete(name);
    if (memoryOnly) return;
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      /* nothing to undo */
    }
  },
};
