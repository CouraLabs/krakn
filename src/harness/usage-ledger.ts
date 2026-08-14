import type { Usage } from "@earendil-works/pi-ai"
import type { UsageDeltaEvent, UsageTotals, UsageUpdateEvent } from "./harness-types"
import { estimateTokenCount } from "tokenx"

/**
 * Cumulative token/cost ledger. Streamed deltas add a live `out` estimate; the real
 * usage block reported at `message_end` replaces that estimate. Every change returns
 * a snapshot suitable for the `usage_update` event.
 */
export class UsageLedger {
  private usage: { tokens: UsageTotals, cost: UsageTotals } = {
    tokens: { in: 0, out: 0, cr: 0, cw: 0, total: 0 },
    cost: { in: 0, out: 0, cr: 0, cw: 0, total: 0 },
  }
  /** Estimated output tokens streamed so far for the in-flight assistant message (not yet committed). */
  private pendingOutput = 0

  /** Increment the live output estimate from a streamed delta, or no-op for non-delta events. */
  trackDelta(ev: UsageDeltaEvent): UsageUpdateEvent | undefined {
    this.pendingOutput += estimateTokenCount(ev.delta)
    return this.snapshot()
  }

  /** Commit the real usage reported at `message_end`, replacing the live delta estimate. */
  commit(usage: Usage): UsageUpdateEvent {
    const tokens = this.usage.tokens
    tokens.in += usage.input
    tokens.out += usage.output
    tokens.cr += usage.cacheRead
    tokens.cw += usage.cacheWrite
    tokens.total += usage.totalTokens

    const cost = this.usage.cost
    cost.in += usage.cost.input
    cost.out += usage.cost.output
    cost.cr += usage.cost.cacheRead
    cost.cw += usage.cost.cacheWrite
    cost.total += usage.cost.total

    this.pendingOutput = 0
    return this.snapshot()
  }

  /** Current cumulative counters; the live estimate is overlaid on `out`/`total`. */
  snapshot(): UsageUpdateEvent {
    const { tokens, cost } = this.usage
    return {
      type: 'usage_update',
      tokens: { ...tokens, out: tokens.out + this.pendingOutput, total: tokens.total + this.pendingOutput },
      cost: { ...cost },
    }
  }
}