import * as InteropLib from 'cardano-hw-interop-lib'
import { cloneDeep } from 'lodash'
import {
  TxWitnessByronData,
  TxWitnessShelleyData,
  TxWitnessKeys,
} from './types'
import { encodeCbor } from '../util'

type WitnessSet = Map<number, unknown[]>

// If witnessSet is empty, the CBOR lib parses it as {}, otherwise it seems to always return a Map.
// Let's convert it to Map in any case, just to make sure.
const _parseWitnessSet = (witnessSet: unknown): WitnessSet => {
  const clonedWitnessSet = cloneDeep(witnessSet)
  return (clonedWitnessSet instanceof Map)
    ? clonedWitnessSet
    : new Map(Object.entries(clonedWitnessSet as object)) as unknown as WitnessSet
}

const TxByronWitnessData = (
  publicKey: Buffer,
  signature: Buffer,
  chaincode: Buffer,
  addressAttributes: object,
): TxWitnessByronData => [publicKey, signature, chaincode, encodeCbor(addressAttributes)]

const TxShelleyWitnessData = (
  publicKey: Buffer,
  signature: Buffer,
): TxWitnessShelleyData => [publicKey, signature]

export const containsVKeyWitnesses = (tx: InteropLib.Transaction): boolean => {
  const witnessSet = _parseWitnessSet(tx.witnessSet)
  const shelleyWitnesses = witnessSet.get(TxWitnessKeys.SHELLEY) ?? []
  const byronWitnesses = witnessSet.get(TxWitnessKeys.BYRON) ?? []
  return [...shelleyWitnesses, ...byronWitnesses].length > 0
}

export {
  TxByronWitnessData,
  TxShelleyWitnessData,
}
