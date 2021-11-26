import { Encoder } from 'cbor'

const cbor = require('cbor')

// we use cardano-hw-interop-lib for transaction decoding & encoding
// these functions should be used only for the other simple stuff (eg. keys, ...)
export const decodeCbor = cbor.decode

export const encodeCbor = (value: any) => {
  const enc = new Encoder({ collapseBigIntegers: true })
  enc.pushAny(value)
  return enc.read()
}

export const removeNullFields = (obj: any): any => Object.keys(obj)
  .filter((key) => obj[key] != null)
  .reduce(
    (acc, key) => {
      acc[key] = obj[key]
      return acc
    },
    {},
  )

export const partition = <T>(array: T[], predicate: (t: T) => boolean): [T[], T[]] => (
  [array.filter(predicate), array.filter((t) => !predicate(t))]
)

export const invertObject = (obj: {[key: string]: string}): {[key: string]: string} => (
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]))
)
