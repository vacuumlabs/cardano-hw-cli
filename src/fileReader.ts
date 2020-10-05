import { isHwSigning, isTxBody } from './guards'

const fs = require('fs')

export const readHwSigningFile = (path: string) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (isHwSigning(data)) {
    return data
  }
  throw new Error(`Invalid file contents of hw-signing-file at ${path}'`)
}

export const readTxBodyFile = (path: string) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (isTxBody(data)) {
    return data
  }
  throw new Error(`Invalid file contents of tx-body-file at ${path}'`)
}
