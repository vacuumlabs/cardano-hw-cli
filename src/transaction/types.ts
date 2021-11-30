import { CborHex } from '../types'

export const enum TxWitnessKeys {
  SHELLEY = 0,
  NATIVE_SCRIPTS = 1,
  BYRON = 2,
}

export type TxWitnessByron = [
  Buffer,
  Buffer,
  Buffer,
  Buffer,
]

export type TxWitnessShelley = [
  Buffer,
  Buffer,
]

export type TxWitnesses = {
  byronWitnesses: TxWitnessByron[]
  shelleyWitnesses: TxWitnessShelley[]
}

export type RawTxCborHex = CborHex

export type TxCborHex = CborHex

export type TxWitnessCborHex = CborHex

export type _XPubKey = {
  pubKey: Buffer,
  chainCode: Buffer,
}

export type _ByronWitness = {
  key: TxWitnessKeys.BYRON,
  data: TxWitnessByron
}

export type _ShelleyWitness = {
  key: TxWitnessKeys.SHELLEY,
  data: TxWitnessShelley,
}

export type RawTxFileOutput = {
  type: string,
  description: '',
  cborHex: RawTxCborHex,
}

export type TxFileOutput = {
  type: string,
  description: '',
  cborHex: TxCborHex,
}

export type WitnessOutput = {
  type: string
  description: '',
  cborHex: TxWitnessCborHex,
}

export type VotingRegistrationMetaData = Map<number, Map<number, Buffer | BigInt>>
export type VotingRegistrationMetaDataCborHex = CborHex

export type VotingRegistrationAuxiliaryData = [VotingRegistrationMetaData, []]
