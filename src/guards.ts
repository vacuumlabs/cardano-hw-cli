import { txEnvelopeTypes } from './constants'
import {
  BIP32Path,
  CborHex,
  CardanoEra,
  HwSigningData,
  RawTxFileData,
  TxFileData,
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
} from './types'
import { decodeCbor } from './util'

export const isEra = (value: any): value is CardanoEra => Object.values(CardanoEra).includes(value)

export const isCborHex = (value: any): value is CborHex => {
  try {
    decodeCbor(value)
    return true
  } catch (e) {
    return false
  }
}

const isString = (value: any): value is string => value != null && typeof value === 'string'

export const isBIP32Path = (
  value: any,
): value is BIP32Path => Array.isArray(value)
  && value.every((element) => Number.isInteger(element))

export const isHwSigningData = (
  value: any,
): value is HwSigningData => isBIP32Path(value.path) && isString(value.cborXPubKeyHex)

export const isRawTxFileData = (
  value: any,
): value is RawTxFileData => isEra(value.era)
  && isString(value.description)
  && isCborHex(value.cborHex)

export const isTxFileData = (
  value: any,
): value is TxFileData => isEra(value.era)
  && isString(value.description)
  && isCborHex(value.cborHex)
  && txEnvelopeTypes.includes(value.envelopeType)

export const isArrayOfType = <T>(
  value: any,
  valueGuard: (item: any) => boolean,
): value is T[] => Array.isArray(value)
  && (value as any[]).every((item) => valueGuard(item))

export const isPubKeyHex = (
  value: any,
): value is PubKeyHex => typeof value === 'string' && value.length === PUB_KEY_HEX_LENGTH * 2

export const isPubKeyCborHex = (
  value: any,
): value is PubKeyCborHex => typeof value === 'string'
  && value.length === VERIFICATION_KEY_CBOR_HEX_LENGTH * 2

export const isChainCodeHex = (
  value: any,
): value is ChainCodeHex => typeof value === 'string' && value.length === CHAIN_CODE_HEX_LENGTH * 2

export const isXPubKeyHex = (
  value: any,
): value is XPubKeyHex => typeof value === 'string' && value.length === X_PUB_KEY_HEX_LENGTH * 2

export const isXPubKeyCborHex = (
  value: any,
): value is XPubKeyCborHex => typeof value === 'string' && value.length === X_PUB_KEY_CBOR_HEX_LENGTH * 2

export const isVotePublicKeyHex = (
  value: any,
): value is VotePublicKeyHex => typeof value === 'string' && value.length === VOTE_PUBLIC_KEY_HEX_LENGTH * 2
