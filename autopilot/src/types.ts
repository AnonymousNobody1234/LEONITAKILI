export type TaskType = 'research' | 'content' | 'coding' | 'general'
export type RunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'refused'

export interface Task {
  id: string
  name: string
  type: TaskType
  prompt: string
  sources?: string[]
  cron?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastRunAt?: string
}

export interface Run {
  id: string
  taskId: string
  taskName: string
  type: TaskType
  status: RunStatus
  trigger: 'cron' | 'manual'
  startedAt: string
  finishedAt?: string
  output?: string
  filesWritten?: string[]
  error?: string
  provider: string
  promptTokens: number
  completionTokens: number
  costUsd: number
}

export interface MonthSpend {
  month: string // 'YYYY-MM'
  totalUsd: number
  paidCalls: number
  refusedCalls: number
}

export interface DbShape {
  tasks: Task[]
  runs: Run[] // newest-first, capped
  spend: Record<string, MonthSpend>
}
