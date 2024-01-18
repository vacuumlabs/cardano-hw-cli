export enum CardanoEra {
  BYRON = 'Byron',
  SHELLEY = 'Shelley',
  ALLEGRA = 'Allegra',
  MARY = 'Mary',
  ALONZO = 'Alonzo',
  BABBAGE = 'Babbage',
  CONWAY = 'Conway',
}

export type HexString = string & {__type: 'hex'}
export type FixlenHexString<N> = string & {__type: 'hex'; __length: N}

export const PUB_KEY_HEX_LENGTH = 32
export type PubKeyHex = FixlenHexString<typeof PUB_KEY_HEX_LENGTH>

export const VERIFICATION_KEY_CBOR_HEX_LENGTH = 34
export type PubKeyCborHex = FixlenHexString<
  typeof VERIFICATION_KEY_CBOR_HEX_LENGTH
>

export const CHAIN_CODE_HEX_LENGTH = 32
export type ChainCodeHex = FixlenHexString<typeof CHAIN_CODE_HEX_LENGTH>

export const X_PUB_KEY_HEX_LENGTH = 64
export type XPubKeyHex = FixlenHexString<typeof X_PUB_KEY_HEX_LENGTH>

export const X_PUB_KEY_CBOR_HEX_LENGTH = 66
export type XPubKeyCborHex = FixlenHexString<typeof X_PUB_KEY_CBOR_HEX_LENGTH>

export const VOTE_PUBLIC_KEY_HEX_LENGTH = 32
export type VotePublicKeyHex = FixlenHexString<
  typeof VOTE_PUBLIC_KEY_HEX_LENGTH
>

export const NATIVE_SCRIPT_HASH_HEX_LENGTH = 28
export type NativeScriptHashKeyHex = FixlenHexString<
  typeof NATIVE_SCRIPT_HASH_HEX_LENGTH
>

export type Cbor = Buffer & {__type: 'cbor'}
export type CborHex = string & {__type: 'cborHex'}

export type BIP32Path = number[] & {__type: 'bip32path'}

export enum NetworkIds {
  MAINNET = 1,
  TESTNET = 0,
}

// taken from https://book.world.dev.cardano.org/environments.html
export enum ProtocolMagics {
  MAINNET = 764824073,
  TESTNET_PREPROD = 1,
  TESTNET_PREVIEW = 2,
  // we keep these because some test CBORs contain this magic
  TESTNET_LEGACY1 = 42,
  TESTNET_LEGACY2 = 1097911063,
}

export type Network = {
  networkId: number
  protocolMagic: number
}

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

export type HumanAddress = string & {__type: 'humanAddress'}

export enum NativeScriptType {
  PUBKEY,
  ALL,
  ANY,
  N_OF_K,
  INVALID_BEFORE,
  INVALID_HEREAFTER,
}

export type NativeScript =
  | {
      type: NativeScriptType.PUBKEY
      keyHash: string
    }
  | {
      type: NativeScriptType.ALL | NativeScriptType.ANY
      scripts: NativeScript[]
    }
  | {
      type: NativeScriptType.N_OF_K
      required: number
      scripts: NativeScript[]
    }
  | {
      type: NativeScriptType.INVALID_BEFORE | NativeScriptType.INVALID_HEREAFTER
      slot: bigint
    }

export type CVoteDelegation = {
  votePublicKey: VotePublicKeyHex
  voteWeight: bigint
}

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
