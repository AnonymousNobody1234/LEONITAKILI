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

let activeCompanyId = null
let lastLogId = null

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

// ── Header badges ────────────────────────────────────────
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
async function loadSpend() {
  try {
    const s = await api('/spend')
    $('#spend-badge').textContent =
      s.cap > 0
        ? `spent $${s.spent.toFixed(4)} / $${s.cap.toFixed(2)}`
        : 'every task $0'
  } catch {}
}

// ── Terminal live log ────────────────────────────────────
async function loadLogs() {
  try {
    const logs = await api('/logs?limit=40')
    if (!logs.length) return
    const term = $('#terminal')
    term.innerHTML = logs
      .slice()
      .reverse()
      .map((l) => `&gt; ${esc(l.text)}`)
      .join('\n')
    // autoscroll if a new event arrived
    const newest = logs[0].id
    if (newest !== lastLogId) {
      lastLogId = newest
      term.scrollTop = term.scrollHeight
    }
  } catch {}
}

// ── Company tabs ─────────────────────────────────────────
const STATUS_DOT = {
  idle: 'bg-neutral-500',
  investigating: 'bg-amber-400 animate-pulse',
  building: 'bg-blue-400 animate-pulse',
  live: 'bg-emerald-500',
  error: 'bg-red-500',
}

async function loadCompanies() {
  try {
    const companies = await api('/companies')
    const tabs = $('#company-tabs')
    if (!companies.length) {
      tabs.innerHTML = ''
      activeCompanyId = null
      return
    }
    if (!activeCompanyId || !companies.find((c) => c.id === activeCompanyId)) {
      activeCompanyId = companies[0].id
    }
    tabs.innerHTML = companies
      .map(
        (c) => `
      <button data-tab="${c.id}" class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${
        c.id === activeCompanyId
          ? 'border-emerald-600 bg-neutral-900 text-white'
          : 'border-neutral-800 text-neutral-400 hover:text-white'
      }">
        <span class="h-2 w-2 rounded-full ${STATUS_DOT[c.status] || 'bg-neutral-500'}"></span>
        ${esc(c.name)}
      </button>`,
      )
      .join('')
  } catch {}
}

// ── Active company view ──────────────────────────────────
const MASCOT = `  ┌────────┐
  │  ◉  ◉  │
  │   ▽    │
  │  \\__/  │
  └────────┘`

function phaseRow(p) {
  const icon =
    p.status === 'done'
      ? '✅'
      : p.status === 'running'
        ? '⏳'
        : p.status === 'error'
          ? '❌'
          : '○'
  return `<div class="flex items-start gap-2 text-sm">
    <span>${icon}</span>
    <div>
      <span class="${p.status === 'pending' ? 'text-neutral-600' : 'text-neutral-200'}">${esc(p.label)}</span>
      ${p.note ? `<span class="text-neutral-600"> — ${esc(p.note)}</span>` : ''}
    </div>
  </div>`
}

function artifactCard(a) {
  const icons = { document: '📄', website: '🌐', email: '✉️', social: '🐦' }
  const head = `<div class="flex items-center justify-between gap-2">
      <span class="text-sm text-white truncate">${icons[a.type] || '•'} ${esc(a.title)}</span>
      <span class="text-[10px] text-neutral-500">${timeAgo(a.createdAt)}</span>
    </div>`

  if (a.type === 'website') {
    return `<div class="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      ${head}
      <div class="mt-2 flex items-center gap-2">
        <a href="${esc(a.url)}" target="_blank" class="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Open live site ↗</a>
        <code class="text-[11px] text-neutral-500 truncate">${esc(a.url)}</code>
      </div>
    </div>`
  }
  const status =
    a.status === 'draft'
      ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">draft</span>'
      : a.status === 'sent'
        ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300">sent</span>'
        : ''
  return `<div class="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
    ${head}
    ${a.to ? `<p class="text-[11px] text-neutral-600 mt-1">to: ${esc(a.to)} ${status}</p>` : status ? `<p class="mt-1">${status}</p>` : ''}
    <pre class="mt-2 text-xs text-neutral-400 whitespace-pre-wrap max-h-40 overflow-auto">${esc(a.content)}</pre>
  </div>`
}

async function loadCompanyView() {
  if (!activeCompanyId) {
    $('#company-view').innerHTML =
      '<p class="text-sm text-neutral-600 lg:col-span-3">No company yet — launch one above and watch it build itself.</p>'
    return
  }
  try {
    const [company, artifacts] = await Promise.all([
      api('/companies/' + activeCompanyId),
      api('/artifacts?companyId=' + activeCompanyId),
    ])

    const docs = artifacts.filter((a) => a.type === 'document')
    const sites = artifacts.filter((a) => a.type === 'website')
    const comms = artifacts.filter(
      (a) => a.type === 'email' || a.type === 'social',
    )

    $('#company-view').innerHTML = `
      <!-- Status panel -->
      <section class="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 class="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
          <span class="h-2 w-2 rounded-full ${STATUS_DOT[company.status] || 'bg-neutral-500'}"></span>
          ${esc(company.name)}
        </h2>
        <pre class="mono text-[10px] text-emerald-400 leading-tight mb-2">${MASCOT}</pre>
        <p class="text-base font-medium text-white capitalize">${esc(company.status)}</p>
        <p class="text-xs text-neutral-500 mb-4">${esc(company.statusDetail || '')}</p>
        <div class="space-y-2">${company.phases.map(phaseRow).join('')}</div>
        <button data-rebuild="${company.id}" class="mt-4 text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300">Rebuild</button>
        <button data-delcompany="${company.id}" class="mt-4 text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-900 text-neutral-400">Delete</button>
      </section>

      <!-- Documents + Website -->
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-neutral-300">Documents</h2>
        ${docs.length ? docs.map(artifactCard).join('') : '<p class="text-xs text-neutral-600">—</p>'}
        <h2 class="text-sm font-semibold text-neutral-300 pt-2">Website</h2>
        ${sites.length ? sites.map(artifactCard).join('') : '<p class="text-xs text-neutral-600">—</p>'}
      </section>

      <!-- Outreach -->
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-neutral-300">Outreach</h2>
        ${comms.length ? comms.map(artifactCard).join('') : '<p class="text-xs text-neutral-600">—</p>'}
      </section>
    `
  } catch {}
}

// ── Interactions ─────────────────────────────────────────
$('#company-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = e.target
  const body = {
    name: f.name.value.trim(),
    description: f.description.value.trim(),
    audience: f.audience.value.trim() || undefined,
  }
  const btn = f.querySelector('button[type=submit]')
  btn.textContent = 'Launching…'
  btn.disabled = true
  try {
    const company = await api('/companies', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    activeCompanyId = company.id
    f.reset()
    await refreshAll()
  } catch (err) {
    alert('Could not launch: ' + err.message)
  }
  btn.textContent = 'Launch company'
  btn.disabled = false
})

document.addEventListener('click', async (e) => {
  const tab = e.target.closest?.('[data-tab]')?.getAttribute('data-tab')
  if (tab) {
    activeCompanyId = tab
    loadCompanies()
    loadCompanyView()
    return
  }
  const rebuild = e.target.getAttribute?.('data-rebuild')
  if (rebuild) {
    await api(`/companies/${rebuild}/build`, { method: 'POST' })
    return
  }
  const del = e.target.getAttribute?.('data-delcompany')
  if (del) {
    if (!confirm('Delete this company and its artifacts?')) return
    await api(`/companies/${del}`, { method: 'DELETE' })
    activeCompanyId = null
    await refreshAll()
  }
})

// ── Boot + polling ───────────────────────────────────────
async function refreshAll() {
  await loadCompanies()
  await loadCompanyView()
  loadLogs()
  loadSpend()
}

loadHealth()
refreshAll()
setInterval(() => {
  loadLogs()
  loadCompanyView()
  loadCompanies()
  loadSpend()
}, 3000)
