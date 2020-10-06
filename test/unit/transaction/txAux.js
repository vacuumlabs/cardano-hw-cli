const assert = require('assert')
const { TxAux } = require('../../../src/transaction/txBuilder')
const { transactions } = require('./txs')

function testTxHashAndParsing(transaction) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { getId, unsignedTxDecoded, ...parsedTx } = TxAux(transaction.unsignedTx)
  const txHash = getId()
  it('Should parse tx', () => {
    assert.deepStrictEqual(parsedTx, transaction.txParsed)
  })
  it('Should get correct transacttransactionion hash', () => {
    assert.deepStrictEqual(txHash, transaction.txHashHex)
  })
}

describe('Transaction parsing', () => {
  describe('Tx with delegation certificate', () => {
    const transaction = transactions.withDelegationCertificate
    testTxHashAndParsing(transaction)
  })
  describe('Tx with deregistration certificate', () => {
    const transaction = transactions.withDeregistrationCertificate
    testTxHashAndParsing(transaction)
  })
  describe('Tx with staking key registration certificate', () => {
    const transaction = transactions.withRegistrationCertificate
    testTxHashAndParsing(transaction)
  })
  describe('Tx with withdrawal', () => {
    const transaction = transactions.withWithdrawal
    testTxHashAndParsing(transaction)
  })
  describe('Tx with meta data', () => {
    const transaction = transactions.withMetaData
    testTxHashAndParsing(transaction)
  })
})
