import { safeStorage } from 'electron'

// Linux without a keyring falls back to plain text; the dashboard shows a warning then.
export const insecureKeys = (): boolean =>
  process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text'

export function encrypt(key: string): string {
  return safeStorage.isEncryptionAvailable() ? `enc:${safeStorage.encryptString(key).toString('base64')}` : `raw:${key}`
}

export function decrypt(stored: string | undefined): string | null {
  if (!stored) return null
  if (stored.startsWith('raw:')) return stored.slice(4)
  try {
    return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'))
  } catch {
    return null
  }
}

export const mask = (key: string): string => (key.length > 10 ? `${key.slice(0, 3)}...${key.slice(-4)}` : '••••')
