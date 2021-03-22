const cbor = require('cbor')

export const encodeCbor = cbor.encode
export const decodeCbor = cbor.decode

export const removeNullFields = (obj: any) => Object.keys(obj)
  .filter((key) => obj[key] != null)
  .reduce(
    (acc, key) => {
      acc[key] = obj[key]
      return acc
    },
    {},
  )
