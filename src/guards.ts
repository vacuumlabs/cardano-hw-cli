import {txEnvelopeTypes} from './constants'
import {
  BIP32Path,
  CborHex,
  CardanoEra,
  PubKeyHex,
  PubKeyCborHex,
  ChainCodeHex,
  XPubKeyHex,
  XPubKeyCborHex,
  VotePublicKeyHex,
  PUB_KEY_HEX_LENGTH,
  VERIFICATION_KEY_CBOR_HEX_LENGTH,
  CHAIN_CODE_HEX_LENGTH,
  X_PUB_KEY_HEX_LENGTH,
  X_PUB_KEY_CBOR_HEX_LENGTH,
  VOTE_PUBLIC_KEY_HEX_LENGTH,
  DerivationType,
} from './basicTypes'
import {decodeCbor} from './util'
import {TxFileData, HwSigningData} from './argTypes'

export const isEra = (value: unknown): value is CardanoEra =>
  Object.values(CardanoEra).includes(value as CardanoEra)

export const isCborHex = (value: unknown): value is CborHex => {
  try {
    decodeCbor(value)
    return true
  } catch (e) {
    return false
  }
}

const isString = (value: unknown): value is string =>
  value != null && typeof value === 'string'

export const isBIP32Path = (value: unknown): value is BIP32Path =>
  Array.isArray(value) && value.every((element) => Number.isInteger(element))

export const isHwSigningData = (value: unknown): value is HwSigningData =>
  typeof value === 'object' &&
  value !== null &&
  'path' in value &&
  isBIP32Path(value.path) &&
  'cborXPubKeyHex' in value &&
  isString(value.cborXPubKeyHex)

export const isTxFileData = (value: unknown): value is TxFileData =>
  typeof value === 'object' &&
  value !== null &&
  'era' in value &&
  isEra(value.era) &&
  'description' in value &&
  isString(value.description) &&
  'cborHex' in value &&
  isCborHex(value.cborHex) &&
  'envelopeType' in value &&
  txEnvelopeTypes.includes(value.envelopeType as string)

export const isArrayOfType = <T>(
  value: unknown,
  valueGuard: (item: unknown) => boolean,
): value is T[] =>
  Array.isArray(value) && (value as unknown[]).every((item) => valueGuard(item))

export const isPubKeyHex = (value: unknown): value is PubKeyHex =>
  typeof value === 'string' && value.length === PUB_KEY_HEX_LENGTH * 2

export const isPubKeyCborHex = (value: unknown): value is PubKeyCborHex =>
  typeof value === 'string' &&
  value.length === VERIFICATION_KEY_CBOR_HEX_LENGTH * 2

export const isChainCodeHex = (value: unknown): value is ChainCodeHex =>
  typeof value === 'string' && value.length === CHAIN_CODE_HEX_LENGTH * 2

export const isXPubKeyHex = (value: unknown): value is XPubKeyHex =>
  typeof value === 'string' && value.length === X_PUB_KEY_HEX_LENGTH * 2

export const isXPubKeyCborHex = (value: unknown): value is XPubKeyCborHex =>
  typeof value === 'string' && value.length === X_PUB_KEY_CBOR_HEX_LENGTH * 2

export const isVotePublicKeyHex = (value: unknown): value is VotePublicKeyHex =>
  typeof value === 'string' && value.length === VOTE_PUBLIC_KEY_HEX_LENGTH * 2

export const isDerivationType = (value: unknown): value is DerivationType =>
  typeof value === 'string' && value in DerivationType
