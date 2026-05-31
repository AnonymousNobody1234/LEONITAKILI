import { config } from '../config.js'
import type { GenerateOptions, LlmProvider, LlmResult } from './types.js'
import { estimateTokens } from './types.js'

/**
 * Free local model via Ollama. Costs $0 per task. Requires `ollama serve`
 * running and the model pulled (e.g. `ollama pull llama3.2`).
 */
export const ollamaProvider: LlmProvider = {
  name: 'ollama',
  isPaid: false,
  async generate(prompt: string, opts?: GenerateOptions): Promise<LlmResult> {
    const fullPrompt = opts?.system
      ? `${opts.system}\n\n${prompt}`
      : prompt

    let res: Response
    try {
      res = await fetch(`${config.ollama.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ollama.model,
          prompt: fullPrompt,
          stream: false,
        }),
      })
    } catch (err) {
      throw new Error(
        `Could not reach Ollama at ${config.ollama.baseUrl}. Is it running? ` +
          `Start it with "ollama serve" and pull a model with ` +
          `"ollama pull ${config.ollama.model}". (${(err as Error).message})`,
      )
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Ollama returned ${res.status}: ${body.slice(0, 300)}`)
    }

    const data = (await res.json()) as {
      response?: string
      prompt_eval_count?: number
      eval_count?: number
    }
    const text = data.response ?? ''

    return {
      text,
      promptTokens: data.prompt_eval_count ?? estimateTokens(fullPrompt),
      completionTokens: data.eval_count ?? estimateTokens(text),
      costUsd: 0,
      provider: 'ollama',
    }
  },
}
