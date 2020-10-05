import {
  SignedTxCborHex, TxWitnessByron, TxWitnessShelley, TxWitnessKeys,
} from './transaction/types'

const cbor = require('borc')

function TxSignedOutput(signedTxCborHex: SignedTxCborHex) {
  return {
    type: 'TxSignedShelley',
    description: '',
    cborHex: signedTxCborHex,
  }
}

function TxWitnessOutput(txWitness: TxWitnessByron | TxWitnessShelley, witnessType: TxWitnessKeys) {
  const type = witnessType === TxWitnessKeys.SHELLEY ? 'TxWitnessShelley' : 'TxWitnessByron'
  return {
    type,
    description: '',
    cborHex: cbor.encode([type, txWitness]).toString('hex'),
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
  TxSignedOutput,
  TxWitnessOutput,
  HwSigningKeyOutput,
}
