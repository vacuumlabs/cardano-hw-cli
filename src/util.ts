import { Encoder } from 'cbor'

const cbor = require('cbor')

export const decodeCbor = cbor.decode
export const encodeCbor = (value: any) => {
  const enc = new Encoder({ canonical: true, collapseBigIntegers: true })
  enc.pushAny(value)
  return enc.read()
}

export const removeNullFields = (obj: any) => Object.keys(obj)
  .filter((key) => obj[key] != null)
  .reduce(
    (acc, key) => {
      acc[key] = obj[key]
      return acc
    },
    {},
  )
