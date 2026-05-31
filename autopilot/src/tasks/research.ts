import type { TaskHandler, TaskResult } from './types.js'

const MAX_CHARS_PER_SOURCE = 8000

async function fetchAndStrip(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'autopilot-agent/1.0' },
    })
    if (!res.ok) return `[Could not fetch ${url}: HTTP ${res.status}]`
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, MAX_CHARS_PER_SOURCE)
  } catch (err) {
    return `[Could not fetch ${url}: ${(err as Error).message}]`
  }
}

export const researchHandler: TaskHandler = async (
  task,
  provider,
): Promise<TaskResult> => {
  const sources = task.sources ?? []
  const fetched = await Promise.all(
    sources.map(async (url) => {
      const content = await fetchAndStrip(url)
      return `### Source: ${url}\n${content}`
    }),
  )

  const corpus = fetched.join('\n\n') || '(no sources provided)'
  const prompt = `${task.prompt}\n\nUsing ONLY the sources below, produce a clear, concise digest with the key findings as bullet points. Cite which source each point came from.\n\n${corpus}`

  const llm = await provider.generate(prompt, {
    system: 'You are a research analyst who writes tight, factual digests.',
    maxTokens: 1200,
  })

  return { output: llm.text, llm }
}
