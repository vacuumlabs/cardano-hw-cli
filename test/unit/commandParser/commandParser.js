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
      rawTxFileData: {
        // eslint-disable-next-line max-len
        cborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
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
      rawTxFileData: {
        // eslint-disable-next-line max-len
        cborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
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
      rawTxFileData: {
        // eslint-disable-next-line max-len
        cborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
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

  it('Should parse validate-raw transaction', () => {
    const args = pad([
      'transaction',
      'validate-raw',
      '--tx-body-file',
      prefix('tx.raw'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.VALIDATE_RAW_TRANSACTION,
      rawTxFileData: {
        // eslint-disable-next-line max-len
        cborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
        era: CardanoEra.SHELLEY,
      },
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse validate transaction', () => {
    const args = pad([
      'transaction',
      'validate',
      '--tx-file',
      prefix('tx.signed'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.VALIDATE_TRANSACTION,
      txFileData: {
        // eslint-disable-next-line max-len
        cborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca10081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584093cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220af6',
        era: CardanoEra.SHELLEY,
      },
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse transform-raw transaction', () => {
    const args = pad([
      'transaction',
      'transform-raw',
      '--tx-body-file',
      prefix('tx.raw'),
      '--out-file',
      prefix('fixed.raw'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.TRANSFORM_RAW_TRANSACTION,
      rawTxFileData: {
        // eslint-disable-next-line max-len
        cborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
        era: CardanoEra.SHELLEY,
      },
      outFile: 'test/unit/commandParser/res/fixed.raw',
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse transform transaction', () => {
    const args = pad([
      'transaction',
      'transform',
      '--tx-file',
      prefix('tx.signed'),
      '--out-file',
      prefix('fixed.signed'),
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.TRANSFORM_TRANSACTION,
      txFileData: {
        // eslint-disable-next-line max-len
        cborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca10081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584093cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220af6',
        era: CardanoEra.SHELLEY,
      },
      outFile: 'test/unit/commandParser/res/fixed.signed',
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })
})

// TODO add something for op certs (node ...)
