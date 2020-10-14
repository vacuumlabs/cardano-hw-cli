/* eslint-disable max-len */
const assert = require('assert')
const { TxAux } = require('../../../../src/transaction/transaction')
const { LedgerCryptoProvider } = require('../../../../src/crypto-providers/ledgerCryptoProvider')
const { NETWORKS, HARDENED_THRESHOLD } = require('../../../../src/constants')

const signingFiles = {
  payment0: {
    type: 0,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      0,
    ],
    cborXPubKeyHex: '5840cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2914ba07fb381f23c5c09bce26587bdf359aab7ea8f4192adbf93a38fd893ccea',
  },
  stake0: {
    type: 1,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      2,
      0,
    ],
    cborXPubKeyHex: '584066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8e977e956d29810dbfbda9c8ea667585982454e401c68578623d4b86bc7eb7b58',
  },
}

const transactions = {
  SimpleTransaction: {
    unsignedCborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
    hwSigningFiles: [signingFiles.payment0],
    signedTxCborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca10081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584093cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220af6',
    witnessCborHex: '82f7825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584093cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220a',
  },
}

async function testTxSigning(cryptoProvider, transaction) {
  const txAux = TxAux(transaction.unsignedCborHex)
  const signedTxCborHex = await cryptoProvider.signTx(
    txAux,
    transaction.hwSigningFiles,
    NETWORKS.MAINNET,
  )
  assert.deepStrictEqual(signedTxCborHex, transaction.signedTxCborHex)
}

describe('Ledger tx signing', () => {
  let cryptoProvider
  before(async () => {
    cryptoProvider = await LedgerCryptoProvider()
  })
  Object.entries(transactions).forEach(([txType, tx]) => it(
    txType, async () => testTxSigning(cryptoProvider, tx),
  ).timeout(100000))
})
