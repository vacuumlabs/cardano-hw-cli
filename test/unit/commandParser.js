const assert = require('assert')
const parse = require('../../src/command-parser/commandParser').default
const CommandType = require('../../src/command-parser/types').default

const resFolder = './test/res/'
const prefix = (filename) => `${resFolder}${filename}`

describe('Command parser', () => {
  it('Should parse key-gen command', () => {
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
      path: '1815/1852/0/2/1',
      hw_signing_file: './test/res/payment.hwsfile',
      verification_key_file: './test/res/payment.vkey',
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
      hw_signing_file: './test/res/payment.hwsfile',
      verification_key_file: './test/res/payment.vkey',
    }
    assert.deepEqual(command, expectedResult)
  })
})
