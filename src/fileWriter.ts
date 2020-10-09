import { HARDENED_THRESHOLD } from './constants'
import {
  SignedTxCborHex,
  SignedTxOutput,
  TxWitnessKeys,
  WitnessOutput,
  WitnessOutputTypes,
  XPubKeyHex,
  _ByronWitness,
  _ShelleyWitness,
  // _XPubKey,
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
  JSON.stringify(data),
  'utf8',
)

function TxSignedOutput(signedTxCborHex: SignedTxCborHex): SignedTxOutput {
  return {
    type: 'TxSignedShelley',
    description: '',
    cborHex: signedTxCborHex,
  }
}

function TxWitnessOutput(
  { key, data }: _ByronWitness | _ShelleyWitness,
): WitnessOutput {
  const type = key === TxWitnessKeys.SHELLEY
    ? WitnessOutputTypes.SHELLEY
    : WitnessOutputTypes.BYRON
  return {
    type,
    description: '',
    cborHex: cbor.encode([key, data]).toString('hex'),
  }
}

function PathOutput(path: BIP32Path): string {
  return path
    .map((value) => (value >= HARDENED_THRESHOLD ? `${value - HARDENED_THRESHOLD}H` : `${value}`))
    .join('/')
}

function HwSigningKeyOutput(xPubKey: XPubKeyHex, path: BIP32Path): HwSigningOutput {
  return {
    type: `${path[3] === 0 ? 'Stake' : 'Payment'}HWSigningFileShelley_ed25519`, // TODO
    description: '',
    path: PathOutput(path),
    cborXPubKeyHex: cbor.encode(Buffer.from(xPubKey, 'hex')).toString('hex'),
  }
}

function HwVerificationKeyOutput(xPubKey: XPubKeyHex, path: BIP32Path): VerificationKeyOutput {
  const pubKey = Buffer.from(xPubKey, 'hex').slice(64).slice(0, 32) // todo
  return {
    type: `${path[3] === 0 ? 'Stake' : 'Payment'}VerificationKeyShelley_ed25519`, // TODO
    description: 'Payment Verification Key',
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
