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

export type SignedTxCborHex = CborHex

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

export type WitnessOutput = {
  type: string
  description: '',
  cborHex: TxWitnessCborHex,
}

export type SignedTxOutput = {
  type: string,
  description: '',
  cborHex: SignedTxCborHex,
}

export type VotingRegistrationMetaData = Map<number, Map<number, Buffer | BigInt>>
export type VotingRegistrationMetaDataCborHex = CborHex

export type VotingRegistrationAuxiliaryData = [VotingRegistrationMetaData, []]
