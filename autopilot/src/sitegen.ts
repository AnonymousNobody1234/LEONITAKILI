import type { Company } from './types.js'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface Copy {
  headline: string
  subhead: string
  cta: string
  features: { title: string; body: string }[]
}

/** Parse the structured copy lines the model returns; fall back gracefully. */
function parseCopy(raw: string, company: Company): Copy {
  const get = (key: string): string => {
    const m = raw.match(new RegExp(`${key}:\\s*(.+)`, 'i'))
    const val = m ? m[1].trim() : ''
    // Reject mock banners and unfilled placeholders so pages stay clean
    // even on the free mock brain (real providers fill these properly).
    if (!val || val.includes('mock output') || /^<.*>$/.test(val)) return ''
    return val
  }
  const feat = (key: string): { title: string; body: string } | null => {
    const line = get(key)
    if (!line) return null
    const [title, body] = line.split('|').map((s) => s.trim())
    return { title: title || key, body: body || '' }
  }
  const features = [feat('FEATURE1'), feat('FEATURE2'), feat('FEATURE3')].filter(
    (f): f is { title: string; body: string } => f !== null,
  )

  return {
    headline: get('HEADLINE') || company.name,
    subhead: get('SUBHEAD') || company.description,
    cta: get('CTA') || 'Get started',
    features: features.length
      ? features
      : [
          { title: 'Fast', body: 'Built to move quickly.' },
          { title: 'Simple', body: 'No clutter, just results.' },
          { title: 'Reliable', body: 'Works the way you expect.' },
        ],
  }
}

/** Produce a complete, standalone HTML landing page for a company. */
export function renderLandingPage(
  company: Company,
  rawCopy: string,
  selfUrl: string,
): string {
  const c = parseCopy(rawCopy, company)
  const year = new Date().getFullYear()
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(company.name)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>body{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}</style>
</head>
<body class="bg-neutral-950 text-neutral-100">
  <header class="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
    <span class="font-bold text-lg">${esc(company.name)}</span>
    <a href="#cta" class="text-sm px-4 py-2 rounded-full bg-white text-black font-medium">${esc(c.cta)}</a>
  </header>

  <section class="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
    <h1 class="text-4xl sm:text-6xl font-bold tracking-tight">${esc(c.headline)}</h1>
    <p class="mt-6 text-lg text-neutral-400">${esc(c.subhead)}</p>
    <div id="cta" class="mt-10">
      <a href="#" class="inline-block px-7 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors">${esc(c.cta)}</a>
    </div>
  </section>

  <section class="max-w-5xl mx-auto px-6 pb-24 grid gap-6 sm:grid-cols-3">
    ${c.features
      .map(
        (f) => `<div class="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h3 class="font-semibold text-white">${esc(f.title)}</h3>
      <p class="mt-2 text-sm text-neutral-400">${esc(f.body)}</p>
    </div>`,
      )
      .join('\n    ')}
  </section>

  <footer class="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600">
    © ${year} ${esc(company.name)} · Built autonomously by Autopilot ·
    <a href="${esc(selfUrl)}" class="underline">${esc(selfUrl)}</a>
  </footer>
</body>
</html>`
}
