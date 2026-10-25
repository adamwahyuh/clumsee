import type { Turn } from '../shared'

/**
 * Keeps the first exchange (it carries the image) and the latest turns, so long
 * follow-up chats don't resend everything. Turns alternate user/assistant and end with user.
 */
export function trimTurns(turns: Turn[], keepLast = 5): Turn[] {
  // Always a copy: the caller appends the pending reply to the original right after.
  if (turns.length <= keepLast + 2) return [...turns]
  return [...turns.slice(0, 2), ...turns.slice(-keepLast)]
}
