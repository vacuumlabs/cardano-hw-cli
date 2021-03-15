const assert = require('assert')
const { HARDENED_THRESHOLD } = require('../../../src/constants')
const { classifyPath, PathTypes } = require('../../../src/crypto-providers/util')

describe('Test util', () => {
  it('Classify Byron wallet address path', () => {
    const HD = HARDENED_THRESHOLD

    assert.deepStrictEqual(
      classifyPath([44 + HD, 1815 + HD, 0 + HD, 0, 0]),
      PathTypes.PATH_WALLET_SPENDING_KEY_BYRON,
    )

    assert.deepStrictEqual(
      classifyPath([44 + HD, 1815 + HD, 0 + HD, 0]),
      PathTypes.PATH_INVALID,
    )
  })

  it('Classify Shelley wallet address path', () => {
    const HD = HARDENED_THRESHOLD

    assert.deepStrictEqual(
      classifyPath([1852 + HD, 1815 + HD, 0 + HD, 1, 5]),
      PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY,
    )

    assert.deepStrictEqual(
      classifyPath([1852 + HD, 1815 + HD, 0 + HD, 3, 0]),
      PathTypes.PATH_INVALID,
    )
  })

  it('Classify staking path', () => {
    const HD = HARDENED_THRESHOLD

    assert.deepStrictEqual(
      classifyPath([1852 + HD, 1815 + HD, 1 + HD, 2, 0]),
      PathTypes.PATH_WALLET_STAKING_KEY,
    )

    assert.deepStrictEqual(
      classifyPath([1852 + HD, 1815 + HD, 3 + HD, 2, 1]),
      PathTypes.PATH_INVALID,
    )
  })
})
