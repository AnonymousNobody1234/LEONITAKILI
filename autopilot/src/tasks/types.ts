import type { LlmProvider, LlmResult } from '../providers/index.js'
import type { Task } from '../types.js'

export interface TaskResult {
  output: string
  filesWritten?: string[]
  llm: LlmResult
}

export type TaskHandler = (
  task: Task,
  provider: LlmProvider,
) => Promise<TaskResult>
