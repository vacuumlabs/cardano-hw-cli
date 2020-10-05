import {
  CborHex, HwSigningData, Path, TxBodyData,
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

export const isPath = (
  test:any,
): test is Path => Array.isArray(test)
  && test.length === 5
  && test.every((element) => typeof element === 'number')

export const isHwSigningData = (
  test: any,
): test is HwSigningData => isPath(test.path) && isString(test.cborXPubKeyHex)

export const isTxBodyData = (
  test: any,
): test is TxBodyData => isCborHex(test.cborHex)
