import { argKeyToGuard } from '../guards'

const fs = require('fs')

export default (argKey: string, argValue: string) => {
  const data = JSON.parse(fs.readFileSync(argValue, 'utf8'))
  if (argKeyToGuard[argKey](data)) {
    return data
  }
  throw new Error(`Invalid file contents of '${argKey}': '${argValue}'`)
}
