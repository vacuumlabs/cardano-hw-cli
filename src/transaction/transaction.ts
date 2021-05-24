import { deconstructUnsignedTxDecoded, parseUnsignedTx } from './txParser'
import {
  TxWitnessByron,
  TxWitnessShelley,
  _UnsignedTxDecoded,
  UnsignedTxCborHex,
  SignedTxCborHex,
  _SignedTxDecoded,
  TxWitnessKeys,
  _TxAux,
  _ShelleyWitness,
  _ByronWitness,
} from './types'
import { isUnsignedTxDecoded } from './guards'
import { Errors } from '../errors'
import { decodeCbor, encodeCbor } from '../util'

const { blake2b } = require('cardano-crypto.js')

const TxByronWitness = (
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxWitnessByron => [publicKey, signature, chaincode, encodeCbor(addressAttributes)]

const TxShelleyWitness = (publicKey: Buffer, signature: Buffer): TxWitnessShelley => [publicKey, signature]

const TxAux = (unsignedTxCborHex: UnsignedTxCborHex): _TxAux => {
  const unsignedTxDecoded = deconstructUnsignedTxDecoded(decodeCbor(unsignedTxCborHex))
  if (!isUnsignedTxDecoded(unsignedTxDecoded)) {
    throw Error(Errors.InvalidTransactionBody)
  } else {
    const parsedTx = parseUnsignedTx(unsignedTxDecoded)

    const getId = (): string => {
      const [txBody] = unsignedTxDecoded
      const encodedTxBody = encodeCbor(txBody)
      return blake2b(
        encodedTxBody,
        32,
      ).toString('hex')
    }

    return {
      getId,
      unsignedTxDecoded,
      ...parsedTx,
    }
  }
}

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
  TxAux,
  TxSigned,
  Witness,
}
