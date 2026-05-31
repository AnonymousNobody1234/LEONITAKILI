import { getProvider } from './providers/index.js'
import {
  addArtifact,
  addCompany,
  addLog,
  getCompany,
  updateArtifact,
  updateCompany,
} from './store.js'
import { renderLandingPage } from './sitegen.js'
import type { Artifact, Company, Phase } from './types.js'

const PHASES: Omit<Phase, 'status'>[] = [
  { name: 'research', label: 'Investigating' },
  { name: 'document', label: 'Writing strategy' },
  { name: 'website', label: 'Building landing page' },
  { name: 'outreach', label: 'Drafting outreach' },
]

function freshPhases(): Phase[] {
  return PHASES.map((p) => ({ ...p, status: 'pending' as const }))
}

export async function createCompany(input: {
  name: string
  description: string
  audience?: string
}): Promise<Company> {
  const now = new Date().toISOString()
  const company: Company = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    audience: input.audience,
    status: 'idle',
    phases: freshPhases(),
    createdAt: now,
    updatedAt: now,
  }
  await addCompany(company)
  await addLog(company.id, `Company "${company.name}" created.`)
  return company
}

async function setPhase(
  company: Company,
  name: string,
  patch: Partial<Phase>,
): Promise<void> {
  const phase = company.phases.find((p) => p.name === name)
  if (phase) Object.assign(phase, patch)
  await updateCompany(company.id, { phases: company.phases })
}

/**
 * Run the full autonomous build: research -> strategy doc -> live landing
 * page -> drafted outreach. Each step feeds the next. Never throws.
 */
export async function buildCompany(companyId: string): Promise<void> {
  const company = getCompany(companyId)
  if (!company) return

  const provider = getProvider()
  company.phases = freshPhases()
  await updateCompany(company.id, {
    status: 'investigating',
    statusDetail: 'Researching and gathering information about the idea',
    phases: company.phases,
  })

  try {
    // ── Phase 1: research ──────────────────────────────
    await setPhase(company, 'research', {
      status: 'running',
      startedAt: new Date().toISOString(),
    })
    await addLog(company.id, 'Researching the market...')
    const research = await provider.generate(
      `You are a market analyst. Briefly analyze the opportunity for this company:\n\nName: ${company.name}\nWhat it does: ${company.description}\nAudience: ${company.audience || 'general'}\n\nGive: the core problem, the target customer, and 3 things that would make it stand out.`,
      { system: 'You write tight, practical market analysis.', maxTokens: 800 },
    )
    await setPhase(company, 'research', {
      status: 'done',
      note: 'Market analysis complete',
      finishedAt: new Date().toISOString(),
    })
    await addLog(company.id, 'Research complete.')

    // ── Phase 2: strategy document ─────────────────────
    await setPhase(company, 'document', {
      status: 'running',
      startedAt: new Date().toISOString(),
    })
    await updateCompany(company.id, {
      status: 'building',
      statusDetail: 'Writing the go-to-market strategy',
    })
    await addLog(company.id, 'Writing strategy document...')
    const doc = await provider.generate(
      `Write a concise go-to-market strategy document for "${company.name}".\n\nWhat it does: ${company.description}\nAudience: ${company.audience || 'general'}\n\nBased on this research:\n${research.text}\n\nInclude: positioning, target segments, key messaging, and a 30-day launch plan.`,
      { system: 'You are a startup strategist.', maxTokens: 1200 },
    )
    await saveArtifact(company, {
      type: 'document',
      title: `Market & Strategy Report — ${company.name}`,
      content: doc.text,
      status: 'published',
    })
    await setPhase(company, 'document', {
      status: 'done',
      note: 'Strategy report saved',
      finishedAt: new Date().toISOString(),
    })
    await addLog(company.id, 'Strategy document saved.')

    // ── Phase 3: landing page (real, hosted) ───────────
    await setPhase(company, 'website', {
      status: 'running',
      startedAt: new Date().toISOString(),
    })
    await addLog(company.id, 'Building landing page...')
    const copy = await provider.generate(
      `Write landing-page copy for "${company.name}".\nWhat it does: ${company.description}\nAudience: ${company.audience || 'general'}\n\nReturn EXACTLY these lines, nothing else:\nHEADLINE: <one punchy headline>\nSUBHEAD: <one sentence>\nCTA: <2-4 word button text>\nFEATURE1: <title> | <one sentence>\nFEATURE2: <title> | <one sentence>\nFEATURE3: <title> | <one sentence>`,
      { system: 'You are a conversion copywriter.', maxTokens: 500 },
    )
    const siteArtifact = await saveArtifact(company, {
      type: 'website',
      title: `${company.name} — Landing Page`,
      content: '', // filled once we know the id (url is /sites/<id>)
      status: 'published',
    })
    const siteUrl = `/sites/${siteArtifact.id}`
    const html = renderLandingPage(company, copy.text, siteUrl)
    await updateArtifact(siteArtifact.id, { content: html, url: siteUrl })
    await setPhase(company, 'website', {
      status: 'done',
      note: siteUrl,
      finishedAt: new Date().toISOString(),
    })
    await addLog(company.id, `Landing page live at ${siteUrl}`)

    // ── Phase 4: outreach drafts (email + social) ──────
    await setPhase(company, 'outreach', {
      status: 'running',
      startedAt: new Date().toISOString(),
    })
    await addLog(company.id, 'Drafting outreach...')
    const email = await provider.generate(
      `Write a short, warm launch announcement email for "${company.name}" (${company.description}). Friendly, 120 words max, with a subject line on the first line as "Subject: ...".`,
      { system: 'You write high-converting launch emails.', maxTokens: 400 },
    )
    await saveArtifact(company, {
      type: 'email',
      title: `Launch announcement — ${company.name}`,
      content: email.text,
      status: 'draft',
      to: '(your audience)',
    })
    const tweet = await provider.generate(
      `Write one launch tweet for "${company.name}" (${company.description}). Under 200 characters, 1-2 relevant hashtags.`,
      { system: 'You write punchy launch tweets.', maxTokens: 150 },
    )
    await saveArtifact(company, {
      type: 'social',
      title: `Launch tweet — ${company.name}`,
      content: tweet.text,
      status: 'draft',
    })
    await setPhase(company, 'outreach', {
      status: 'done',
      note: 'Email + tweet drafted',
      finishedAt: new Date().toISOString(),
    })
    await addLog(company.id, 'Outreach drafts ready for your review.')

    await updateCompany(company.id, {
      status: 'live',
      statusDetail: 'Live — landing page published, drafts ready',
    })
    await addLog(company.id, `"${company.name}" is live.`)
  } catch (err) {
    await updateCompany(company.id, {
      status: 'error',
      statusDetail: (err as Error).message,
    })
    await addLog(company.id, `Error: ${(err as Error).message}`)
  }
}

async function saveArtifact(
  company: Company,
  input: {
    type: Artifact['type']
    title: string
    content: string
    status: Artifact['status']
    to?: string
  },
): Promise<Artifact> {
  const artifact: Artifact = {
    id: crypto.randomUUID(),
    companyId: company.id,
    type: input.type,
    title: input.title,
    content: input.content,
    status: input.status,
    to: input.to,
    createdAt: new Date().toISOString(),
  }
  await addArtifact(artifact)
  return artifact
}
