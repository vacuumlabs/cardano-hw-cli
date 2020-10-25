import { HARDENED_THRESHOLD } from './constants'
import { isStakingPath } from './crypto-providers/util'
import {
  SignedTxCborHex,
  SignedTxOutput,
  TxWitnessKeys,
  WitnessOutput,
  XPubKeyHex,
  _ByronWitness,
  _ShelleyWitness,
} from './transaction/types'
import {
  BIP32Path,
  HwSigningOutput,
  OutputData,
  VerificationKeyOutput,
} from './types'

const fs = require('fs')
const cbor = require('borc')

const write = (path: string, data: OutputData) => fs.writeFileSync(
  path,
  JSON.stringify(data, null, 4),
  'utf8',
)

const TxSignedOutput = (signedTxCborHex: SignedTxCborHex): SignedTxOutput => ({
  type: 'TxSignedShelley',
  description: '',
  cborHex: signedTxCborHex,
})

const TxWitnessOutput = (
  { key, data }: _ByronWitness | _ShelleyWitness,
): WitnessOutput => {
  const witnessTypes: {[key: number]: string} = {
    [TxWitnessKeys.SHELLEY]: 'TxWitnessShelley',
    [TxWitnessKeys.BYRON]: 'TxWitnessByron',
  }
  return {
    type: witnessTypes[key],
    description: '',
    cborHex: cbor.encode([key, data]).toString('hex'),
  }
}

const PathOutput = (path: BIP32Path): string => path
  .map((value) => (value >= HARDENED_THRESHOLD ? `${value - HARDENED_THRESHOLD}H` : `${value}`))
  .join('/')

const HwSigningKeyOutput = (xPubKey: XPubKeyHex, path: BIP32Path): HwSigningOutput => {
  const type = isStakingPath(path) ? 'Stake' : 'Payment'
  return {
    type: `${type}HWSigningFileShelley_ed25519`,
    description: `${type} Hardware Signing File`,
    path: PathOutput(path),
    cborXPubKeyHex: cbor.encode(Buffer.from(xPubKey, 'hex')).toString('hex'),
  }
}

const HwVerificationKeyOutput = (xPubKey: XPubKeyHex, path: BIP32Path): VerificationKeyOutput => {
  // to get pub key also from cbor encoded xpub
  const pubKey = Buffer.from(xPubKey, 'hex').slice(-64).slice(0, 32)
  const type = isStakingPath(path) ? 'Stake' : 'Payment'
  return {
    type: `${type}VerificationKeyShelley_ed25519`,
    description: `${type} Verification Key`,
    cborHex: cbor.encode(pubKey).toString('hex'),
  }
}

export {
  write,
  TxSignedOutput,
  TxWitnessOutput,
  HwSigningKeyOutput,
  HwVerificationKeyOutput,
}
