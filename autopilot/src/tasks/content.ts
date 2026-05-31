import type { TaskHandler, TaskResult } from './types.js'

export const contentHandler: TaskHandler = async (
  task,
  provider,
): Promise<TaskResult> => {
  const llm = await provider.generate(task.prompt, {
    system:
      'You are a skilled content writer. Produce polished, ready-to-publish copy that follows the brief exactly.',
    maxTokens: 1200,
  })
  return { output: llm.text, llm }
}
