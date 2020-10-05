const assert = require('assert')
const { parse } = require('../../src/command-parser/commandParser')
const { CommandType, HwSigningType } = require('../../src/types')

const resFolder = './test/res/'
const prefix = (filename) => `${resFolder}${filename}`

describe('Command parser', () => {
  it('Should parse key-gen command', () => {
    const args = [
      'shelley',
      'address',
      'key-gen',
      '--path',
      '1815H/1852H/0H/2/1',
      '--verification-key-file',
      prefix('payment.vkey'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
    ]
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
    const args = [
      'shelley',
      'key',
      'verification-key',
      '--hw-signing-file',
      prefix('payment.hwsfile'),
      '--verification-key-file',
      prefix('payment.vkey'),
    ]
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
})
