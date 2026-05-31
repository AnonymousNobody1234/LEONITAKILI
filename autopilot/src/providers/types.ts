export interface LlmResult {
  text: string
  promptTokens: number
  completionTokens: number
  costUsd: number
  provider: string
  refused?: boolean
  refusalReason?: string
}

export interface GenerateOptions {
  system?: string
  maxTokens?: number
}

export interface LlmProvider {
  name: string
  isPaid: boolean
  generate(prompt: string, opts?: GenerateOptions): Promise<LlmResult>
}

/** Rough token estimate (~4 chars per token) for budgeting and mock metering. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}
