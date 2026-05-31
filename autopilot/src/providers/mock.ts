import type { GenerateOptions, LlmProvider, LlmResult } from './types.js'
import { estimateTokens } from './types.js'

/**
 * Zero-cost, instant provider. Returns deterministic canned text so you can
 * see the whole system work end-to-end without any API or local model.
 */
export const mockProvider: LlmProvider = {
  name: 'mock',
  isPaid: false,
  async generate(prompt: string, opts?: GenerateOptions): Promise<LlmResult> {
    const head = prompt.trim().slice(0, 280)
    const text = [
      '[mock output — set LLM_PROVIDER=ollama for a real free model]',
      '',
      opts?.system ? `Role: ${opts.system}` : null,
      '',
      'Here is a generated response based on your instructions:',
      '',
      head + (prompt.length > 280 ? ' …' : ''),
      '',
      '• Point one derived from the task.',
      '• Point two with a concrete next step.',
      '• Point three summarizing the outcome.',
    ]
      .filter((l) => l !== null)
      .join('\n')

    return {
      text,
      promptTokens: estimateTokens(prompt),
      completionTokens: estimateTokens(text),
      costUsd: 0,
      provider: 'mock',
    }
  },
}
