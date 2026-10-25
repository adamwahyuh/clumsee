import { contextBridge, ipcRenderer } from 'electron'
import type { AnswerView, HistoryItem, OcrLine, OverlayInit, Provider, Rect, Settings, SettingsView, TestResult, UsageSummary } from '../shared'

const on = <T>(channel: string, cb: (value: T) => void): (() => void) => {
  const listener = (_: unknown, value: T): void => cb(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  // overlay
  initOverlay: (): Promise<OverlayInit | null> => ipcRenderer.invoke('overlay:init'),
  send: (rect: Rect, prompt: string, smart: boolean): void => ipcRenderer.send('overlay:send', rect, prompt, smart),
  cancel: (): void => ipcRenderer.send('overlay:cancel'),
  readText: (rect: Rect): Promise<{ lines: OcrLine[] } | { error: string }> => ipcRenderer.invoke('overlay:ocr', rect),
  // panel
  getAnswer: (): Promise<AnswerView> => ipcRenderer.invoke('answer:get'),
  onAnswer: (cb: (a: AnswerView) => void) => on('answer', cb),
  followUp: (text: string): void => ipcRenderer.send('answer:followup', text),
  retry: (smart: boolean): void => ipcRenderer.send('answer:retry', smart),
  // dashboard
  onNavigate: (cb: (tab: string) => void) => on('navigate', cb),
  getSettings: (): Promise<SettingsView> => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch: Partial<Settings>): Promise<SettingsView | { error: string }> => ipcRenderer.invoke('settings:save', patch),
  testKey: (provider: Provider, key?: string): Promise<TestResult> => ipcRenderer.invoke('key:test', provider, key),
  listHistory: (query: string): Promise<HistoryItem[]> => ipcRenderer.invoke('history:list', query),
  deleteHistory: (id: number): Promise<void> => ipcRenderer.invoke('history:delete', id),
  clearHistory: (): Promise<void> => ipcRenderer.invoke('history:clear'),
  getUsage: (): Promise<UsageSummary> => ipcRenderer.invoke('usage:get'),
  permissionStatus: (): Promise<string> => ipcRenderer.invoke('permission:status'),
  requestPermission: (): Promise<void> => ipcRenderer.invoke('permission:request'),
  relaunch: (): void => ipcRenderer.send('app:relaunch')
}

export type Api = typeof api
contextBridge.exposeInMainWorld('api', api)
