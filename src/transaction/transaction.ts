import { isEqual, uniqWith } from 'lodash'
import { encodeTx, RawTransaction } from 'cardano-hw-interop-lib'
import {
  TxWitnessByron,
  TxWitnessShelley,
  TxCborHex,
  TxWitnessKeys,
} from './types'
import { encodeCbor } from '../util'

const TxByronWitness = (
  publicKey: Buffer, signature: Buffer, chaincode: Buffer, addressAttributes: object,
): TxWitnessByron => [publicKey, signature, chaincode, encodeCbor(addressAttributes)]

const TxShelleyWitness = (publicKey: Buffer, signature: Buffer): TxWitnessShelley => [publicKey, signature]

const TxSigned = (
  rawTx: RawTransaction,
  byronWitnesses: TxWitnessByron[],
  shelleyWitnesses: TxWitnessShelley[],
): TxCborHex => {
  const { body, nativeScriptWitnesses, auxiliaryData } = rawTx
  const nativeScriptWitnessList = nativeScriptWitnesses as any[] | undefined
  const witnessSet = new Map()
  if (shelleyWitnesses.length > 0) {
    witnessSet.set(TxWitnessKeys.SHELLEY, shelleyWitnesses)
  }
  if (nativeScriptWitnessList?.length) {
    // cardano-cli deduplicates the script witnesses before adding them to the signed transaction
    witnessSet.set(TxWitnessKeys.NATIVE_SCRIPTS, uniqWith(nativeScriptWitnessList, isEqual))
  }
  if (byronWitnesses.length > 0) {
    witnessSet.set(TxWitnessKeys.BYRON, byronWitnesses)
  }
  return encodeTx({ body, witnessSet, auxiliaryData }).toString('hex') as TxCborHex
}

export {
  TxByronWitness,
  TxShelleyWitness,
  TxSigned,
}
