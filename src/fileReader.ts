import { argKeyToGuard } from './guards'

const fs = require('fs')

export const read = (arg: string, path: string) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (argKeyToGuard[arg](data)) {
    return data
  }
  throw new Error(`Invalid file contents of '${arg}': '${path}'`)
}
