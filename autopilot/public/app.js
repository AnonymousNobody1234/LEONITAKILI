const $ = (sel) => document.querySelector(sel)

async function api(path, opts) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || res.statusText)
  }
  return res.json()
}

const STATUS_STYLES = {
  success: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  running: 'bg-blue-900/50 text-blue-300 border-blue-700',
  error: 'bg-red-900/50 text-red-300 border-red-700',
  refused: 'bg-amber-900/50 text-amber-300 border-amber-700',
  pending: 'bg-neutral-800 text-neutral-400 border-neutral-700',
}

function esc(s) {
  return String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]),
  )
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return s + 's ago'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

// ── Health / provider badge ──────────────────────────────
async function loadHealth() {
  try {
    const h = await api('/health')
    const cap =
      h.provider === 'openai'
        ? `$${h.monthlyUsdCap.toFixed(2)}/mo cap`
        : 'free · $0'
    $('#provider-badge').textContent = `${h.provider} · ${cap}`
  } catch {}
}

// ── Spend meter ──────────────────────────────────────────
async function loadSpend() {
  try {
    const s = await api('/spend')
    $('#spend-label').textContent = `$${s.spent.toFixed(4)}`
    const pct = s.cap > 0 ? Math.min(100, (s.spent / s.cap) * 100) : 0
    const bar = $('#spend-bar')
    bar.style.width = pct + '%'
    bar.className =
      'h-full transition-all ' +
      (pct >= 100
        ? 'bg-red-500'
        : pct >= 80
          ? 'bg-amber-500'
          : 'bg-emerald-500')
    $('#spend-sub').textContent =
      s.cap > 0
        ? `Cap $${s.cap.toFixed(2)} · remaining $${s.remaining.toFixed(
            4,
          )} · ${s.paidCalls} paid call(s) · ${s.refusedCalls} refused`
        : `Free provider — every task costs $0. ${s.refusedCalls} refused.`
  } catch {}
}

// ── Tasks ────────────────────────────────────────────────
async function loadTasks() {
  try {
    const tasks = await api('/tasks')
    const el = $('#task-list')
    if (!tasks.length) {
      el.innerHTML =
        '<p class="text-sm text-neutral-600 px-1">No tasks yet. Create one above.</p>'
      return
    }
    el.innerHTML = tasks
      .map(
        (t) => `
      <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-white truncate">${esc(t.name)}</span>
              <span class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">${t.type}</span>
            </div>
            <p class="text-xs text-neutral-500 mt-1 line-clamp-2">${esc(t.prompt)}</p>
            <p class="text-[11px] text-neutral-600 mt-1">
              cron: <code>${esc(t.cron || 'nightly default')}</code>
              ${t.lastRunAt ? '· last run ' + timeAgo(t.lastRunAt) : '· never run'}
            </p>
          </div>
          <div class="flex flex-col gap-1 shrink-0">
            <button data-run="${t.id}" class="text-xs px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">Run now</button>
            <button data-del="${t.id}" class="text-xs px-3 py-1 rounded-lg bg-neutral-800 hover:bg-red-900 text-neutral-400">Delete</button>
          </div>
        </div>
      </div>`,
      )
      .join('')
  } catch {}
}

// ── Live run feed ────────────────────────────────────────
async function loadRuns() {
  try {
    const runs = await api('/runs?limit=30')
    const el = $('#run-feed')
    if (!runs.length) {
      el.innerHTML =
        '<p class="text-sm text-neutral-600 px-1">No activity yet. Hit “Run now” on a task.</p>'
      return
    }
    el.innerHTML = runs
      .map((r) => {
        const style = STATUS_STYLES[r.status] || STATUS_STYLES.pending
        const cost =
          r.costUsd > 0 ? `$${r.costUsd.toFixed(5)}` : 'free'
        return `
      <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="font-medium text-white text-sm truncate">${esc(r.taskName)}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full border ${style}">${r.status}</span>
        </div>
        <p class="text-[11px] text-neutral-600 mb-2">
          ${r.type} · ${r.trigger} · ${timeAgo(r.startedAt)} ·
          ${r.promptTokens + r.completionTokens} tok · ${cost} · ${esc(r.provider)}
        </p>
        ${
          r.output || r.error
            ? `<pre class="text-xs text-neutral-400 bg-neutral-950 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap">${esc(r.error || r.output)}</pre>`
            : ''
        }
      </div>`
      })
      .join('')
  } catch {}
}

// ── Interactions ─────────────────────────────────────────
$('#type-select').addEventListener('change', (e) => {
  $('#sources-field').style.display =
    e.target.value === 'research' ? 'block' : 'none'
})

$('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = e.target
  const body = {
    name: f.name.value.trim(),
    type: f.type.value,
    prompt: f.prompt.value.trim(),
    cron: f.cron.value.trim() || undefined,
    sources: f.sources.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  }
  try {
    await api('/tasks', { method: 'POST', body: JSON.stringify(body) })
    f.reset()
    $('#sources-field').style.display = 'none'
    loadTasks()
  } catch (err) {
    alert('Could not create task: ' + err.message)
  }
})

document.addEventListener('click', async (e) => {
  const runId = e.target.getAttribute?.('data-run')
  const delId = e.target.getAttribute?.('data-del')
  if (runId) {
    e.target.textContent = 'Running…'
    e.target.disabled = true
    try {
      await api(`/tasks/${runId}/run`, { method: 'POST' })
    } catch (err) {
      alert('Run failed: ' + err.message)
    }
    e.target.textContent = 'Run now'
    e.target.disabled = false
    loadRuns()
    loadSpend()
    loadTasks()
  }
  if (delId) {
    if (!confirm('Delete this task?')) return
    await api(`/tasks/${delId}`, { method: 'DELETE' })
    loadTasks()
  }
})

// ── Boot + polling (the live feed) ───────────────────────
$('#sources-field').style.display = 'block' // research is default selection
loadHealth()
loadSpend()
loadTasks()
loadRuns()
setInterval(() => {
  loadRuns()
  loadSpend()
}, 4000)
