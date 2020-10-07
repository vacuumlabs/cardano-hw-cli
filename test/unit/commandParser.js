const assert = require('assert')
const { parse } = require('../../src/command-parser/commandParser')
const { CommandType, HwSigningType } = require('../../src/types')

const resFolder = './test/res/'
const prefix = (filename) => `${resFolder}${filename}`
const pad = (args) => [undefined, undefined, ...args]

describe('Command parser', () => {
  it('Should parse key-gen command', () => {
    const args = pad([
      'shelley',
      'address',
      'key-gen',
      '--path',
      '1815H/1852H/0H/2/1',
      '--verification-key-file',
      prefix('payment.vkey'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
    ])
    const command = parse(args)
    const expectedResult = {
      command: CommandType.KEY_GEN,
      path: [2147485463, 2147485500, 2147483648, 2, 1],
      hwSigningFile: './test/res/payment.hwsfile',
      verificationKeyFile: './test/res/payment.vkey',
    }
    assert.deepEqual(command, expectedResult)
  })

  it('Should parse key-verification', () => {
    const args = pad([
      'shelley',
      'key',
      'verification-key',
      '--hw-signing-file',
      prefix('payment.hwsfile'),
      '--verification-key-file',
      prefix('payment.vkey'),
    ])
    const command = parse(args)
    const expectedResult = {
      command: CommandType.VERIFICATION_KEY,
      hwSigningFileData: {
        type: HwSigningType.Payment,
        path: [2147485463, 2147485500, 2147483648, 2, 1],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      },
      verificationKeyFile: './test/res/payment.vkey',
    }
    assert.deepEqual(command, expectedResult)
  })

  it('Should parse sign transaction', () => {
    const args = pad([
      'shelley',
      'transaction',
      'sign',
      '--tx-body-file',
      prefix('tx.raw'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
      '--mainnet',
      '--out-file',
      prefix('tx.signed'),
    ])
    const command = parse(args)
    const expectedResult = {
      command: CommandType.SIGN_TRANSACTION,
      mainnet: true,
      txBodyFileData: {
        // eslint-disable-next-line max-len
        cborHex: '839f8200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e2765008200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e276501ff9f8282d818584283581c13f3997560a5b81f5ac680b3322a2339433424e4e589ab3d752afdb6a101581e581c2eab4601bfe583febc23a04fb0abc21557adb47cea49c68d7b2f40a5001ac63884bf182f8282d818584283581cf9a5257f805a1d378c87b0bfb09232c10d9098bc56fd21d9a6a4072aa101581e581c140539c64edded60a7f2c4692c460a154cbdd06088333fd7f75ea7e7001a0ff80ab91a002a81c7ffa0',
      },
      hwSigningFileData: [
        {
          type: 0,
          path: [2147485463, 2147485500, 2147483648, 2, 1],
          cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
        },
      ],
      outFile: './test/res/tx.signed',
      changeOutputKeyFileData: undefined,
    }
    assert.deepEqual(command, expectedResult)
  })

  it('Should parse witness transaction', () => {
    const args = pad([
      'shelley',
      'transaction',
      'sign',
      '--tx-body-file',
      prefix('tx.raw'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
      '--hw-signing-file',
      prefix('payment2.hwsfile'),
      '--mainnet',
      '--out-file',
      prefix('tx.signed'),
    ])
    const command = parse(args)
    const expectedResult = {
      command: CommandType.SIGN_TRANSACTION,
      mainnet: true,
      txBodyFileData: {
        // eslint-disable-next-line max-len
        cborHex: '839f8200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e2765008200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e276501ff9f8282d818584283581c13f3997560a5b81f5ac680b3322a2339433424e4e589ab3d752afdb6a101581e581c2eab4601bfe583febc23a04fb0abc21557adb47cea49c68d7b2f40a5001ac63884bf182f8282d818584283581cf9a5257f805a1d378c87b0bfb09232c10d9098bc56fd21d9a6a4072aa101581e581c140539c64edded60a7f2c4692c460a154cbdd06088333fd7f75ea7e7001a0ff80ab91a002a81c7ffa0',
      },
      hwSigningFileData: [
        {
          type: 0,
          path: [2147485463, 2147485500, 2147483648, 2, 1],
          cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
        },
        {
          type: 0,
          path: [2147485463, 2147485500, 2147483648, 2, 1],
          cborXPubKeyHex: 'placeholder',
        },
      ],
      outFile: './test/res/tx.signed',
      changeOutputKeyFileData: undefined,
    }
    assert.deepEqual(command, expectedResult)
  })
})
