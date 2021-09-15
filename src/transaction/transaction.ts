import { isEqual, uniqWith } from 'lodash'
import {
  TxWitnessByron,
  TxWitnessShelley,
  _UnsignedTxDecoded,
  SignedTxCborHex,
  TxWitnessKeys,
} from './types'
import { encodeCbor } from '../util'

const TxByronWitness = (
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxWitnessByron => [publicKey, signature, chaincode, encodeCbor(addressAttributes)]

const TxShelleyWitness = (publicKey: Buffer, signature: Buffer): TxWitnessShelley => [publicKey, signature]

const TxSigned = (
  unsignedTxDecoded: _UnsignedTxDecoded,
  byronWitnesses: TxWitnessByron[],
  shelleyWitnesses: TxWitnessShelley[],
): SignedTxCborHex => {
  const { txBody, nativeScriptWitnesses, meta } = unsignedTxDecoded
  const witnesses = new Map()
  if (shelleyWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.SHELLEY, shelleyWitnesses)
  }
  if (nativeScriptWitnesses && nativeScriptWitnesses.length > 0) {
    // cardano-cli deduplicates the script witnesses before adding them to the signed transaction
    witnesses.set(TxWitnessKeys.NATIVE_SCRIPTS, uniqWith(nativeScriptWitnesses, isEqual))
  }
  if (byronWitnesses.length > 0) {
    witnesses.set(TxWitnessKeys.BYRON, byronWitnesses)
  }
  return encodeCbor([txBody, witnesses, meta]).toString('hex')
}

export {
  TxByronWitness,
  TxShelleyWitness,
  TxSigned,
}
