import { SignedTxOutput, WitnessOutput } from './transaction/types'

export enum CommandType {
  APP_VERSION = 'version',
  DEVICE_VERSION = 'device.version',
  SHOW_ADDRESS = 'address.show',
  KEY_GEN = 'address.key-gen',
  VERIFICATION_KEY = 'key.verification-key',
  SIGN_TRANSACTION = 'transaction.sign',
  WITNESS_TRANSACTION = 'transaction.witness',
}

export enum CardanoEra {
  BYRON = 'Byron',
  SHELLEY = 'Shelley',
  ALLEGRA = 'Allegra',
  MARY = 'Mary',
}

export type CborHex = string

export type BIP32Path = number[]

export enum HwSigningType {
  Payment, Stake, PoolCold
}

export type HwSigningData = {
  type: HwSigningType
  path: BIP32Path,
  cborXPubKeyHex: CborHex
}

export type TxBodyData = {
  era: CardanoEra,
  cborHex: CborHex
}

export type Address = string

export type ParsedAppVersionArguments = {
  command: CommandType.APP_VERSION,
}

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
  paths: BIP32Path[],
  hwSigningFiles: string[],
  verificationKeyFiles: string[],
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
  hwSigningFileData: HwSigningData[],
  outFile: string,
  changeOutputKeyFileData: HwSigningData[],
}

export type ParsedArguments =
  | ParsedAppVersionArguments
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
