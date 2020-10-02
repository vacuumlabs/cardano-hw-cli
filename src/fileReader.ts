import { argKeyToGuard } from './guards'

const fs = require('fs')

export const read = (argKey: string, argValue: string) => {
  const data = JSON.parse(fs.readFileSync(argValue, 'utf8'))
  if (argKeyToGuard[argKey](data)) {
    return data
  }
  throw new Error(`Invalid file contents of '${argKey}': '${argValue}'`)
}

export const readMultiple = (
  argKey: string, argValues: string[],
) => argValues.map((argValue: string) => read(argKey, argValue))

export const readOptional = (argKey: string, argValue: string) => {
  try {
    return read(argKey, argValue)
  } catch (e) {
    return undefined
  }
}
