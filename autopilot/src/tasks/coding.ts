import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { config } from '../config.js'
import type { TaskHandler, TaskResult } from './types.js'

interface FileBlock {
  path: string
  content: string
}

/**
 * Parse blocks of the form:
 *   FILE: relative/path.ext
 *   ```lang
 *   ...content...
 *   ```
 */
export function parseFileBlocks(text: string): FileBlock[] {
  const blocks: FileBlock[] = []
  const re = /FILE:\s*(.+?)\s*\n```[^\n]*\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    blocks.push({ path: m[1].trim(), content: m[2] })
  }
  return blocks
}

/** Write a file ONLY if it resolves inside the sandboxed workspace dir. */
async function safeWrite(rel: string, content: string): Promise<string> {
  const root = resolve(config.workspaceDir)
  const target = resolve(root, rel)
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`Refused to write outside workspace: ${rel}`)
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content, 'utf8')
  return rel
}

export const codingHandler: TaskHandler = async (
  task,
  provider,
): Promise<TaskResult> => {
  const prompt = `${task.prompt}\n\nRespond with the complete files needed. For EACH file use exactly this format:\n\nFILE: relative/path/name.ext\n\`\`\`\n<file contents>\n\`\`\`\n\nUse relative paths only (no leading slash, no "..").`

  const llm = await provider.generate(prompt, {
    system:
      'You are a senior software engineer. Output only the files requested, each in the specified FILE: + code-fence format.',
    maxTokens: 2000,
  })

  const blocks = parseFileBlocks(llm.text)
  const written: string[] = []
  const errors: string[] = []
  for (const b of blocks) {
    try {
      written.push(await safeWrite(b.path, b.content))
    } catch (err) {
      errors.push(`${b.path}: ${(err as Error).message}`)
    }
  }

  const output =
    (written.length
      ? `Wrote ${written.length} file(s) to workspace/:\n` +
        written.map((f) => `  • ${f}`).join('\n')
      : 'No files were parsed from the model output.') +
    (errors.length ? `\n\nSkipped:\n` + errors.map((e) => `  • ${e}`).join('\n') : '') +
    `\n\n--- Raw model output ---\n${llm.text}`

  return { output, filesWritten: written, llm }
}
