import { HARDENED_THRESHOLD } from './constants'
import { classifyPath, PathTypes } from './crypto-providers/util'
import { OpCertIssueCounter, SignedOpCertCborHex } from './opCert/opCert'
import {
  SignedTxCborHex,
  SignedTxOutput,
  WitnessOutput,
  _ByronWitness,
  _ShelleyWitness,
} from './transaction/types'
import {
  BIP32Path,
  CardanoEra,
  Cbor,
  HwSigningOutput,
  OpCertIssueCounterOutput,
  OutputData,
  VerificationKeyOutput,
  XPubKeyCborHex,
  XPubKeyHex,
} from './types'
import { encodeCbor } from './util'

const rw = require('rw')

const write = (path: string, data: OutputData) => rw.writeFileSync(
  path, JSON.stringify(data, null, 4), 'utf8',
)

const writeCbor = (path: string, data: Cbor) => rw.writeFileSync(
  path, data,
)

const cardanoEraToSignedType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxSignedByron',
  [CardanoEra.SHELLEY]: 'TxSignedShelley',
  [CardanoEra.ALLEGRA]: 'Tx AllegraEra',
  [CardanoEra.MARY]: 'Tx MaryEra',
}

const constructSignedTxOutput = (era: CardanoEra, signedTxCborHex: SignedTxCborHex): SignedTxOutput => ({
  type: cardanoEraToSignedType[era],
  description: '',
  cborHex: signedTxCborHex,
})

const cardanoEraToWitnessType: {[key in CardanoEra]: string} = {
  [CardanoEra.BYRON]: 'TxWitnessByron',
  [CardanoEra.SHELLEY]: 'TxWitnessShelley',
  [CardanoEra.ALLEGRA]: 'TxWitness AllegraEra',
  [CardanoEra.MARY]: 'TxWitness MaryEra',
}

const constructTxWitnessOutput = (
  era: CardanoEra,
  { key, data }: _ByronWitness | _ShelleyWitness,
): WitnessOutput => ({
  type: cardanoEraToWitnessType[era],
  description: '',
  cborHex: encodeCbor([key, data]).toString('hex'),
})

const constructBIP32PathOutput = (path: BIP32Path): string => path
  .map((value) => (value >= HARDENED_THRESHOLD ? `${value - HARDENED_THRESHOLD}H` : `${value}`))
  .join('/')

const bip32PathLabel = (path: number[]): string => {
  switch (classifyPath(path)) {
    case PathTypes.PATH_POOL_COLD_KEY:
      return 'StakePool'

    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
    case PathTypes.PATH_WALLET_ACCOUNT:
    case PathTypes.PATH_INVALID:
    default:
      throw Error('not implemented')

    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
      return 'Payment'

    case PathTypes.PATH_WALLET_STAKING_KEY:
      return 'Stake'
  }
}

const verificationKeyType = (path: number[]): string => {
  const pathType = classifyPath(path)
  const isShelleyEnvelope = pathType === PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY
    || pathType === PathTypes.PATH_WALLET_STAKING_KEY
  return `${bip32PathLabel(path)}VerificationKey${isShelleyEnvelope ? 'Shelley' : ''}_ed25519`
}

const verificationKeyDescription = (path: number[]): string => {
  switch (classifyPath(path)) {
    case PathTypes.PATH_POOL_COLD_KEY:
      return 'Stake Pool Operator Verification Key'

    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
    case PathTypes.PATH_WALLET_ACCOUNT:
    case PathTypes.PATH_INVALID:
    default:
      throw Error('not implemented')

    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
      return 'Payment Verification Key'

    case PathTypes.PATH_WALLET_STAKING_KEY:
      return 'Stake Verification Key'
  }
}

const constructVerificationKeyOutput = (
  xPubKey: XPubKeyHex | XPubKeyCborHex, path: BIP32Path,
): VerificationKeyOutput => {
  const pubKey = Buffer.from(xPubKey, 'hex').slice(-64).slice(0, 32)
  return {
    type: `${verificationKeyType(path)}`,
    description: `${verificationKeyDescription(path)}`,
    cborHex: encodeCbor(pubKey).toString('hex'),
  }
}

const constructHwSigningKeyOutput = (xPubKey: XPubKeyHex, path: BIP32Path): HwSigningOutput => {
  const label = bip32PathLabel(path)
  return {
    type: `${label}HWSigningFileShelley_ed25519`,
    description: `${label} Hardware Signing File`,
    path: constructBIP32PathOutput(path),
    cborXPubKeyHex: encodeCbor(Buffer.from(xPubKey, 'hex')).toString('hex'),
  }
}

const constructSignedOpCertOutput = (signedOpCertCborHex: SignedOpCertCborHex): SignedTxOutput => ({
  type: 'NodeOperationalCertificate',
  description: '',
  cborHex: signedOpCertCborHex,
})

const constructOpCertIssueCounterOutput = (issueCounter: OpCertIssueCounter): OpCertIssueCounterOutput => ({
  type: 'NodeOperationalCertificateIssueCounter',
  description: `Next certificate issue number: ${issueCounter.counter.toString()}`,
  cborHex: encodeCbor([
    issueCounter.counter,
    issueCounter.poolColdKey,
  ]).toString('hex'),
})

export {
  write,
  writeCbor,
  constructSignedTxOutput,
  constructTxWitnessOutput,
  constructHwSigningKeyOutput,
  constructVerificationKeyOutput,
  constructSignedOpCertOutput,
  constructOpCertIssueCounterOutput,
}
