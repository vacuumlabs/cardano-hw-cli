/* eslint-disable max-len */
const assert = require('assert')
const { CommandType, parse } = require('../../../src/command-parser/commandParser')
const { CardanoEra, HwSigningType, NativeScriptType } = require('../../../src/types')
const { NETWORKS } = require('../../../src/constants')

const resFolder = 'test/unit/commandParser/res/'
const prefix = (filename) => `${resFolder}${filename}`
const pad = (args) => [undefined, undefined, ...args]

describe('Command parser', () => {
  it('Should parse address show command', () => {
    const args = pad([
      'shelley',
      'address',
      'show',
      '--payment-path',
      '1852H/1815H/0H/0/0',
      '--staking-script-hash',
      '14c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f1124',
      '--address-file',
      prefix('payment.addr'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.SHOW_ADDRESS,
      paymentPath: [2147485500, 2147485463, 2147483648, 0, 0],
      paymentScriptHash: undefined,
      stakingPath: undefined,
      stakingScriptHash: '14c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f1124',
      address: 'addr1qxq0nckg3ekgzuqg7w5p9mvgnd9ym28qh5grlph8xd2z92sj922xhxkn6twlq2wn4q50q352annk3903tj00h45mgfmsl3s9zt',
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse key-gen command', () => {
    const args = pad([
      'shelley',
      'address',
      'key-gen',
      '--path',
      '1852H/1815H/0H/0/0',
      '--verification-key-file',
      prefix('payment.vkey'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.ADDRESS_KEY_GEN,
      paths: [[2147485500, 2147485463, 2147483648, 0, 0]],
      hwSigningFiles: ['test/unit/commandParser/res/payment.hwsfile'],
      verificationKeyFiles: ['test/unit/commandParser/res/payment.vkey'],
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
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
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.VERIFICATION_KEY,
      hwSigningFileData: {
        type: HwSigningType.Payment,
        path: [2147485500, 2147485463, 2147483648, 0, 0],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      },
      verificationKeyFile: 'test/unit/commandParser/res/payment.vkey',
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
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
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.SIGN_TRANSACTION,
      network: NETWORKS.MAINNET,
      txBodyFileData: {
        // eslint-disable-next-line max-len
        cborHex: '839f8200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e2765008200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e276501ff9f8282d818584283581c13f3997560a5b81f5ac680b3322a2339433424e4e589ab3d752afdb6a101581e581c2eab4601bfe583febc23a04fb0abc21557adb47cea49c68d7b2f40a5001ac63884bf182f8282d818584283581cf9a5257f805a1d378c87b0bfb09232c10d9098bc56fd21d9a6a4072aa101581e581c140539c64edded60a7f2c4692c460a154cbdd06088333fd7f75ea7e7001a0ff80ab91a002a81c7ffa0',
        era: CardanoEra.SHELLEY,
      },
      hwSigningFileData: [
        {
          type: 0,
          path: [2147485500, 2147485463, 2147483648, 0, 0],
          cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
        },
      ],
      outFile: 'test/unit/commandParser/res/tx.signed',
      changeOutputKeyFileData: [],
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse witness transaction', () => {
    const args = pad([
      'shelley',
      'transaction',
      'witness',
      '--tx-body-file',
      prefix('tx.raw'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
      '--testnet-magic',
      42,
      '--out-file',
      prefix('witness.out'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.WITNESS_TRANSACTION,
      network: NETWORKS.TESTNET,
      txBodyFileData: {
        // eslint-disable-next-line max-len
        cborHex: '839f8200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e2765008200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e276501ff9f8282d818584283581c13f3997560a5b81f5ac680b3322a2339433424e4e589ab3d752afdb6a101581e581c2eab4601bfe583febc23a04fb0abc21557adb47cea49c68d7b2f40a5001ac63884bf182f8282d818584283581cf9a5257f805a1d378c87b0bfb09232c10d9098bc56fd21d9a6a4072aa101581e581c140539c64edded60a7f2c4692c460a154cbdd06088333fd7f75ea7e7001a0ff80ab91a002a81c7ffa0',
        era: CardanoEra.SHELLEY,
      },
      hwSigningFileData: [{
        type: 0,
        path: [2147485500, 2147485463, 2147483648, 0, 0],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      }],
      outFiles: ['test/unit/commandParser/res/witness.out'],
      changeOutputKeyFileData: [],
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })
  it('Should parse sign transaction with change', () => {
    const args = pad([
      'shelley',
      'transaction',
      'sign',
      '--tx-body-file',
      prefix('tx.raw'),
      '--hw-signing-file',
      prefix('payment.hwsfile'),
      '--mainnet',
      '--change-output-key-file',
      prefix('payment.hwsfile'),
      '--out-file',
      prefix('tx.signed'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.SIGN_TRANSACTION,
      network: NETWORKS.MAINNET,
      txBodyFileData: {
        // eslint-disable-next-line max-len
        cborHex: '839f8200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e2765008200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e276501ff9f8282d818584283581c13f3997560a5b81f5ac680b3322a2339433424e4e589ab3d752afdb6a101581e581c2eab4601bfe583febc23a04fb0abc21557adb47cea49c68d7b2f40a5001ac63884bf182f8282d818584283581cf9a5257f805a1d378c87b0bfb09232c10d9098bc56fd21d9a6a4072aa101581e581c140539c64edded60a7f2c4692c460a154cbdd06088333fd7f75ea7e7001a0ff80ab91a002a81c7ffa0',
        era: CardanoEra.SHELLEY,
      },
      hwSigningFileData: [{
        type: 0,
        path: [2147485500, 2147485463, 2147483648, 0, 0],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      }],
      outFile: 'test/unit/commandParser/res/tx.signed',
      changeOutputKeyFileData: [{
        type: 0,
        path: [2147485500, 2147485463, 2147483648, 0, 0],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      }],
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })
  it('Should parse sign catalyst voting registration', () => {
    const args = pad([
      'catalyst',
      'voting-key-registration-metadata',
      '--testnet-magic',
      '42',
      '--vote-public-key',
      prefix('vote.pub'),
      '--reward-address',
      'adr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4',
      '--stake-signing-key',
      prefix('stake.hwsfile'),
      '--nonce',
      '165564',
      '--reward-address-signing-key',
      prefix('payment.hwsfile'),
      '--reward-address-signing-key',
      prefix('stake.hwsfile'),
      '--metadata-cbor-out-file',
      'voting_registration.cbor',
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.CATALYST_VOTING_KEY_REGISTRATION_METADATA,
      network: NETWORKS.TESTNET,
      rewardAddressSigningKeyData: [
        {
          type: 0,
          path: [2147485500, 2147485463, 2147483648, 0, 0],
          cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
        },
        {
          type: 1,
          path: [2147485500, 2147485463, 2147483648, 2, 0],
          cborXPubKeyHex: '584066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8e977e956d29810dbfbda9c8ea667585982454e401c68578623d4b86bc7eb7b58',
        },
      ],
      hwStakeSigningFileData: {
        type: 1,
        path: [2147485500, 2147485463, 2147483648, 2, 0],
        cborXPubKeyHex: '584066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8e977e956d29810dbfbda9c8ea667585982454e401c68578623d4b86bc7eb7b58',
      },
      nonce: 165564n,
      outFile: 'voting_registration.cbor',
      rewardAddress: 'adr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4',
      votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })
  it('Should parse policy-id command', () => {
    const args = pad([
      'transaction',
      'policyid',
      '--script-file',
      prefix('nested.script'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.DERIVE_NATIVE_SCRIPT_HASH,
      nativeScript: {
        type: NativeScriptType.ALL,
        scripts: [
          {
            type: NativeScriptType.PUBKEY,
            keyHash: '14c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f1124',
          },
          {
            type: NativeScriptType.PUBKEY,
            keyHash: 'c4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e0386',
          },
          {
            type: NativeScriptType.ANY,
            scripts:
            [
              {
                type: NativeScriptType.PUBKEY,
                keyHash: 'c4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e0386',
              },
              {
                type: NativeScriptType.PUBKEY,
                keyHash: '0241f2d196f52a92fbd2183d03b370c30b6960cfdeae364ffabac889',
              },
            ],
          },
          {
            type: NativeScriptType.N_OF_K,
            required: 2,
            scripts:
            [
              {
                type: NativeScriptType.PUBKEY,
                keyHash: 'c4b9265645fde9536c0795adbcc5291767a0c61fd62448341d7e0386',
              },
              {
                type: NativeScriptType.PUBKEY,
                keyHash: '0241f2d196f52a92fbd2183d03b370c30b6960cfdeae364ffabac889',
              },
              {
                type: NativeScriptType.PUBKEY,
                keyHash: 'cecb1d427c4ae436d28cc0f8ae9bb37501a5b77bcc64cd1693e9ae20',
              },
            ],
          },
          {
            type: NativeScriptType.INVALID_BEFORE,
            slot: 100,
          },
          {
            type: NativeScriptType.INVALID_HEREAFTER,
            slot: 200,
          },
        ],
      },
      hwSigningFileData: undefined,
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })
})

// TODO add something for op certs (node ...)
