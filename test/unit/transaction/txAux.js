const assert = require('assert')
const { TxAux } = require('../../../src/transaction/txBuilder')
const { transactions } = require('./txs')

function testTxHashAndParsing(tx) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { getId, unsignedTxDecoded, ...parsedTx } = TxAux(tx.unsignedCborHex)
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
