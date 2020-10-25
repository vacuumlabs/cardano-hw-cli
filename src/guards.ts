import {
  BIP32Path,
  CborHex,
  HwSigningData,
  TxBodyData,
} from './types'

const cbor = require('borc')

export const isCborHex = (test: any): test is CborHex => {
  try {
    cbor.decode(test)
    return true
  } catch (e) {
    return false
  }
}

const isString = (test: any): test is string => test && typeof test === 'string'

export const isBIP32Path = (
  test: any,
): test is BIP32Path => Array.isArray(test)
  && test.every((element) => Number.isInteger(element))

export const isHwSigningData = (
  test: any,
): test is HwSigningData => isBIP32Path(test.path) && isString(test.cborXPubKeyHex)

export const isTxBodyData = (
  test: any,
): test is TxBodyData => isCborHex(test.cborHex)

export const isArrayOfType = <T>(
  test: any,
  valueGuard: (test: any) => boolean,
): test is T[] => Array.isArray(test)
  && (test as any[]).every((value) => valueGuard(value))
