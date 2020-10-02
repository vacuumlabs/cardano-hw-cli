const assert = require('assert')
const parse = require('../../src/command-parser/commandParser').default
const { CommandType } = require('../../src/command-parser/types')

const resFolder = './test/res/'
const prefix = (filename) => `${resFolder}${filename}`

describe('Command parser', () => {
  it('Should parse key-gen command', async () => {
    const args = [
      'shelley',
      'address',
      'key-gen',
      '--path',
      '1815/1852/0/2/1',
      '--verification-key-file',
      prefix('payment.vkey'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
    ]
    const command = parse(args)
    const expectedResult = {
      command: CommandType.KEY_GEN,
      args: {
        '--path': '1815/1852/0/2/1',
        '--hw-signing-file': './test/res/payment.hwsfile',
        '--verification-key-file': './test/res/payment.vkey',
      },
    }
    assert.deepStrictEqual(command, expectedResult)
  })

  it('Should parse key-verification', async () => {
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
      command: CommandType.GET_VERIFICATION_KEY,
      args: {
        '--hw-signing-file': {
          type: 'PaymentHWSigningFileShelley_ed25519',
          description: 'Hardware wallet extended payment ',
          path: '1815/1852/0/2/1',
          cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
        },
        '--verification-key-file': './test/res/payment.vkey',
      },
    }
    assert.deepStrictEqual(command, expectedResult)
  })
})
