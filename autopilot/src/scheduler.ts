import cron, { type ScheduledTask } from 'node-cron'
import { config } from './config.js'
import { listTasks } from './store.js'
import { runTask } from './runner.js'

const jobs = new Map<string, ScheduledTask>()

function clearJobs(): void {
  for (const job of jobs.values()) job.stop()
  jobs.clear()
}

export function reloadScheduler(): void {
  if (!config.schedulerEnabled) {
    clearJobs()
    return
  }
  clearJobs()
  for (const task of listTasks()) {
    if (!task.enabled) continue
    const expr = task.cron || config.defaultCron
    if (!cron.validate(expr)) {
      console.warn(`[scheduler] skipping "${task.name}": invalid cron "${expr}"`)
      continue
    }
    const job = cron.schedule(expr, () => {
      console.log(`[scheduler] running "${task.name}" (${task.id})`)
      runTask(task.id, 'cron').catch((e) =>
        console.error(`[scheduler] run failed:`, e),
      )
    })
    jobs.set(task.id, job)
  }
  console.log(`[scheduler] ${jobs.size} job(s) scheduled.`)
}

export function startScheduler(): void {
  if (!config.schedulerEnabled) {
    console.log('[scheduler] disabled (SCHEDULER_ENABLED=false).')
    return
  }
  reloadScheduler()
}
