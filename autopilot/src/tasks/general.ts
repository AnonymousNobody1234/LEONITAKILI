import type { TaskHandler, TaskResult } from './types.js'

export const generalHandler: TaskHandler = async (
  task,
  provider,
): Promise<TaskResult> => {
  const llm = await provider.generate(task.prompt, {
    system:
      'You are a capable autonomous assistant. Carry out the instruction and report the result.',
    maxTokens: 1200,
  })
  return { output: llm.text, llm }
}
