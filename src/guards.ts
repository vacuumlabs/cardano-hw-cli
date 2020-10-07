import {
  BIP32Path,
  CborHex, HwSigningData, TxBodyData,
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
  && test.length === 5
  && test.every((element) => typeof element === 'number')

export const isHwSigningData = (
  test: any,
): test is HwSigningData => isBIP32Path(test.path) && isString(test.cborXPubKeyHex)

export const isTxBodyData = (
  test: any,
): test is TxBodyData => isCborHex(test.cborHex)
