import fsPath from 'path'
import {
  cardanoEraToRawType,
  HARDENED_THRESHOLD,
  NETWORKS,
  PathLabel,
  txTypeToCardanoEra,
} from '../constants'
import {
  isBIP32Path,
  isCborHex,
  isDerivationType,
  isHwSigningData,
  isRawTxFileData,
  isTxFileData,
  isVotePublicKeyHex,
} from '../guards'
import { Errors } from '../errors'
import {
  Address,
  BIP32Path,
  DerivationType,
  HwSigningData,
  HwSigningType,
  NativeScript,
  NativeScriptType,
  RawTxFileData,
  TxFileData,
  VotePublicKeyHex,
} from '../types'
import { KesVKey, OpCertIssueCounter } from '../opCert/opCert'
import { decodeCbor, invertObject } from '../util'
import { classifyPath, PathTypes } from '../crypto-providers/util'

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

export const parseFileTypeMagic = (fileTypeMagic: string, pathType: PathTypes): HwSigningType => {
  // cardano-cli only distinguish 3 categories, payment, pool cold and stake keys
  // to keep things simple, any other key is bundled into the "payment" category
  // to keep things more generic
  const checkFileTypeStartsWith = (label: PathLabel) => {
    if (!fileTypeMagic.startsWith(label)) {
      throw Error(Errors.InvalidFileTypeError)
    }
  }

  switch (pathType) {
    case PathTypes.PATH_WALLET_ACCOUNT_MULTISIG:
    case PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG:
      checkFileTypeStartsWith(PathLabel.PAYMENT)
      return HwSigningType.MultiSig
    case PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG:
      checkFileTypeStartsWith(PathLabel.STAKE)
      return HwSigningType.MultiSig
    case PathTypes.PATH_WALLET_ACCOUNT:
    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
      checkFileTypeStartsWith(PathLabel.PAYMENT)
      return HwSigningType.Payment
    case PathTypes.PATH_WALLET_STAKING_KEY:
      checkFileTypeStartsWith(PathLabel.STAKE)
      return HwSigningType.Stake
    case PathTypes.PATH_WALLET_MINTING_KEY:
      checkFileTypeStartsWith(PathLabel.PAYMENT)
      return HwSigningType.Mint
    case PathTypes.PATH_POOL_COLD_KEY:
      checkFileTypeStartsWith(PathLabel.POOL_COLD)
      return HwSigningType.PoolCold
    default:
      throw Error(Errors.InvalidFileTypeError)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const extractHWSigningData = ({
  type: fileTypeMagic, description, path: bip32pathstr, ...parsedData
}: any): HwSigningData => {
  const path = parseBIP32Path(bip32pathstr)
  const result = {
    type: parseFileTypeMagic(fileTypeMagic, classifyPath(path)),
    path,
    ...parsedData,
  }
  if (isHwSigningData(result)) {
    return result
  }
  throw Error(Errors.InvalidHwSigningFileError)
}

export const parseHwSigningFile = (path: string): HwSigningData => {
  const data = JSON.parse(rw.readFileSync(path, 'utf8'))
  return extractHWSigningData(data)
}

export const parseRawTxFile = (path: string): RawTxFileData => {
  const json = JSON.parse(rw.readFileSync(path, 'utf8'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, description, cborHex } = json
  const era = invertObject(cardanoEraToRawType)[type]
  const data = { era, description, cborHex }
  if (isRawTxFileData(data)) {
    return data
  }
  throw Error(Errors.InvalidRawTxFileError)
}

export const parseTxFile = (path: string): TxFileData => {
  const json = JSON.parse(rw.readFileSync(path, 'utf8'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, description, cborHex } = json
  const era = txTypeToCardanoEra[type]
  const data = {
    era,
    description,
    cborHex,
    envelopeType: type,
  }
  if (isTxFileData(data)) {
    return data
  }
  throw Error(Errors.InvalidTxFileError)
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

const SCRIPT_HASH_LENGTH = 28

export const parseScriptHashHex = (hashHex: string): string => {
  if (!/^[0-9a-fA-F]*$/.test(hashHex) || hashHex.length !== SCRIPT_HASH_LENGTH * 2) {
    throw Error(Errors.InvalidScriptHashHex)
  }
  return hashHex
}

const nativeScriptTypeMap: {[key: string]: NativeScriptType} = {
  all: NativeScriptType.ALL,
  any: NativeScriptType.ANY,
  atLeast: NativeScriptType.N_OF_K,
  after: NativeScriptType.INVALID_BEFORE,
  before: NativeScriptType.INVALID_HEREAFTER,
  sig: NativeScriptType.PUBKEY,
}

const parseNativeScriptData = (data: any): NativeScript => {
  const isCorrectNumber = (n: any): boolean => typeof n === 'number' && n >= 0 && n <= Number.MAX_SAFE_INTEGER

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
        scripts: data.scripts.map(parseNativeScriptData),
      }
    case NativeScriptType.N_OF_K:
      if (!isCorrectNumber(data.required) || !data.scripts || !Array.isArray(data.scripts)) {
        throw Error(Errors.InvalidNativeScriptFile)
      }
      return {
        type,
        required: data.required,
        scripts: data.scripts.map(parseNativeScriptData),
      }
    case NativeScriptType.INVALID_BEFORE:
    case NativeScriptType.INVALID_HEREAFTER:
      if (!isCorrectNumber(data.slot)) {
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

export const parseNativeScriptFile = (path: string): NativeScript => {
  const data = JSON.parse(rw.readFileSync(path, 'utf8'))

  return parseNativeScriptData(data)
}

export const parseDerivationType = (
  name?: string,
): DerivationType | undefined => {
  if (!name) return undefined
  if (isDerivationType(name)) return name
  throw Error(Errors.InvalidDerivationTypeError)
}
