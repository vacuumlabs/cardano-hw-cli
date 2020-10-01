import { promises as fs } from 'fs'
import { argKeyToGuard } from '../guards'

export default async (argKey: string, argValue: string) => {
  const data = JSON.parse(await fs.readFile(argValue, 'utf8'))
  if (argKeyToGuard[argKey](data)) {
    return data
  }
  throw new Error(`Invalid file contents of '${argKey}': '${argValue}'`)
}
