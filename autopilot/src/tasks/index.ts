import type { TaskType } from '../types.js'
import type { TaskHandler } from './types.js'
import { researchHandler } from './research.js'
import { contentHandler } from './content.js'
import { codingHandler } from './coding.js'
import { generalHandler } from './general.js'

export function getHandler(type: TaskType): TaskHandler {
  switch (type) {
    case 'research':
      return researchHandler
    case 'content':
      return contentHandler
    case 'coding':
      return codingHandler
    case 'general':
      return generalHandler
    default:
      throw new Error(`Unknown task type: ${type}`)
  }
}

export type { TaskHandler, TaskResult } from './types.js'
