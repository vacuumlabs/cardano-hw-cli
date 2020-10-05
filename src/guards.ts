import {
  CborHex, HwSigningFileFormat, Path, TxBodyFileFormat,
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

export const isHwSigningFileFormat = (
  test: any,
): test is HwSigningFileFormat => isPath(test.path) && isString(test.cborXPubKeyHex)

export const isTxBodyFileFormat = (
  test: any,
): test is TxBodyFileFormat => isCborHex(test.cborHex)
