import {
  BIP32Path,
  CborHex,
  CardanoEra,
  HwSigningData,
  TxBodyData,
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

const isString = (value: any): value is string => value && typeof value === 'string'

export const isBIP32Path = (
  value: any,
): value is BIP32Path => Array.isArray(value)
  && value.every((element) => Number.isInteger(element))

export const isHwSigningData = (
  value: any,
): value is HwSigningData => isBIP32Path(value.path) && isString(value.cborXPubKeyHex)

export const isTxBodyData = (
  value: any,
): value is TxBodyData => isEra(value.era) && isCborHex(value.cborHex)

export const isArrayOfType = <T>(
  value: any,
  valueGuard: (item: any) => boolean,
): value is T[] => Array.isArray(value)
  && (value as any[]).every((item) => valueGuard(item))
