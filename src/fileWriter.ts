import {
  SignedTxCborHex,
  SignedTxOutput,
  TxWitnessKeys,
  WitnessOutput,
  WitnessOutputTypes,
  _ByronWitness,
  _ShelleyWitness,
} from './transaction/types'
import { OutputData } from './types'

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

function HwSigningKeyOutput(xpub: Buffer, path: any) {
  return {
    type: 'PaymentHWSigningFileShelley_ed25519',
    description: '',
    path,
    cborXPubKeyHex: cbor.encode(xpub).toString('hex'),
  }
}

export {
  write,
  TxSignedOutput,
  TxWitnessOutput,
  HwSigningKeyOutput,
}
