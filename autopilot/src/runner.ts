import { getProvider } from './providers/index.js'
import { getHandler } from './tasks/index.js'
import { addRun, getTask, updateRun, updateTask } from './store.js'
import type { Run } from './types.js'

/**
 * Execute a single task once. Never throws — all failures are captured in the
 * returned Run so the scheduler and API stay alive.
 */
export async function runTask(
  taskId: string,
  trigger: 'cron' | 'manual',
): Promise<Run> {
  const task = getTask(taskId)
  const startedAt = new Date().toISOString()

  const run: Run = {
    id: crypto.randomUUID(),
    taskId,
    taskName: task?.name ?? '(deleted task)',
    type: task?.type ?? 'general',
    status: 'running',
    trigger,
    startedAt,
    provider: getProvider().name,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
  }
  await addRun(run)

  if (!task) {
    await updateRun(run.id, {
      status: 'error',
      error: 'Task not found',
      finishedAt: new Date().toISOString(),
    })
    return { ...run, status: 'error', error: 'Task not found' }
  }

  try {
    const provider = getProvider()
    const handler = getHandler(task.type)
    const result = await handler(task, provider)

    if (result.llm.refused) {
      const patch: Partial<Run> = {
        status: 'refused',
        output: result.llm.refusalReason,
        finishedAt: new Date().toISOString(),
        provider: result.llm.provider,
      }
      await updateRun(run.id, patch)
      await updateTask(taskId, { lastRunAt: startedAt })
      return { ...run, ...patch }
    }

    const patch: Partial<Run> = {
      status: 'success',
      output: result.output,
      filesWritten: result.filesWritten,
      finishedAt: new Date().toISOString(),
      provider: result.llm.provider,
      promptTokens: result.llm.promptTokens,
      completionTokens: result.llm.completionTokens,
      costUsd: result.llm.costUsd,
    }
    await updateRun(run.id, patch)
    await updateTask(taskId, { lastRunAt: startedAt })
    return { ...run, ...patch }
  } catch (err) {
    const patch: Partial<Run> = {
      status: 'error',
      error: (err as Error).message,
      finishedAt: new Date().toISOString(),
    }
    await updateRun(run.id, patch)
    await updateTask(taskId, { lastRunAt: startedAt })
    return { ...run, ...patch }
  }
}
