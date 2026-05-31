import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// dist/config.js -> project root is one level up from dist
const projectRoot = resolve(__dirname, '..')

export type ProviderName = 'mock' | 'ollama' | 'openai'

export interface Config {
  port: number
  provider: ProviderName
  monthlyUsdCap: number
  schedulerEnabled: boolean
  defaultCron: string
  dataFile: string
  workspaceDir: string
  ollama: { baseUrl: string; model: string }
  openai: {
    baseUrl: string
    apiKey?: string
    model: string
    inputUsdPerMTok: number
    outputUsdPerMTok: number
  }
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback
  return value.toLowerCase() === 'true' || value === '1'
}

const provider = (process.env.LLM_PROVIDER as ProviderName) || 'mock'
if (!['mock', 'ollama', 'openai'].includes(provider)) {
  throw new Error(
    `Invalid LLM_PROVIDER "${provider}". Use mock | ollama | openai.`,
  )
}

export const config: Config = Object.freeze({
  port: num(process.env.PORT, 3000),
  provider,
  monthlyUsdCap: num(process.env.MONTHLY_USD_CAP, 0),
  schedulerEnabled: bool(process.env.SCHEDULER_ENABLED, true),
  defaultCron: process.env.DEFAULT_CRON || '0 3 * * *',
  dataFile: resolve(projectRoot, 'data', 'db.json'),
  workspaceDir: resolve(projectRoot, 'workspace'),
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
  },
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || undefined,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    inputUsdPerMTok: num(process.env.OPENAI_INPUT_USD_PER_MTOK, 0.15),
    outputUsdPerMTok: num(process.env.OPENAI_OUTPUT_USD_PER_MTOK, 0.6),
  },
})
