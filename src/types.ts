import { SignedTxOutput, WitnessOutput } from './transaction/types'

export enum CommandType {
  KEY_GEN = 'shelley.address.key-gen',
  VERIFICATION_KEY = 'shelley.key.verification-key',
  SIGN_TRANSACTION = 'shelley.transaction.sign',
  WITNESS_TRANSACTION = 'shelley.transaction.witness',
}

export type CborHex = string

export type BIP32Path = [
  number,
  number,
  number,
  number,
  number,
]

export enum HwSigningType {
  Payment, Stake
}

export type HwSigningData = {
  type: HwSigningType
  path: BIP32Path,
  cborXPubKeyHex: string
}

export type TxBodyData = {
  cborHex: CborHex
}

export type ParsedKeyGenArguments = {
  command: CommandType.KEY_GEN,
  path: BIP32Path,
  hwSigningFile: string,
  verificationKeyFile: string,
}

export type ParsedVerificationKeyArguments = {
  command: CommandType.VERIFICATION_KEY,
  hwSigningFileData: HwSigningData,
  verificationKeyFile: string,
}

const enum Networks {
  'MAINNET',
  'TESTNET',
}

export type Network = {
  name: string,
  networkId: number,
  protocolMagic: number,
}

export type ParsedTransactionSignArguments = {
  command: CommandType.SIGN_TRANSACTION,
  network: Networks,
  txBodyFileData: TxBodyData,
  hwSigningFileData: HwSigningData[],
  outFile: string,
  changeOutputKeyFileData?: HwSigningData[],
}

export type ParsedTransactionWitnessArguments = {
  command: CommandType.WITNESS_TRANSACTION,
  network: Networks,
  txBodyFileData: TxBodyData,
  hwSigningFileData: HwSigningData,
  outFile: string,
  changeOutputKeyFileData?: HwSigningData[],
}

export type ParsedArguments =
  | ParsedKeyGenArguments
  | ParsedVerificationKeyArguments
  | ParsedTransactionSignArguments
  | ParsedTransactionWitnessArguments

export type HwSigningOutput = {
  type: string,
  description: string,
  path: string,
  cborXPubKeyHex: string,
}

export type VerificationKeyOutput = {
  type: string,
  description: string,
  cborHex: string, // TODO
}

export type OutputData =
  | SignedTxOutput
  | WitnessOutput
  | HwSigningOutput
  | VerificationKeyOutput
