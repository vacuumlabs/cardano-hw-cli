import {
  BIP32Path,
  CardanoEra,
  Cbor,
  CborHex,
  XPubKeyCborHex,
  XPubKeyHex,
} from './basicTypes'
import {
  cardanoEraToWitnessType,
  HARDENED_THRESHOLD,
  PathLabel,
} from './constants'
import {classifyPath, PathTypes} from './crypto-providers/util'
import {OpCertIssueCounter, SignedOpCertCborHex} from './opCert/opCert'
import {
  TxCborHex,
  TxWitnessByron,
  TxWitnessCborHex,
  TxWitnessShelley,
} from './transaction/txTypes'
import {encodeCbor} from './util'

export type TxFileOutput = {
  type: string
  description: string
  cborHex: TxCborHex
}

export type WitnessOutput = {
  type: string
  description: ''
  cborHex: TxWitnessCborHex
}

export type HwSigningOutput = {
  type: string
  description: string
  path: string
  cborXPubKeyHex: XPubKeyCborHex
}

export type VerificationKeyOutput = {
  type: string
  description: string
  cborHex: CborHex
}

// TODO maybe generalize? see also VerificationKeyOutput
export type OpCertIssueCounterOutput = {
  type: string
  description: string
  cborHex: CborHex
}

export type OutputData =
  | TxFileOutput
  | WitnessOutput
  | HwSigningOutput
  | VerificationKeyOutput
  | OpCertIssueCounterOutput

const rw = require('rw')

const writeOutputData = (path: string, data: OutputData) => {
  // eslint-disable-next-line no-console
  console.log(`Writing to file '${path}'.`)
  rw.writeFileSync(path, JSON.stringify(data, null, 4), 'utf8')
}

const writeCbor = (path: string, data: Cbor) => {
  // eslint-disable-next-line no-console
  console.log(`Writing to file '${path}'.`)
  rw.writeFileSync(path, data)
}

const constructTxFileOutput = (
  envelopeType: string,
  description: string,
  txCborHex: TxCborHex,
): TxFileOutput => ({
  type: envelopeType,
  description,
  cborHex: txCborHex,
})

const constructTxWitnessOutput = (
  era: CardanoEra,
  {key, data}: TxWitnessByron | TxWitnessShelley,
): WitnessOutput => ({
  type: cardanoEraToWitnessType[era],
  description: '',
  cborHex: encodeCbor([key, data]).toString('hex'),
})

const constructBIP32PathOutput = (path: BIP32Path): string =>
  path
    .map((value) =>
      value >= HARDENED_THRESHOLD
        ? `${value - HARDENED_THRESHOLD}H`
        : `${value}`,
    )
    .join('/')

const bip32PathLabel = (path: BIP32Path): PathLabel => {
  switch (classifyPath(path)) {
    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
    case PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG:
    case PathTypes.PATH_WALLET_MINTING_KEY:
      return PathLabel.PAYMENT

    case PathTypes.PATH_WALLET_STAKING_KEY:
    case PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG:
      return PathLabel.STAKE

    case PathTypes.PATH_DREP_KEY:
      return PathLabel.DREP

    case PathTypes.PATH_COMMITTEE_COLD_KEY:
      return PathLabel.COMMITTEE_COLD

    case PathTypes.PATH_COMMITTEE_HOT_KEY:
      return PathLabel.COMMITTEE_HOT

    case PathTypes.PATH_POOL_COLD_KEY:
      return PathLabel.POOL_COLD

    case PathTypes.PATH_CVOTE_KEY:
      return PathLabel.CIP36_VOTE

    default:
      throw Error('not implemented')
  }
}

const verificationKeyType = (path: BIP32Path): string => {
  const label = bip32PathLabel(path)
  switch (classifyPath(path)) {
    case PathTypes.PATH_DREP_KEY:
    case PathTypes.PATH_COMMITTEE_COLD_KEY:
    case PathTypes.PATH_COMMITTEE_HOT_KEY:
    case PathTypes.PATH_POOL_COLD_KEY:
    case PathTypes.PATH_CVOTE_KEY:
    case PathTypes.PATH_CVOTE_ACCOUNT:
      return `${label}VerificationKey_ed25519`

    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
      return `${label}VerificationKeyByron_ed25519_bip32`

    default:
      return `${label}VerificationKeyShelley_ed25519`
  }
}

const verificationKeyDescription = (path: BIP32Path): string => {
  switch (classifyPath(path)) {
    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
      return 'Hardware Payment Verification Key'

    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
      return 'Hardware Payment Verification Key'

    case PathTypes.PATH_WALLET_STAKING_KEY:
      return 'Hardware Stake Verification Key'

    case PathTypes.PATH_DREP_KEY:
      return 'Hardware Delegate Representative Verification Key'

    case PathTypes.PATH_COMMITTEE_COLD_KEY:
      return 'Hardware Constitutional Committee Cold Verification Key'

    case PathTypes.PATH_COMMITTEE_HOT_KEY:
      return 'Hardware Constitutional Committee Hot Verification Key'

    case PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG:
      return 'Hardware Script Payment Verification Key'

    case PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG:
      return 'Hardware Script Stake Verification Key'

    case PathTypes.PATH_WALLET_MINTING_KEY:
      return 'Hardware Mint Verification Key'

    case PathTypes.PATH_POOL_COLD_KEY:
      return 'Hardware Stake Pool Operator Verification Key'

    case PathTypes.PATH_CVOTE_KEY:
      return 'Hardware CIP36 Vote Verification Key'

    case PathTypes.PATH_WALLET_ACCOUNT:
    case PathTypes.PATH_WALLET_ACCOUNT_MULTISIG:
    case PathTypes.PATH_CVOTE_ACCOUNT:
    case PathTypes.PATH_INVALID:
    default:
      throw Error('not implemented')
  }
}

const constructVerificationKeyOutput = (
  xPubKey: XPubKeyHex | XPubKeyCborHex,
  path: BIP32Path,
): VerificationKeyOutput => {
  const pubKey = Buffer.from(xPubKey, 'hex').subarray(-64).subarray(0, 32)
  return {
    type: `${verificationKeyType(path)}`,
    description: `${verificationKeyDescription(path)}`,
    cborHex: encodeCbor(pubKey).toString('hex'),
  }
}

const getHwSigningFileType = (
  label: PathLabel,
  pathType: PathTypes,
): string => {
  switch (pathType) {
    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
      return `${label}HWSigningFileByron_ed25519_bip32`

    case PathTypes.PATH_DREP_KEY:
    case PathTypes.PATH_COMMITTEE_COLD_KEY:
    case PathTypes.PATH_COMMITTEE_HOT_KEY:
    case PathTypes.PATH_POOL_COLD_KEY:
    case PathTypes.PATH_CVOTE_ACCOUNT:
    case PathTypes.PATH_CVOTE_KEY:
      return `${label}HWSigningFile_ed25519`

    default:
      return `${label}HWSigningFileShelley_ed25519`
  }
}

const hwsfileDescription = (path: BIP32Path): string => {
  switch (classifyPath(path)) {
    case PathTypes.PATH_WALLET_SPENDING_KEY_BYRON:
    case PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY:
      return 'Payment Hardware Signing File'

    case PathTypes.PATH_WALLET_STAKING_KEY:
      return 'Stake Hardware Signing File'

    case PathTypes.PATH_DREP_KEY:
      return 'Hardware Delegate Representative Signing File'

    case PathTypes.PATH_COMMITTEE_COLD_KEY:
      return 'Hardware Constitutional Committee Cold Signing File'

    case PathTypes.PATH_COMMITTEE_HOT_KEY:
      return 'Hardware Constitutional Committee Hot Signing File'

    case PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG:
      return 'Script Payment Hardware Signing File'

    case PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG:
      return 'Script Stake Hardware Signing File'

    case PathTypes.PATH_WALLET_MINTING_KEY:
      return 'Mint Hardware Signing File'

    case PathTypes.PATH_POOL_COLD_KEY:
      return 'Stake Pool Hardware Signing File'

    case PathTypes.PATH_CVOTE_KEY:
      return 'CIP36 Vote Hardware Signing File'

    case PathTypes.PATH_WALLET_ACCOUNT:
    case PathTypes.PATH_WALLET_ACCOUNT_MULTISIG:
    case PathTypes.PATH_CVOTE_ACCOUNT:
    case PathTypes.PATH_INVALID:
    default:
      throw Error('not implemented')
  }
}

const constructHwSigningKeyOutput = (
  xPubKey: XPubKeyHex,
  path: BIP32Path,
): HwSigningOutput => {
  const label = bip32PathLabel(path)

  return {
    type: getHwSigningFileType(label, classifyPath(path)),
    description: hwsfileDescription(path),
    path: constructBIP32PathOutput(path),
    cborXPubKeyHex: encodeCbor(Buffer.from(xPubKey, 'hex')).toString('hex'),
  }
}

const constructSignedOpCertOutput = (
  signedOpCertCborHex: SignedOpCertCborHex,
): TxFileOutput => ({
  type: 'NodeOperationalCertificate',
  description: '',
  cborHex: signedOpCertCborHex,
})

const constructOpCertIssueCounterOutput = (
  issueCounter: OpCertIssueCounter,
): OpCertIssueCounterOutput => ({
  type: 'NodeOperationalCertificateIssueCounter',
  description: `Next certificate issue number: ${issueCounter.counter.toString()}`,
  cborHex: encodeCbor([
    issueCounter.counter,
    issueCounter.poolColdKey,
  ]).toString('hex'),
})

export {
  writeOutputData,
  writeCbor,
  constructTxFileOutput,
  constructTxWitnessOutput,
  getHwSigningFileType,
  constructHwSigningKeyOutput,
  constructVerificationKeyOutput,
  constructSignedOpCertOutput,
  constructOpCertIssueCounterOutput,
}
