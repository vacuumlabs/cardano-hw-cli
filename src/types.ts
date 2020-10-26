import { SignedTxOutput, WitnessOutput } from './transaction/types'

export enum CommandType {
  DEVICE_VERSION = 'device.version',
  SHOW_ADDRESS = 'shelley.address.show',
  KEY_GEN = 'shelley.address.key-gen',
  VERIFICATION_KEY = 'shelley.key.verification-key',
  SIGN_TRANSACTION = 'shelley.transaction.sign',
  WITNESS_TRANSACTION = 'shelley.transaction.witness',
}

export type CborHex = string

export type BIP32Path = number[]

export enum HwSigningType {
  Payment, Stake
}

export type HwSigningData = {
  type: HwSigningType
  path: BIP32Path,
  cborXPubKeyHex: CborHex
}

export type TxBodyData = {
  cborHex: CborHex
}

export type Address = string

export type ParsedDeviceVersionArguments = {
  command: CommandType.DEVICE_VERSION,
}

export type ParsedShowAddressArguments = {
  command: CommandType.SHOW_ADDRESS,
  paymentPath: BIP32Path,
  stakingPath: BIP32Path,
  address: Address,
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

export enum NetworkIds {
  MAINNET = 1,
  TESTNET = 0,
}

export enum ProtocolMagics {
  MAINNET = 764824073,
  TESTNET = 42,
}

export type Network = {
  networkId: number,
  protocolMagic: number,
}

export type ParsedTransactionSignArguments = {
  command: CommandType.SIGN_TRANSACTION,
  network: Network,
  txBodyFileData: TxBodyData,
  hwSigningFileData: HwSigningData[],
  outFile: string,
  changeOutputKeyFileData: HwSigningData[],
}

export type ParsedTransactionWitnessArguments = {
  command: CommandType.WITNESS_TRANSACTION,
  network: Network,
  txBodyFileData: TxBodyData,
  hwSigningFileData: HwSigningData,
  outFile: string,
  changeOutputKeyFileData: HwSigningData[],
}

export type ParsedArguments =
  | ParsedDeviceVersionArguments
  | ParsedShowAddressArguments
  | ParsedKeyGenArguments
  | ParsedVerificationKeyArguments
  | ParsedTransactionSignArguments
  | ParsedTransactionWitnessArguments

export type HwSigningOutput = {
  type: string,
  description: string,
  path: string,
  cborXPubKeyHex: CborHex,
}

export type VerificationKeyOutput = {
  type: string,
  description: string,
  cborHex: CborHex,
}

export type OutputData =
  | SignedTxOutput
  | WitnessOutput
  | HwSigningOutput
  | VerificationKeyOutput
