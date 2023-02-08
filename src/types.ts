import { CommandType } from './command-parser/commandParser'
import { KesVKey } from './opCert/opCert'
import { Address, BIP32Path, DerivationType, HwSigningData, NativeScript, Network, TxFileData, VotePublicKeyHex } from './basicTypes'

export type ParsedAppVersionArguments = {
  command: CommandType.APP_VERSION,
}

export type ParsedDeviceVersionArguments = {
  command: CommandType.DEVICE_VERSION,
}

// exactly one of paymentPath vs. paymentScriptHash and stakingPath vs. stakingScriptHash
// should be present (the result of parse() complies with this)
export type ParsedShowAddressArguments = {
  command: CommandType.SHOW_ADDRESS,
  paymentPath: BIP32Path,
  paymentScriptHash: string,
  stakingPath: BIP32Path,
  stakingScriptHash: string,
  address: Address,
  derivationType?: DerivationType,
}

export type ParsedAddressKeyGenArguments = {
  command: CommandType.ADDRESS_KEY_GEN,
  paths: BIP32Path[],
  hwSigningFiles: string[],
  verificationKeyFiles: string[],
  derivationType?: DerivationType,
}

export type ParsedVerificationKeyArguments = {
  command: CommandType.VERIFICATION_KEY,
  hwSigningFileData: HwSigningData,
  verificationKeyFile: string,
}

export type ParsedTransactionPolicyIdArguments = {
  command: CommandType.DERIVE_NATIVE_SCRIPT_HASH,
  nativeScript: NativeScript,
  hwSigningFileData: HwSigningData[],
  derivationType?: DerivationType,
}

export type ParsedTransactionWitnessArguments = {
  command: CommandType.WITNESS_TRANSACTION,
  network: Network,
  txFileData: TxFileData,
  hwSigningFileData: HwSigningData[],
  outFiles: string[],
  changeOutputKeyFileData: HwSigningData[],
  derivationType?: DerivationType,
}

export type ParsedTransactionValidateArguments = {
  command: CommandType.VALIDATE_TRANSACTION,
  txFileData: TxFileData,
}

export type ParsedTransactionTransformArguments = {
  command: CommandType.TRANSFORM_TRANSACTION,
  txFileData: TxFileData,
  outFile: string,
}

export type ParsedOpCertArguments = {
  command: CommandType.SIGN_OPERATIONAL_CERTIFICATE,
  kesVKey: KesVKey,
  kesPeriod: bigint,
  issueCounterFile: string,
  hwSigningFileData: HwSigningData[],
  outFile: string,
}

export type ParsedNodeKeyGenArguments = {
  command: CommandType.NODE_KEY_GEN,
  paths: BIP32Path[],
  verificationKeyFiles: string[],
  hwSigningFiles: string[],
  issueCounterFiles: string[],
}

export type ParsedCIP36RegistrationMetadataArguments = {
  command: CommandType.CIP36_REGISTRATION_METADATA,
  votePublicKeys: VotePublicKeyHex[],
  voteWeights: bigint[],
  hwStakeSigningFileData: HwSigningData,
  paymentAddress: string,
  nonce: bigint,
  votingPurpose: bigint,
  network: Network,
  paymentAddressSigningKeyData: HwSigningData[],
  outFile: string,
  derivationType?: DerivationType,
}

export type ParsedArguments =
  | ParsedAppVersionArguments
  | ParsedDeviceVersionArguments
  | ParsedShowAddressArguments
  | ParsedAddressKeyGenArguments
  | ParsedVerificationKeyArguments
  | ParsedTransactionPolicyIdArguments
  | ParsedTransactionWitnessArguments
  | ParsedTransactionValidateArguments
  | ParsedTransactionTransformArguments
  | ParsedNodeKeyGenArguments
  | ParsedOpCertArguments
  | ParsedCIP36RegistrationMetadataArguments

