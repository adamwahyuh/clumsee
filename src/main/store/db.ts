import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import type { HistoryItem, Turn, UsageSummary, UsageTotals } from '../../shared'

let db: DatabaseSync | null = null

function open(): DatabaseSync {
  if (db) return db
  db = new DatabaseSync(join(app.getPath('userData'), 'history.db'))
  db.exec(`
    create table if not exists history (
      id integer primary key, created_at integer not null, provider text not null, model text not null,
      turns text not null, search text not null, thumb text
    );
    create table if not exists usage (
      id integer primary key, created_at integer not null, provider text not null, model text not null,
      input integer not null, output integer not null, cost real
    );
  `)
  return db
}

const searchText = (turns: Turn[]): string => turns.map((t) => t.text).join('\n').toLowerCase()

export function insertHistory(provider: string, model: string, turns: Turn[], thumb: string | null): number {
  const r = open()
    .prepare('insert into history (created_at, provider, model, turns, search, thumb) values (?, ?, ?, ?, ?, ?)')
    .run(Date.now(), provider, model, JSON.stringify(turns), searchText(turns), thumb)
  return Number(r.lastInsertRowid)
}

export function updateHistory(id: number, model: string, turns: Turn[]): void {
  open().prepare('update history set model = ?, turns = ?, search = ? where id = ?').run(model, JSON.stringify(turns), searchText(turns), id)
}

export function listHistory(query: string): HistoryItem[] {
  const like = `%${query.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const rows = open()
    .prepare("select * from history where search like ? escape '\\' order by created_at desc limit 200")
    .all(like) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number,
    createdAt: r.created_at as number,
    provider: r.provider as string,
    model: r.model as string,
    turns: JSON.parse(r.turns as string),
    thumb: (r.thumb as string | null) ?? null
  }))
}

export const deleteHistory = (id: number): void => void open().prepare('delete from history where id = ?').run(id)
export const clearHistory = (): void => open().exec('delete from history')

// Usage lives in its own table so deleting history doesn't reset the daily limit or cost totals.
export function addUsage(provider: string, model: string, input: number, output: number, cost: number | null): void {
  open().prepare('insert into usage (created_at, provider, model, input, output, cost) values (?, ?, ?, ?, ?, ?)').run(Date.now(), provider, model, input, output, cost)
}

function totalsSince(ts: number): UsageTotals {
  const r = open()
    .prepare(`select count(*) requests, coalesce(sum(input + output), 0) tokens, coalesce(sum(cost), 0) cost,
              coalesce(sum(cost is null), 0) unpriced from usage where created_at >= ?`)
    .get(ts) as UsageTotals
  return { requests: Number(r.requests), tokens: Number(r.tokens), cost: Number(r.cost), unpriced: Number(r.unpriced) }
}

export function usageSummary(): UsageSummary {
  const now = new Date()
  return {
    today: totalsSince(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()),
    month: totalsSince(new Date(now.getFullYear(), now.getMonth(), 1).getTime())
  }
}
