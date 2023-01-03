import { RawTxFileOutput, TxFileOutput, WitnessOutput } from './transaction/types'
import { CommandType } from './command-parser/commandParser'
import { KesVKey } from './opCert/opCert'

export type HexString = string & { __type: 'hex' }
export type FixlenHexString<N> = string & { __type: 'hex', __length: N }

export const PUB_KEY_HEX_LENGTH = 32
export type PubKeyHex = FixlenHexString<typeof PUB_KEY_HEX_LENGTH>

export const VERIFICATION_KEY_CBOR_HEX_LENGTH = 34
export type PubKeyCborHex = FixlenHexString<typeof VERIFICATION_KEY_CBOR_HEX_LENGTH>

export const CHAIN_CODE_HEX_LENGTH = 32
export type ChainCodeHex = FixlenHexString<typeof CHAIN_CODE_HEX_LENGTH>

export const X_PUB_KEY_HEX_LENGTH = 64
export type XPubKeyHex = FixlenHexString<typeof X_PUB_KEY_HEX_LENGTH>

export const X_PUB_KEY_CBOR_HEX_LENGTH = 66
export type XPubKeyCborHex = FixlenHexString<typeof X_PUB_KEY_CBOR_HEX_LENGTH>

export const VOTE_PUBLIC_KEY_HEX_LENGTH = 32
export type VotePublicKeyHex = FixlenHexString<typeof VOTE_PUBLIC_KEY_HEX_LENGTH>

export const NATIVE_SCRIPT_HASH_HEX_LENGTH = 28
export type NativeScriptHashKeyHex = FixlenHexString<typeof NATIVE_SCRIPT_HASH_HEX_LENGTH>

export enum CardanoEra {
  BYRON = 'Byron',
  SHELLEY = 'Shelley',
  ALLEGRA = 'Allegra',
  MARY = 'Mary',
  ALONZO = 'Alonzo',
  BABBAGE = 'Babbage'
}

export type CborHex = string & {
  __type: 'cborHex';
}

export type BIP32Path = number[] & { __type: 'bip32path' }

export enum HwSigningType {
  Payment, Stake, PoolCold, Mint, MultiSig
}

export type HwSigningData = {
  type: HwSigningType
  path: BIP32Path,
  cborXPubKeyHex: XPubKeyCborHex
}

export type RawTxFileData = {
  era: CardanoEra,
  description: string,
  cborHex: CborHex,
}

export type TxFileData = {
  envelopeType: string,
  era: CardanoEra,
  description: string,
  cborHex: CborHex,
}

export type Address = string

/* eslint-disable max-len */
// Currently, this is used only by Trezor. Relevant docs:
// https://github.com/trezor/trezor-suite/blob/1a0125c9e1d738f5750f935f1aed4d17a37e69ba/docs/packages/connect/methods/cardanoSignTransaction.md#params
// https://github.com/trezor/trezor-firmware/blob/4bed278e80d23077676128eba8cb2478fcd31120/core/src/apps/cardano/README.md#seed-derivation-schemes
/* eslint-enable max-len */
export enum DerivationType {
  LEDGER = 'LEDGER',
  ICARUS = 'ICARUS',
  ICARUS_TREZOR = 'ICARUS_TREZOR',
}

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

export type ParsedPubkeyQueryArguments = {
  command: CommandType.PUBKEY_QUERY,
  paths: BIP32Path[],
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

export enum NetworkIds {
  MAINNET = 1,
  TESTNET = 0,
}

export enum ProtocolMagics {
  MAINNET = 764824073,
  TESTNET = 1097911063,
  TESTNET_LEGACY = 42, // we keep this because some test CBORs contain this magic
}

export type Network = {
  networkId: number,
  protocolMagic: number,
}

// exctly one of rawTxFileData vs. txFileData should be present
// (the result of parse() complies with this)
export type ParsedTransactionSignArguments = {
  command: CommandType.SIGN_TRANSACTION,
  network: Network,
  rawTxFileData?: RawTxFileData,
  txFileData?: TxFileData,
  hwSigningFileData: HwSigningData[],
  outFile: string,
  changeOutputKeyFileData: HwSigningData[],
  derivationType?: DerivationType,
}

export enum NativeScriptType {
  PUBKEY,
  ALL,
  ANY,
  N_OF_K,
  INVALID_BEFORE,
  INVALID_HEREAFTER,
}

export type NativeScript = {
  type: NativeScriptType.PUBKEY,
  keyHash: string,
} | {
  type: NativeScriptType.ALL | NativeScriptType.ANY,
  scripts: NativeScript[],
} | {
  type: NativeScriptType.N_OF_K,
  required: bigint,
  scripts: NativeScript[],
} | {
  type: NativeScriptType.INVALID_BEFORE | NativeScriptType.INVALID_HEREAFTER,
  slot: bigint,
}

export enum NativeScriptDisplayFormat {
  BECH32,
  POLICY_ID,
}

export type ParsedTransactionPolicyIdArguments = {
  command: CommandType.DERIVE_NATIVE_SCRIPT_HASH,
  nativeScript: NativeScript,
  hwSigningFileData: HwSigningData[],
  derivationType?: DerivationType,
}

// exctly one of rawTxFileData vs. txFileData should be present
// (the result of parse() complies with this)
export type ParsedTransactionWitnessArguments = {
  command: CommandType.WITNESS_TRANSACTION,
  network: Network,
  rawTxFileData?: RawTxFileData,
  txFileData?: TxFileData,
  hwSigningFileData: HwSigningData[],
  outFiles: string[],
  changeOutputKeyFileData: HwSigningData[],
  derivationType?: DerivationType,
}

export type ParsedTransactionValidateRawArguments = {
  command: CommandType.VALIDATE_RAW_TRANSACTION,
  rawTxFileData: RawTxFileData,
}

export type ParsedTransactionValidateArguments = {
  command: CommandType.VALIDATE_TRANSACTION,
  txFileData: TxFileData,
}

export type ParsedTransactionTransformRawArguments = {
  command: CommandType.TRANSFORM_RAW_TRANSACTION,
  rawTxFileData: RawTxFileData,
  outFile: string,
}

export type ParsedTransactionTransformArguments = {
  command: CommandType.TRANSFORM_TRANSACTION,
  txFileData: TxFileData,
  outFile: string,
}

export type ParsedOpCertArguments = {
  command: CommandType.SIGN_OPERATIONAL_CERTIFICATE,
  kesVKey: KesVKey,
  kesPeriod: BigInt,
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

export type ParsedCatalystVotingKeyRegistrationMetadataArguments = {
  command: CommandType.CATALYST_VOTING_KEY_REGISTRATION_METADATA,
  network: Network,
  votePublicKey: VotePublicKeyHex,
  hwStakeSigningFileData: HwSigningData,
  rewardAddress: string,
  nonce: BigInt,
  rewardAddressSigningKeyData: HwSigningData[],
  outFile: string,
  derivationType?: DerivationType,
}

export type ParsedArguments =
  | ParsedAppVersionArguments
  | ParsedDeviceVersionArguments
  | ParsedShowAddressArguments
  | ParsedPubkeyQueryArguments
  | ParsedAddressKeyGenArguments
  | ParsedVerificationKeyArguments
  | ParsedTransactionSignArguments
  | ParsedTransactionPolicyIdArguments
  | ParsedTransactionWitnessArguments
  | ParsedTransactionValidateRawArguments
  | ParsedTransactionValidateArguments
  | ParsedTransactionTransformRawArguments
  | ParsedTransactionTransformArguments
  | ParsedNodeKeyGenArguments
  | ParsedOpCertArguments
  | ParsedCatalystVotingKeyRegistrationMetadataArguments

export type HwSigningOutput = {
  type: string,
  description: string,
  path: string,
  cborXPubKeyHex: XPubKeyCborHex,
}

export type VerificationKeyOutput = {
  type: string,
  description: string,
  cborHex: CborHex,
}

// TODO maybe generalize? see also VerificationKeyOutput
export type OpCertIssueCounterOutput = {
  type: string,
  description: string,
  cborHex: CborHex
}

export type OutputData =
  | RawTxFileOutput
  | TxFileOutput
  | WitnessOutput
  | HwSigningOutput
  | VerificationKeyOutput
  | OpCertIssueCounterOutput

export type Cbor = Buffer & { __type: 'cbor' }

// Address type as defined in the Cardano CDDL
export enum AddressType {
    BASE_PAYMENT_KEY_STAKE_KEY = 0b0000,
    BASE_PAYMENT_SCRIPT_STAKE_KEY = 0b0001,
    BASE_PAYMENT_KEY_STAKE_SCRIPT = 0b0010,
    BASE_PAYMENT_SCRIPT_STAKE_SCRIPT = 0b0011,
    POINTER_KEY = 0b0100,
    POINTER_SCRIPT = 0b0101,
    ENTERPRISE_KEY = 0b0110,
    ENTERPRISE_SCRIPT = 0b0111,
    BYRON = 0b1000,
    REWARD_KEY = 0b1110,
    REWARD_SCRIPT = 0b1111,
}

export enum ExitCode {
  Success = 0,
  Error = 1,
  UnfixableValidationErrorsFound = 2,
  FixableValidationErrorsFound = 3,
}
