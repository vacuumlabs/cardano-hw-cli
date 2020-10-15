/* eslint-disable max-len */
const assert = require('assert')
const fs = require('fs')
const { exec } = require('child_process')

const withTxRawFilePath = (path) => `test/integration/trezor/cli/txsFiles/${path}/`
const withSigningFilePath = 'test/integration/trezor/cli/keyFiles/'

const transactions = {
  simpleTx: {
    command: (path) => `./build/cardano-hw-cli shelley transaction sign --tx-body-file ${withTxRawFilePath(path)}tx.raw --hw-signing-file ${withSigningFilePath}payment.hwsfile --mainnet --out-file ${withTxRawFilePath(path)}tx.signed`,
    signedTxCborHex: '83a4008182582066001e24baf17637192d3a91c418cf4ed3c8053e333d0c35bd388deb2fa89c92000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a002b8a44021a0002b473031a00a2d750a100818258203913a8b0e4009fee670ca24735efb7f86d8698bf47f3f144fe1a1a72bba172905840acd168cc35e98a90297bde0256c95943b37e45b7f571ca871621d4586caa373ec263cf57302ecfc043cd33c251026c49bcf1ce635ac1f2c944be6c6a29f9be09f6',
  },
}

async function testCommand(folderName, tx) {
  const path = `test/integration/trezor/cli/txsFiles/${folderName}/tx.signed`
  const command = tx.command(folderName)
  // console.log(command)
  exec(command, async (error, stdout, stderr) => {
    if (error || stderr) {
      throw Error(stderr)
    }
  })
  const { cborHex } = JSON.parse(fs.readFileSync(path, 'utf8'))
  assert.deepStrictEqual(cborHex, tx.signedTxCborHex)
}

describe('Trezor cli tx signing', () => {
  Object.entries(transactions).forEach(([folderName, tx]) => it(
    folderName, async () => {
      await testCommand(folderName, tx)
    },
  ))
})
