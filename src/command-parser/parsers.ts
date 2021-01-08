import fsPath from 'path'
import { HARDENED_THRESHOLD, NETWORKS } from '../constants'
import { isBIP32Path, isHwSigningData, isTxBodyData } from '../guards'
import { Errors } from '../errors'
import {
  Address,
  BIP32Path,
  CardanoEra,
  HwSigningData, HwSigningType, TxBodyData,
} from '../types'

const rw = require('rw')

export const parseNetwork = (name: string, protocolMagic?: string) => {
  if (!protocolMagic) return NETWORKS[name]
  return {
    networkId: NETWORKS[name].networkId,
    protocolMagic: parseInt(protocolMagic, 10),
  }
}

export const parsePath = (
  path: string,
): BIP32Path => {
  const parsedPath = path
    .split('/')
    .map((arg) => (arg.endsWith('H')
      ? parseInt(arg.slice(0, -1), 10) + HARDENED_THRESHOLD
      : parseInt(arg, 10)))
  if (isBIP32Path(parsedPath)) return parsedPath
  throw Error(Errors.InvalidPathError)
}

export const parseFileTypeMagic = (fileTypeMagic: string, path: string) => {
  if (fileTypeMagic.startsWith('Payment')) {
    return HwSigningType.Payment
  }

  if (fileTypeMagic.startsWith('Stake')) {
    return HwSigningType.Stake
  }
  throw Error(Errors.InvalidFileTypeError)
}

export const parseHwSigningFile = (path: string): HwSigningData => {
  const data = JSON.parse(rw.readFileSync(path, 'utf8'))
  data.path = parsePath(data.path)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type: fileTypeMagic, description, ...parsedData } = data

  const result = { type: parseFileTypeMagic(fileTypeMagic, path), ...parsedData }
  if (isHwSigningData(result)) {
    return result
  }
  throw Error(Errors.InvalidHwSigningFileError)
}

export const parseTxBodyFile = (path: string): TxBodyData => {
  const json = JSON.parse(rw.readFileSync(path, 'utf8'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, description, ...parsedData } = json
  const era = Object.values(CardanoEra).find((e) => type.includes(e))
  const data = {
    ...parsedData,
    era,
  }
  if (isTxBodyData(data)) {
    return data
  }
  throw Error(Errors.InvalidTxBodyFileError)
}

export const parseAddressFile = (path: string): Address => {
  const data = rw.readFileSync(path, 'utf8')
  return data.trim()
}

export const parseAppVersion = () => {
  const { version, commit } = JSON.parse(
    rw.readFileSync(fsPath.resolve(__dirname, '../../package.json'), 'utf8'),
  )
  return { version, commit }
}
