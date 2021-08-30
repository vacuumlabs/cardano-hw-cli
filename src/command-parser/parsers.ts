import fsPath from 'path'
import { HARDENED_THRESHOLD, NETWORKS } from '../constants'
import {
  isBIP32Path, isCborHex, isHwSigningData, isTxBodyData, isVotePublicKeyHex,
} from '../guards'
import { Errors } from '../errors'
import {
  Address,
  BIP32Path,
  CardanoEra,
  HwSigningData,
  HwSigningType,
  NativeScript,
  NativeScriptType,
  TxBodyData,
  VotePublicKeyHex,
} from '../types'
import { KesVKey, OpCertIssueCounter } from '../opCert/opCert'
import { decodeCbor } from '../util'

const { bech32 } = require('cardano-crypto.js')
const rw = require('rw')

export const parseNetwork = (name: string, protocolMagic?: string) => {
  if (!protocolMagic) return NETWORKS[name]
  return {
    networkId: NETWORKS[name].networkId,
    protocolMagic: parseInt(protocolMagic, 10),
  }
}

export const parseBIP32Path = (
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

  if (fileTypeMagic.startsWith('StakePool')) { // TODO this string should be a symbolic constant, occurs twice
    return HwSigningType.PoolCold
  }

  if (fileTypeMagic.startsWith('Stake')) {
    return HwSigningType.Stake
  }

  throw Error(Errors.InvalidFileTypeError)
}

export const parseHwSigningFile = (path: string): HwSigningData => {
  const data = JSON.parse(rw.readFileSync(path, 'utf8'))
  data.path = parseBIP32Path(data.path)
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

export const parseKesVKeyFile = (path: string): KesVKey => {
  const data = JSON.parse(rw.readFileSync(path, 'utf8'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, description, cborHex } = data
  // TODO ? validate that "type": "KesVerificationKey_ed25519_kes_2^6",
  // TODO ? validate that "description": "KES Verification Key",

  if (isCborHex(cborHex)) {
    const decoded = decodeCbor(cborHex)
    if (decoded instanceof Buffer && decoded.length === 32) {
      return decoded
    }
  }

  throw Error(Errors.InvalidKesVKeyFileError)
}

export const parseOpCertIssueCounterFile = (path: string): OpCertIssueCounter => {
  const data = JSON.parse(rw.readFileSync(path, 'utf8'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, description, cborHex } = data

  if (type !== 'NodeOperationalCertificateIssueCounter') {
    throw Error(Errors.InvalidOpCertIssueCounterFileError)
  }

  // TODO what about updating the counter in the file? should we? cardano-cli probably does that

  try {
    const decoded = decodeCbor(cborHex)
    if (decoded instanceof Array
      && decoded.length === 2
      && decoded[1] instanceof Buffer
      && decoded[1].length === 32) {
      return {
        counter: BigInt(decoded[0]),
        poolColdKey: decoded[1],
      }
    }
  } catch (e) {
    // we throw, see below
  }

  throw Error(Errors.InvalidOpCertIssueCounterFileError)
}

export const parseVotePubFile = (path: string): VotePublicKeyHex => {
  const data: string = rw.readFileSync(path, 'utf8').trim()
  try {
    const hexString = bech32.decode(data).data.toString('hex')
    if (isVotePublicKeyHex(hexString)) return hexString
  } catch (e) {
    throw Error(Errors.InvalidCatalystVotePublicKey)
  }
  throw Error(Errors.InvalidCatalystVotePublicKey)
}

const nativeScriptTypeMap: {[key: string]: NativeScriptType} = {
  all: NativeScriptType.ALL,
  any: NativeScriptType.ANY,
  atLeast: NativeScriptType.N_OF_K,
  after: NativeScriptType.INVALID_BEFORE,
  before: NativeScriptType.INVALID_HEREAFTER,
  sig: NativeScriptType.PUBKEY,
}

const parseScriptData = (data: any): NativeScript => {
  if (!data.type || !(data.type in nativeScriptTypeMap)) {
    throw Error(Errors.InvalidNativeScriptFile)
  }

  const type = nativeScriptTypeMap[data.type]

  switch (type) {
    case NativeScriptType.PUBKEY:
      if (!data.keyHash || typeof data.keyHash !== 'string') {
        throw Error(Errors.InvalidNativeScriptFile)
      }
      return {
        type,
        keyHash: data.keyHash,
      }
    case NativeScriptType.ALL:
    case NativeScriptType.ANY:
      if (!data.scripts || !Array.isArray(data.scripts)) {
        throw Error(Errors.InvalidNativeScriptFile)
      }
      return {
        type,
        scripts: data.scripts.map(parseScriptData),
      }
    case NativeScriptType.N_OF_K:
      if (typeof data.required !== 'number' || !data.scripts || !Array.isArray(data.scripts)) {
        throw Error(Errors.InvalidNativeScriptFile)
      }
      return {
        type,
        required: data.required,
        scripts: data.scripts.map(parseScriptData),
      }
    case NativeScriptType.INVALID_BEFORE:
    case NativeScriptType.INVALID_HEREAFTER:
      if (typeof data.slot !== 'number') {
        throw Error(Errors.InvalidNativeScriptFile)
      }
      return {
        type,
        slot: data.slot,
      }
    default:
      throw Error(Errors.Unreachable)
  }
}

export const parseScriptFile = (path: string): NativeScript => {
  const data = JSON.parse(rw.readFileSync(path, 'utf8'))

  return parseScriptData(data)
}

const SCRIPT_HASH_LENGTH = 28

export const parseScriptHashHex = (hashHex: string): string => {
  if (!/^[0-9a-fA-F]*$/.test(hashHex) || hashHex.length !== SCRIPT_HASH_LENGTH * 2) {
    throw Error(Errors.InvalidScriptHashHex)
  }
  return hashHex
}
