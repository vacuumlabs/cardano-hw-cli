const assert = require('assert')
const { encodeCbor } = require('../../src/util')

function testCbor(value, expected) {
  const encoded = encodeCbor(value)
  assert.deepStrictEqual(encoded.toString('hex'), expected)
}

describe('Testing CBOR', () => {
  it('Encode into CBOR', () => {
    const testCases = [
      [23, '17'],
      [BigInt(23), '17'],
      [24, '1818'],
      [BigInt(24), '1818'],
      [1000, '1903e8'],
      [BigInt(1000), '1903e8'],
      [1000000000000, '1b000000e8d4a51000'],
      [1000000000000n, '1b000000e8d4a51000'],
      [18446744073709551615n, '1bffffffffffffffff'],
      [18446744073709551616n, 'c249010000000000000000'],
    ]

    testCases.forEach(([value, expected]) => {
      testCbor(value, expected)
    })
  })
})
