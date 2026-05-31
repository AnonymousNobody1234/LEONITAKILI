import { config } from './config.js'
import { getMonthSpend, setMonthSpend } from './store.js'

export function currentMonth(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export interface BudgetCheck {
  ok: boolean
  reason?: string
  spent: number
  cap: number
}

/**
 * Called BEFORE any paid LLM call. If committing `estimatedUsd` would push
 * this month's spend over the cap, returns ok:false and the caller MUST
 * refuse rather than spend. mock/ollama pass estimatedUsd=0 and always pass.
 */
export function checkBudget(estimatedUsd: number): BudgetCheck {
  const month = currentMonth()
  const spent = getMonthSpend(month).totalUsd
  const cap = config.monthlyUsdCap
  if (estimatedUsd <= 0) return { ok: true, spent, cap }
  if (spent + estimatedUsd > cap) {
    return {
      ok: false,
      reason: `Budget guard: this call (~$${estimatedUsd.toFixed(
        4,
      )}) would exceed the monthly cap of $${cap.toFixed(
        2,
      )} (already spent $${spent.toFixed(4)}). Refused to protect your wallet.`,
      spent,
      cap,
    }
  }
  return { ok: true, spent, cap }
}

export async function recordSpend(actualUsd: number): Promise<void> {
  const month = currentMonth()
  const s = getMonthSpend(month)
  await setMonthSpend(month, {
    ...s,
    totalUsd: s.totalUsd + actualUsd,
    paidCalls: s.paidCalls + 1,
  })
}

export async function recordRefusal(): Promise<void> {
  const month = currentMonth()
  const s = getMonthSpend(month)
  await setMonthSpend(month, { ...s, refusedCalls: s.refusedCalls + 1 })
}

export interface SpendSummary {
  month: string
  spent: number
  cap: number
  remaining: number
  paidCalls: number
  refusedCalls: number
}

export function thisMonthSummary(): SpendSummary {
  const month = currentMonth()
  const s = getMonthSpend(month)
  return {
    month,
    spent: s.totalUsd,
    cap: config.monthlyUsdCap,
    remaining: Math.max(0, config.monthlyUsdCap - s.totalUsd),
    paidCalls: s.paidCalls,
    refusedCalls: s.refusedCalls,
  }
}
