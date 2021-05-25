const assert = require('assert')
const { parseUnsignedTx } = require('../../../src/transaction/txParser')
const { transactions } = require('./txs')

function testTxHashAndParsing(tx) {
  const {
    getId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    originalTxDecoded,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    unsignedTxDecoded,
    ...parsedTx
  } = parseUnsignedTx(tx.unsignedCborHex)
  const txHashHex = getId()

  it('Should parse tx', () => {
    assert.deepStrictEqual(parsedTx, tx.parsed)
  })
  it('Should get correct transaction hash', () => {
    assert.deepStrictEqual(txHashHex, tx.hashHex)
  })
}

describe('Transaction parsing', () => {
  Object.entries(transactions).forEach(([txType, tx]) => describe(
    txType, () => testTxHashAndParsing(tx),
  ))
})
