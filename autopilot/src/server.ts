import express from 'express'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { config } from './config.js'
import { initStore, getArtifact } from './store.js'
import { createApiRouter } from './api.js'
import { startScheduler } from './scheduler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')

async function main(): Promise<void> {
  await initStore(config.dataFile)
  await mkdir(config.workspaceDir, { recursive: true })

  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use('/api', createApiRouter())

  // Serve generated landing pages as real, live web pages.
  app.get('/sites/:id', (req, res) => {
    const a = getArtifact(req.params.id)
    if (!a || a.type !== 'website') {
      return res.status(404).send('Site not found')
    }
    res.type('html').send(a.content)
  })

  app.use(express.static(publicDir))

  startScheduler()

  app.listen(config.port, () => {
    const cap =
      config.provider === 'openai'
        ? `$${config.monthlyUsdCap.toFixed(2)}/mo cap`
        : '$0 (free provider)'
    console.log('')
    console.log('  ┌─────────────────────────────────────────────┐')
    console.log('  │  Autopilot — autonomous agent orchestrator   │')
    console.log('  └─────────────────────────────────────────────┘')
    console.log(`  Dashboard : http://localhost:${config.port}`)
    console.log(`  Provider  : ${config.provider}  (${cap})`)
    console.log(
      `  Scheduler : ${
        config.schedulerEnabled ? `on (default ${config.defaultCron})` : 'off'
      }`,
    )
    console.log('')
  })
}

main().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
