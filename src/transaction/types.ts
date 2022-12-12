import { BIP32Path, CborHex } from '../types'

export const enum TxWitnessKeys {
  SHELLEY = 0,
  NATIVE_SCRIPTS = 1,
  BYRON = 2,
  PLUTUS_SCRIPTS = 3,
  PLUTUS_DATA = 4,
  REDEEMERS = 5,
}

export type TxWitnessByronData = [
  Buffer, // public key
  Buffer, // signature
  Buffer, // chain code
  Buffer, // address attributes
]

export type TxWitnessShelleyData = [
  Buffer, // public key
  Buffer, // signature
]

export type TxWitnessByron = {
  key: TxWitnessKeys.BYRON,
  data: TxWitnessByronData,
  path: BIP32Path,
}

export type TxWitnessShelley = {
  key: TxWitnessKeys.SHELLEY,
  data: TxWitnessShelleyData,
  path: BIP32Path,
}

export type TxWitnesses = {
  byronWitnesses: TxWitnessByron[]
  shelleyWitnesses: TxWitnessShelley[]
}

export type TxCborHex = CborHex

export type TxWitnessCborHex = CborHex

export type _XPubKey = {
  pubKey: Buffer,
  chainCode: Buffer,
}

export type TxFileOutput = {
  type: string,
  description: string,
  cborHex: TxCborHex,
}

export type WitnessOutput = {
  type: string
  description: '',
  cborHex: TxWitnessCborHex,
}

export type VotingRegistrationMetaDataPayloadItem = [Buffer, BigInt][] | Buffer | BigInt
export type VotingRegistrationMetaData = Map<number, Map<number, VotingRegistrationMetaDataPayloadItem>>
export type VotingRegistrationMetaDataCborHex = CborHex

export type VotingRegistrationAuxiliaryData = [VotingRegistrationMetaData, []]
