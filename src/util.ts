import { Encoder } from 'cbor'

const cbor = require('cbor')

// The Map object holds key-value pairs and remembers the original insertion order of the keys.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps

// We assume that decode perserves the order of keys in map when decoding a CBOR
export const decodeCbor = cbor.decode

export const encodeCbor = (value: any) => {
  // Canonical ordering is disabled because of integration
  // with cardano-cli as they are not respecting canonical order
  // https://github.com/input-output-hk/cardano-node/issues/2783
  const enc = new Encoder({ canonical: false, collapseBigIntegers: true })
  enc.pushAny(value)
  return enc.read()
}

// Note: Trezor is serializing a transaction internally
// therefore in the case of having a non-canonical ordering inside a map it would currently fail
// this issue is solved in https://github.com/trezor/trezor-firmware/pull/1672

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
