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

// ── Companies: multi-step autonomous builds ──────────────
export type CompanyStatus =
  | 'idle'
  | 'investigating'
  | 'building'
  | 'live'
  | 'error'

export type PhaseStatus = 'pending' | 'running' | 'done' | 'error'

export interface Phase {
  name: string
  label: string
  status: PhaseStatus
  note?: string
  startedAt?: string
  finishedAt?: string
}

export interface Company {
  id: string
  name: string
  description: string
  audience?: string
  status: CompanyStatus
  statusDetail?: string
  phases: Phase[]
  createdAt: string
  updatedAt: string
}

export type ArtifactType = 'document' | 'website' | 'email' | 'social'

export interface Artifact {
  id: string
  companyId: string
  type: ArtifactType
  title: string
  content: string // text/markdown for docs/email/social; full HTML for website
  url?: string // website: live path like /sites/<id>
  to?: string // email: recipient
  status: 'draft' | 'published' | 'sent'
  createdAt: string
}

export interface LogEvent {
  id: string
  companyId: string
  text: string
  at: string
}

export interface DbShape {
  tasks: Task[]
  runs: Run[] // newest-first, capped
  spend: Record<string, MonthSpend>
  companies: Company[]
  artifacts: Artifact[] // newest-first
  logs: LogEvent[] // newest-first, capped
}
