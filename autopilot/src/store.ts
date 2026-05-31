import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import type {
  Artifact,
  Company,
  DbShape,
  LogEvent,
  MonthSpend,
  Run,
  Task,
} from './types.js'

const MAX_RUNS = 500
const MAX_LOGS = 300

let db: DbShape = {
  tasks: [],
  runs: [],
  spend: {},
  companies: [],
  artifacts: [],
  logs: [],
}
let dbFile = ''

// Serialize all writes through a promise chain so concurrent run
// completions can't clobber the file.
let writeQueue: Promise<void> = Promise.resolve()

function emptyDb(): DbShape {
  return {
    tasks: [],
    runs: [],
    spend: {},
    companies: [],
    artifacts: [],
    logs: [],
  }
}

async function flush(): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const tmp = dbFile + '.tmp'
    await writeFile(tmp, JSON.stringify(db, null, 2), 'utf8')
    await rename(tmp, dbFile)
  })
  return writeQueue
}

export async function initStore(file: string): Promise<void> {
  dbFile = file
  await mkdir(dirname(file), { recursive: true })
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as Partial<DbShape>
    db = {
      tasks: parsed.tasks ?? [],
      runs: parsed.runs ?? [],
      spend: parsed.spend ?? {},
      companies: parsed.companies ?? [],
      artifacts: parsed.artifacts ?? [],
      logs: parsed.logs ?? [],
    }
  } catch {
    db = emptyDb()
    await flush()
  }
}

// ── Tasks ────────────────────────────────────────────────
export function listTasks(): Task[] {
  return db.tasks
}

export function getTask(id: string): Task | undefined {
  return db.tasks.find((t) => t.id === id)
}

export async function createTask(input: {
  name: string
  type: Task['type']
  prompt: string
  sources?: string[]
  cron?: string
  enabled?: boolean
}): Promise<Task> {
  const now = new Date().toISOString()
  const task: Task = {
    id: crypto.randomUUID(),
    name: input.name,
    type: input.type,
    prompt: input.prompt,
    sources: input.sources,
    cron: input.cron,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  }
  db.tasks.push(task)
  await flush()
  return task
}

export async function updateTask(
  id: string,
  patch: Partial<Task>,
): Promise<Task | undefined> {
  const task = getTask(id)
  if (!task) return undefined
  Object.assign(task, patch, { updatedAt: new Date().toISOString() })
  await flush()
  return task
}

export async function deleteTask(id: string): Promise<boolean> {
  const before = db.tasks.length
  db.tasks = db.tasks.filter((t) => t.id !== id)
  const changed = db.tasks.length !== before
  if (changed) await flush()
  return changed
}

// ── Runs ─────────────────────────────────────────────────
export function listRuns(opts: { taskId?: string; limit?: number } = {}): Run[] {
  let runs = db.runs
  if (opts.taskId) runs = runs.filter((r) => r.taskId === opts.taskId)
  if (opts.limit) runs = runs.slice(0, opts.limit)
  return runs
}

export async function addRun(run: Run): Promise<void> {
  db.runs.unshift(run)
  if (db.runs.length > MAX_RUNS) db.runs.length = MAX_RUNS
  await flush()
}

export async function updateRun(
  id: string,
  patch: Partial<Run>,
): Promise<void> {
  const run = db.runs.find((r) => r.id === id)
  if (!run) return
  Object.assign(run, patch)
  await flush()
}

// ── Spend ────────────────────────────────────────────────
export function getMonthSpend(month: string): MonthSpend {
  return (
    db.spend[month] ?? {
      month,
      totalUsd: 0,
      paidCalls: 0,
      refusedCalls: 0,
    }
  )
}

export async function setMonthSpend(
  month: string,
  s: MonthSpend,
): Promise<void> {
  db.spend[month] = s
  await flush()
}

// ── Companies ────────────────────────────────────────────
export function listCompanies(): Company[] {
  return db.companies
}

export function getCompany(id: string): Company | undefined {
  return db.companies.find((c) => c.id === id)
}

export async function addCompany(company: Company): Promise<void> {
  db.companies.unshift(company)
  await flush()
}

export async function updateCompany(
  id: string,
  patch: Partial<Company>,
): Promise<Company | undefined> {
  const c = getCompany(id)
  if (!c) return undefined
  Object.assign(c, patch, { updatedAt: new Date().toISOString() })
  await flush()
  return c
}

export async function deleteCompany(id: string): Promise<boolean> {
  const before = db.companies.length
  db.companies = db.companies.filter((c) => c.id !== id)
  db.artifacts = db.artifacts.filter((a) => a.companyId !== id)
  db.logs = db.logs.filter((l) => l.companyId !== id)
  const changed = db.companies.length !== before
  if (changed) await flush()
  return changed
}

// ── Artifacts ────────────────────────────────────────────
export function listArtifacts(companyId?: string): Artifact[] {
  return companyId
    ? db.artifacts.filter((a) => a.companyId === companyId)
    : db.artifacts
}

export function getArtifact(id: string): Artifact | undefined {
  return db.artifacts.find((a) => a.id === id)
}

export async function addArtifact(artifact: Artifact): Promise<void> {
  db.artifacts.unshift(artifact)
  await flush()
}

export async function updateArtifact(
  id: string,
  patch: Partial<Artifact>,
): Promise<void> {
  const a = getArtifact(id)
  if (!a) return
  Object.assign(a, patch)
  await flush()
}

// ── Logs (the live terminal feed) ────────────────────────
export function listLogs(limit = 60): LogEvent[] {
  return db.logs.slice(0, limit)
}

export async function addLog(companyId: string, text: string): Promise<void> {
  db.logs.unshift({
    id: crypto.randomUUID(),
    companyId,
    text,
    at: new Date().toISOString(),
  })
  if (db.logs.length > MAX_LOGS) db.logs.length = MAX_LOGS
  await flush()
}
