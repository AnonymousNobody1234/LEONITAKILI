import { Router } from 'express'
import { config } from './config.js'
import {
  createTask,
  deleteTask,
  getTask,
  listRuns,
  listTasks,
  updateTask,
} from './store.js'
import { runTask } from './runner.js'
import { reloadScheduler } from './scheduler.js'
import { thisMonthSummary } from './spend.js'
import type { TaskType } from './types.js'

const VALID_TYPES: TaskType[] = ['research', 'content', 'coding', 'general']

export function createApiRouter(): Router {
  const router = Router()

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      provider: config.provider,
      schedulerEnabled: config.schedulerEnabled,
      monthlyUsdCap: config.monthlyUsdCap,
    })
  })

  router.get('/spend', (_req, res) => {
    res.json(thisMonthSummary())
  })

  router.get('/tasks', (_req, res) => {
    res.json(listTasks())
  })

  router.get('/tasks/:id', (req, res) => {
    const task = getTask(req.params.id)
    if (!task) return res.status(404).json({ error: 'Task not found' })
    res.json(task)
  })

  router.post('/tasks', async (req, res) => {
    const { name, type, prompt, sources, cron, enabled } = req.body ?? {}
    if (!name || typeof name !== 'string')
      return res.status(400).json({ error: 'name is required' })
    if (!VALID_TYPES.includes(type))
      return res
        .status(400)
        .json({ error: `type must be one of ${VALID_TYPES.join(', ')}` })
    if (!prompt || typeof prompt !== 'string')
      return res.status(400).json({ error: 'prompt is required' })

    const task = await createTask({
      name,
      type,
      prompt,
      sources: Array.isArray(sources)
        ? sources.filter((s) => typeof s === 'string' && s.trim())
        : undefined,
      cron: typeof cron === 'string' && cron.trim() ? cron.trim() : undefined,
      enabled: enabled !== false,
    })
    reloadScheduler()
    res.status(201).json(task)
  })

  router.put('/tasks/:id', async (req, res) => {
    const updated = await updateTask(req.params.id, req.body ?? {})
    if (!updated) return res.status(404).json({ error: 'Task not found' })
    reloadScheduler()
    res.json(updated)
  })

  router.delete('/tasks/:id', async (req, res) => {
    const ok = await deleteTask(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Task not found' })
    reloadScheduler()
    res.json({ ok: true })
  })

  router.post('/tasks/:id/run', async (req, res) => {
    const task = getTask(req.params.id)
    if (!task) return res.status(404).json({ error: 'Task not found' })
    const run = await runTask(req.params.id, 'manual')
    res.json(run)
  })

  router.get('/runs', (req, res) => {
    const taskId =
      typeof req.query.taskId === 'string' ? req.query.taskId : undefined
    const limit = req.query.limit ? Number(req.query.limit) : 50
    res.json(listRuns({ taskId, limit }))
  })

  return router
}
