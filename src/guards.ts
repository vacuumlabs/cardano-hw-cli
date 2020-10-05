import {
  CborHex, FileType, HwSigning, TxBody,
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

export const isTxBodyFileType = (test: any): test is FileType => test === FileType.TxBodyFileType
export const isHwSigningFileType = (test: any): test is FileType => test === FileType.HwSigningFileType

export const isHwSigning = (test: any): test is HwSigning => [
  isHwSigningFileType(test.type),
  isString(test.description),
  isString(test.path),
  isString(test.cborXPubKeyHex),
].every(Boolean)

export const isTxBody = (test: any): test is TxBody => [
  isTxBodyFileType(test.type),
  isString(test.description),
  isCborHex(test.cborHex),
].every(Boolean)
