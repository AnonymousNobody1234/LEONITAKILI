import { config } from '../config.js'
import { checkBudget, recordRefusal, recordSpend } from '../spend.js'
import type { GenerateOptions, LlmProvider, LlmResult } from './types.js'
import { estimateTokens } from './types.js'

/**
 * The ONLY paid path. Every call passes through the budget guard first and
 * is refused (never sent) if it would exceed the monthly cap.
 */
export const openaiProvider: LlmProvider = {
  name: 'openai',
  isPaid: true,
  async generate(prompt: string, opts?: GenerateOptions): Promise<LlmResult> {
    if (!config.openai.apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Either set it, or use LLM_PROVIDER=mock / ollama (both $0).',
      )
    }

    const maxTokens = opts?.maxTokens ?? 1000

    // Conservative upfront estimate: full input + max possible output.
    const inputTokens = estimateTokens((opts?.system ?? '') + prompt)
    const estimatedUsd =
      (inputTokens / 1_000_000) * config.openai.inputUsdPerMTok +
      (maxTokens / 1_000_000) * config.openai.outputUsdPerMTok

    const gate = checkBudget(estimatedUsd)
    if (!gate.ok) {
      await recordRefusal()
      return {
        text: '',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        provider: 'openai',
        refused: true,
        refusalReason: gate.reason,
      }
    }

    const messages = [
      ...(opts?.system
        ? [{ role: 'system', content: opts.system }]
        : []),
      { role: 'user', content: prompt },
    ]

    const res = await fetch(`${config.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages,
        max_tokens: maxTokens,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`OpenAI returned ${res.status}: ${body.slice(0, 300)}`)
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }

    const text = data.choices?.[0]?.message?.content ?? ''
    const promptTokens =
      data.usage?.prompt_tokens ?? estimateTokens(prompt)
    const completionTokens =
      data.usage?.completion_tokens ?? estimateTokens(text)

    const costUsd =
      (promptTokens / 1_000_000) * config.openai.inputUsdPerMTok +
      (completionTokens / 1_000_000) * config.openai.outputUsdPerMTok

    await recordSpend(costUsd)

    return {
      text,
      promptTokens,
      completionTokens,
      costUsd,
      provider: 'openai',
    }
  },
}
