import {
  TxWitnessByron,
  TxWitnessShelley,
  _UnsignedTxDecoded,
  SignedTxCborHex,
  _SignedTxDecoded,
  TxWitnessKeys,
  _ShelleyWitness,
  _ByronWitness,
} from './types'
import { decodeCbor, encodeCbor } from '../util'

const TxByronWitness = (
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxWitnessByron => [publicKey, signature, chaincode, encodeCbor(addressAttributes)]

const TxShelleyWitness = (publicKey: Buffer, signature: Buffer): TxWitnessShelley => [publicKey, signature]

const TxSigned = (
  unsignedTxDecoded: _UnsignedTxDecoded,
  byronWitnesses: TxWitnessByron[],
  shelleyWitnesses: TxWitnessShelley[],
): SignedTxCborHex => {
  const [txBody, meta] = unsignedTxDecoded
  const witnesses = new Map()
  if (shelleyWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.SHELLEY, shelleyWitnesses)
  }
  if (byronWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.BYRON, byronWitnesses)
  }
  return encodeCbor([txBody, witnesses, meta]).toString('hex')
}

const Witness = (signedTxCborHex: SignedTxCborHex): Array<_ShelleyWitness | _ByronWitness> => {
  const [, witnesses]: _SignedTxDecoded = decodeCbor(signedTxCborHex)

  return Array.from(witnesses).map((witness) => {
    const [key, [data]] = witness
    return {
      key,
      data,
    } as _ShelleyWitness | _ByronWitness
  })
}

export {
  TxByronWitness,
  TxShelleyWitness,
  TxSigned,
  Witness,
}
