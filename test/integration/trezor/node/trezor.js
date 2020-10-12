/* eslint-disable max-len */
const assert = require('assert')
const { TxAux } = require('../../../../src/transaction/transaction')
const { TrezorCryptoProvider } = require('../../../../src/crypto-providers/trezorCryptoProvider')
const { NETWORKS, HARDENED_THRESHOLD } = require('../../../../src/constants')

const transactions = {
  SimpleTransaction: {
    unsignedCborHex: '82a4008182582066001e24baf17637192d3a91c418cf4ed3c8053e333d0c35bd388deb2fa89c92000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a002b8a44021a0002b473031a00a2d750f6',
    hwSigningFiles: [
      {
        type: 0,
        path: [
          1852 + HARDENED_THRESHOLD,
          1815 + HARDENED_THRESHOLD,
          0 + HARDENED_THRESHOLD,
          0,
          0,
        ],
        cborXPubKeyHex: '58403913a8b0e4009fee670ca24735efb7f86d8698bf47f3f144fe1a1a72bba17290a71987268d7d15e3d28264fda016fa611f981bb69d7b5ef051746ecdacc0dd90',
      },
    ],
    signedTxCborHex: '83a4008182582066001e24baf17637192d3a91c418cf4ed3c8053e333d0c35bd388deb2fa89c92000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a002b8a44021a0002b473031a00a2d750a100818258203913a8b0e4009fee670ca24735efb7f86d8698bf47f3f144fe1a1a72bba172905840acd168cc35e98a90297bde0256c95943b37e45b7f571ca871621d4586caa373ec263cf57302ecfc043cd33c251026c49bcf1ce635ac1f2c944be6c6a29f9be09f6',
    txWitnesses: [
      '82008258203913a8b0e4009fee670ca24735efb7f86d8698bf47f3f144fe1a1a72bba172905840acd168cc35e98a90297bde0256c95943b37e45b7f571ca871621d4586caa373ec263cf57302ecfc043cd33c251026c49bcf1ce635ac1f2c944be6c6a29f9be09',
    ],
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

describe('Trezor tx signing', () => {
  let cryptoProvider
  before(async () => {
    cryptoProvider = await TrezorCryptoProvider()
  })
  after(async () => {
    // cryptoProvider.TrezorConnect.dispose() // this doesnt work
  })
  Object.entries(transactions).forEach(([txType, tx]) => it(
    txType, async () => testTxSigning(cryptoProvider, tx),
  ).timeout(100000))
})
