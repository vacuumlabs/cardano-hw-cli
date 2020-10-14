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
  WithDelegation: {
    unsignedCborHex: '82a50081825820b06f6d9fbb888e82fd785a7e84760bbf89aea7a54e961840ecb8cb0bfe4aa7b5000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a001e44cc021a0002d7a4031a00a9aa9e048183028200581c8636aa540280a200e32f45e98013c24218a1a4996504634150dc5538581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438f6',
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
      {
        type: 1,
        path: [
          1852 + HARDENED_THRESHOLD,
          1815 + HARDENED_THRESHOLD,
          0 + HARDENED_THRESHOLD,
          2,
          0,
        ],
        cborXPubKeyHex: '5840bface8f34e73d5cfdd138f9498a36def84318188c8bf3a8170b50f9d307eb234226b4b0687812953013d56e7f408f743ca6c05c184d743c2ba9007e4fc3ef00f',
      },
    ],
    signedTxCborHex: '83a50081825820b06f6d9fbb888e82fd785a7e84760bbf89aea7a54e961840ecb8cb0bfe4aa7b5000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a001e44cc021a0002d7a4031a00a9aa9e048183028200581c8636aa540280a200e32f45e98013c24218a1a4996504634150dc5538581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a10082825820bface8f34e73d5cfdd138f9498a36def84318188c8bf3a8170b50f9d307eb234584079384143342248b41ad632a16057cd9edb00cddf9ae6dcd1a450d9ed6c3f777baa00473883af870fcd6a11dac38cd9c14235c07e649a453e92599eba35d93b098258203913a8b0e4009fee670ca24735efb7f86d8698bf47f3f144fe1a1a72bba172905840845d371da37982c6d7dde3bc90ec88ed15fc60dffbf00729f71ff8f06b6583d23904da3ad86dec66cd2ab9c5b5dd2a09c72df169d5ca437d54e351bbda4c040df6',
    txWitnesses: [],
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
