import * as InteropLib from 'cardano-hw-interop-lib'
import { isEqual, uniqWith, cloneDeep } from 'lodash'
import {
  TxWitnessByronData,
  TxWitnessShelleyData,
  TxCborHex,
  TxWitnessKeys,
  TxWitnesses,
} from './types'
import { encodeCbor } from '../util'
import { CardanoEra } from '../types'
import { SigningParameters } from '../crypto-providers/types'

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

const _rawTxToTxSigned = (
  params: SigningParameters,
  witnesses: TxWitnesses,
): TxCborHex => {
  const {
    body, scriptWitnesses, datumWitnesses, redeemerWitnesses, scriptValidity, auxiliaryData,
  } = params.rawTx!

  // cardano-cli deduplicates the script witnesses before adding them to the signed transaction
  const scriptWitnessList = uniqWith((scriptWitnesses || []) as any[], isEqual)
  const datumWitnessList = (datumWitnesses || []) as any[]
  const redeemerWitnessList = (redeemerWitnesses || []) as any[]

  let nativeScriptWitnessList: unknown[] = []
  let plutusScriptWitnessList: unknown[] = []
  if (params.era === CardanoEra.ALONZO) {
    // In alonzo era txs, each native script is packed in a list with 0 literal, each plutus script
    // is packed in a list with 1 literal and they are all stored in scriptWitnessList.
    // We need to partition them back and unpack the actual scripts.
    nativeScriptWitnessList = scriptWitnessList.filter((s) => s[0] === 0).map((s) => s[1])
    plutusScriptWitnessList = scriptWitnessList.filter((s) => s[0] === 1).map((s) => s[1])
  } else {
    // In older txs, scriptWitnessList is just a list of native scripts.
    nativeScriptWitnessList = scriptWitnessList
  }

  const witnessSet: WitnessSet = new Map()

  const shelleyWitnessList = witnesses.shelleyWitnesses.map((w) => w.data)
  if (shelleyWitnessList.length > 0) {
    witnessSet.set(TxWitnessKeys.SHELLEY, shelleyWitnessList)
  }

  const byronWitnessList = witnesses.byronWitnesses.map((w) => w.data)
  if (byronWitnessList.length > 0) {
    witnessSet.set(TxWitnessKeys.BYRON, byronWitnessList)
  }

  if (nativeScriptWitnessList.length > 0) {
    witnessSet.set(TxWitnessKeys.NATIVE_SCRIPTS, nativeScriptWitnessList)
  }

  if (plutusScriptWitnessList.length > 0) {
    witnessSet.set(TxWitnessKeys.PLUTUS_SCRIPTS, plutusScriptWitnessList)
  }

  if (datumWitnessList.length > 0) {
    witnessSet.set(TxWitnessKeys.PLUTUS_DATA, datumWitnessList)
  }

  if (redeemerWitnessList.length > 0) {
    witnessSet.set(TxWitnessKeys.REDEEMERS, redeemerWitnessList)
  }

  const signedTx = {
    body, witnessSet, scriptValidity, auxiliaryData,
  }
  return InteropLib.encodeTx(signedTx).toString('hex') as TxCborHex
}

const TxSigned = (
  params: SigningParameters,
  witnesses: TxWitnesses,
): TxCborHex => {
  if (params.rawTx) {
    return _rawTxToTxSigned(params, witnesses)
  }

  // we only add witnesses created by the HW wallet, all other witnesses stay the same
  const witnessSet = _parseWitnessSet(params.tx!.witnessSet)

  const shelleyWitnessesList = [
    ...(witnessSet.get(TxWitnessKeys.SHELLEY) ?? []),
    ...witnesses.shelleyWitnesses.map((w) => w.data),
  ]
  if (shelleyWitnessesList.length > 0) {
    // cardano-cli deduplicates the witnesses before adding them to the signed transaction
    witnessSet.set(TxWitnessKeys.SHELLEY, uniqWith(shelleyWitnessesList, isEqual))
  }

  const byronWitnessesList = [
    ...witnessSet.get(TxWitnessKeys.BYRON) ?? [],
    ...witnesses.byronWitnesses.map((w) => w.data),
  ]
  if (byronWitnessesList.length > 0) {
    // cardano-cli deduplicates the witnesses before adding them to the signed transaction
    witnessSet.set(TxWitnessKeys.BYRON, uniqWith(byronWitnessesList, isEqual))
  }

  const signedTx = { ...params.tx!, witnessSet }
  return InteropLib.encodeTx(signedTx).toString('hex') as TxCborHex
}

export const containsVKeyWitnesses = (tx: InteropLib.Transaction): boolean => {
  const witnessSet = _parseWitnessSet(tx.witnessSet)
  const shelleyWitnesses = witnessSet.get(TxWitnessKeys.SHELLEY) ?? []
  const byronWitnesses = witnessSet.get(TxWitnessKeys.BYRON) ?? []
  return [...shelleyWitnesses, ...byronWitnesses].length > 0
}

export {
  TxByronWitnessData,
  TxShelleyWitnessData,
  TxSigned,
}
