import { SignedTxOutput, WitnessOutput } from './transaction/types'
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
}

export type CborHex = string & {
  __type: 'cborHex';
}

export type BIP32Path = number[] & { __type: 'bip32path' }

export enum HwSigningType {
  Payment, Stake, PoolCold
}

export type HwSigningData = {
  type: HwSigningType
  path: BIP32Path,
  cborXPubKeyHex: XPubKeyCborHex
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

export type ParsedAddressKeyGenArguments = {
  command: CommandType.ADDRESS_KEY_GEN,
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
}

export type ParsedTransactionWitnessArguments = {
  command: CommandType.WITNESS_TRANSACTION,
  network: Network,
  txBodyFileData: TxBodyData,
  hwSigningFileData: HwSigningData[],
  outFiles: string[],
  changeOutputKeyFileData: HwSigningData[],
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
}

export type ParsedArguments =
  | ParsedAppVersionArguments
  | ParsedDeviceVersionArguments
  | ParsedShowAddressArguments
  | ParsedAddressKeyGenArguments
  | ParsedVerificationKeyArguments
  | ParsedTransactionSignArguments
  | ParsedTransactionPolicyIdArguments
  | ParsedTransactionWitnessArguments
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
  | SignedTxOutput
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
