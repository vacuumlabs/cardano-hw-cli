export enum CommandType {
  KEY_GEN = 'shelley.address.key-gen',
  VERIFICATION_KEY = 'shelley.key.verification-key',
  SIGN_TRANSACTION = 'shelley.transaction.sign',
  WITNESS_TRANSACTION = 'shelley.transaction.witness',
}

export type CborHex = string

export type Path = number[]

export enum HwSigningType {
  Payment, Stake
}

export type HwSigningFileFormat = {
  type: HwSigningType
  path: string
  cborXPubKeyHex: string
}

export type TxBodyFileFormat = {
  cborHex: CborHex
}

export type ParsedKeyGenArguments = {
  command: CommandType.KEY_GEN,
  path: Path,
  hwSigningFile: string,
  verificationKeyFile: string,
}

export type ParsedVerificationKeyArguments = {
  command: CommandType.VERIFICATION_KEY,
  hwSigningFileData: HwSigningFileFormat,
  verificationKeyFile: string,
}

export type ParsedTransactionSignArguments = {
  command: CommandType.SIGN_TRANSACTION,
  mainnet: boolean,
  txBodyFileData: TxBodyFileFormat,
  hwSigningFileData: HwSigningFileFormat,
  outFile: string,
  changeOutputKeyFileData?: HwSigningFileFormat,
}

export type ParsedTransactionWitnessArguments = {
  command: CommandType.WITNESS_TRANSACTION,
  mainnet: boolean,
  txBodyFileData: TxBodyFileFormat,
  hwSigningFileData: HwSigningFileFormat,
  outFile: string,
  changeOutputKeyFileData?: HwSigningFileFormat,
}

export type ParsedArguments =
| ParsedKeyGenArguments
| ParsedVerificationKeyArguments
| ParsedTransactionSignArguments
| ParsedTransactionWitnessArguments
