import { isHwSigningFileFormat, isTxBodyFileFormat } from '../guards'
import {
  HwSigningFileFormat, HwSigningType, Path, TxBodyFileFormat,
} from '../types'

const fs = require('fs')

export const HARDENED_THRESHOLD = 0x80000000

export const parsePath = (
  path: string,
): Path => path
  .split('/')
  .map((arg) => (arg.endsWith('H') ? parseInt(arg.slice(0, -1), 10) + HARDENED_THRESHOLD : parseInt(arg, 10)))

export const parseFileTypeMagic = (fileTypeMagic: string, path: string) => {
  if (fileTypeMagic.startsWith('Payment')) {
    return HwSigningType.Payment
  }

  if (fileTypeMagic.startsWith('Stake')) {
    return HwSigningType.Stake
  }

  throw new Error(`Invalid file type of hw-signing-file at ${path}`)
}

export const parseHwSigningFile = (path: string): HwSigningFileFormat => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'))
  data.path = parsePath(data.path)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type: fileTypeMagic, description, ...parsedData } = data

  const result = { type: parseFileTypeMagic(fileTypeMagic, path), ...parsedData }
  if (isHwSigningFileFormat(result)) {
    return result
  }
  throw new Error(`Invalid file contents of hw-signing-file at ${path}'`)
}

export const parseTxBodyFile = (path: string): TxBodyFileFormat => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, description, ...parsedData } = data
  if (isTxBodyFileFormat(parsedData)) {
    return parsedData
  }
  throw new Error(`Invalid file contents of tx-body-file at ${path}'`)
}
