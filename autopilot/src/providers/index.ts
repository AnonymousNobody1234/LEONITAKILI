import { config, type ProviderName } from '../config.js'
import type { LlmProvider } from './types.js'
import { mockProvider } from './mock.js'
import { ollamaProvider } from './ollama.js'
import { openaiProvider } from './openai.js'

export function getProvider(name: ProviderName = config.provider): LlmProvider {
  switch (name) {
    case 'mock':
      return mockProvider
    case 'ollama':
      return ollamaProvider
    case 'openai':
      return openaiProvider
    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}

export type { LlmProvider, LlmResult } from './types.js'
