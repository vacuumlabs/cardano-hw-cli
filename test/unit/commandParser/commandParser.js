/* eslint-disable max-len */
const assert = require('assert')
const { CommandType, parse } = require('../../../src/command-parser/commandParser')
const {
  CardanoEra,
  HwSigningType,
  NativeScriptType,
  DerivationType,
} = require('../../../src/types')
const { cardanoEraToSignedType, NETWORKS } = require('../../../src/constants')

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
      derivationType: undefined,
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse address show command with a derivation type set', () => {
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
      '--derivation-type',
      'ICARUS',
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.SHOW_ADDRESS,
      paymentPath: [2147485500, 2147485463, 2147483648, 0, 0],
      paymentScriptHash: undefined,
      stakingPath: undefined,
      stakingScriptHash: '14c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f1124',
      address: 'addr1qxq0nckg3ekgzuqg7w5p9mvgnd9ym28qh5grlph8xd2z92sj922xhxkn6twlq2wn4q50q352annk3903tj00h45mgfmsl3s9zt',
      derivationType: DerivationType.ICARUS,
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
      derivationType: undefined,
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

  it('Should parse witness transaction', () => {
    const args = pad([
      'shelley',
      'transaction',
      'witness',
      '--tx-file',
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
      network: NETWORKS.TESTNET_LEGACY,
      txFileData: {
        era: CardanoEra.SHELLEY,
        description: 'Ledger Cddl Format',
        envelopeType: 'Unwitnessed Tx ShelleyEra',
        // eslint-disable-next-line max-len
        cborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca0f6',
      },
      hwSigningFileData: [{
        type: 0,
        path: [2147485500, 2147485463, 2147483648, 0, 0],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      }],
      outFiles: ['test/unit/commandParser/res/witness.out'],
      changeOutputKeyFileData: [],
      derivationType: undefined,
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse witness transaction with change', () => {
    const args = pad([
      'shelley',
      'transaction',
      'witness',
      '--tx-file',
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
      command: CommandType.WITNESS_TRANSACTION,
      network: NETWORKS.MAINNET,
      txFileData: {
        era: CardanoEra.SHELLEY,
        description: 'Ledger Cddl Format',
        envelopeType: 'Unwitnessed Tx ShelleyEra',
        // eslint-disable-next-line max-len
        cborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca0f6',
      },
      hwSigningFileData: [{
        type: 0,
        path: [2147485500, 2147485463, 2147483648, 0, 0],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      }],
      outFiles: [
        'test/unit/commandParser/res/tx.signed',
      ],
      changeOutputKeyFileData: [{
        type: 0,
        path: [2147485500, 2147485463, 2147483648, 0, 0],
        cborXPubKeyHex: '5880e0d9c2e5b...7277e7db',
      }],
      derivationType: undefined,
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse governance voting registration', () => {
    const args = pad([
      'governance',
      'voting-registration-metadata',
      '--testnet-magic',
      '42',
      '--vote-public-key-jcli',
      prefix('vote.pub'),
      '--reward-address',
      'adr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4',
      '--stake-signing-key-hw',
      prefix('stake.hwsfile'),
      '--nonce',
      '165564',
      '--metadata-cbor-out-file',
      'voting_registration.cbor',
    ])
    const { parsedArgs } = parse(args)

    const expectedResult = {
      command: CommandType.GOVERNANCE_VOTING_REGISTRATION_METADATA,
      network: NETWORKS.TESTNET_LEGACY,
      rewardAddressSigningKeyData: [],
      hwStakeSigningFileData: {
        type: 1,
        path: [2147485500, 2147485463, 2147483648, 2, 0],
        cborXPubKeyHex: '584066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8e977e956d29810dbfbda9c8ea667585982454e401c68578623d4b86bc7eb7b58',
      },
      nonce: 165564n,
      votingPurpose: undefined,
      outFile: 'voting_registration.cbor',
      rewardAddress: 'adr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4',
      votePublicKeys: ['3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7'],
      voteWeights: [],
      derivationType: undefined,
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })

  it('Should parse governance voting registration with several delegations and reward address hw signing files', () => {
    const args = pad([
      'governance',
      'voting-registration-metadata',
      '--testnet-magic',
      '42',
      '--vote-public-key-jcli',
      prefix('vote.pub'),
      '--vote-weight',
      '1',
      '--vote-public-key-string',
      'gov_vk18dqzv5g3mzanc0rq3k2m8g9lsdrp4n3j67fnv4u6ryum82k3czmssw7hms',
      '--vote-weight',
      '2',
      '--vote-public-key-file',
      prefix('governanceVoting.vkey'),
      '--vote-weight',
      '3',
      '--vote-public-key-hw',
      prefix('governanceVoting.hwsfile'),
      '--vote-weight',
      '4',
      '--reward-address',
      'adr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4',
      '--stake-signing-key-hw',
      prefix('stake.hwsfile'),
      '--nonce',
      '165564',
      '--voting-purpose',
      '164',
      '--reward-address-signing-key-hw',
      prefix('payment.hwsfile'),
      '--reward-address-signing-key-hw',
      prefix('stake.hwsfile'),
      '--metadata-cbor-out-file',
      'voting_registration.cbor',
    ])
    const { parsedArgs } = parse(args)
    const expectedResult = {
      command: CommandType.GOVERNANCE_VOTING_REGISTRATION_METADATA,
      network: NETWORKS.TESTNET_LEGACY,
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
      votingPurpose: 164n,
      outFile: 'voting_registration.cbor',
      rewardAddress: 'adr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4',
      votePublicKeys: [
        '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        'aac861247bd24cae705bca1d1c9763f19c19188fb0faf257c50ed69b8157bced',
        'aac861247bd24cae705bca1d1c9763f19c19188fb0faf257c50ed69b8157bced',
      ],
      voteWeights: [1n, 2n, 3n, 4n],
      derivationType: undefined,
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
      hwSigningFileData: [],
      derivationType: undefined,
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
        envelopeType: cardanoEraToSignedType[CardanoEra.SHELLEY],
        era: CardanoEra.SHELLEY,
        description: '',
        // eslint-disable-next-line max-len
        cborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca10081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584093cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220af6',
      },
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
        envelopeType: cardanoEraToSignedType[CardanoEra.SHELLEY],
        era: CardanoEra.SHELLEY,
        description: '',
        // eslint-disable-next-line max-len
        cborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca10081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584093cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220af6',
      },
      outFile: 'test/unit/commandParser/res/fixed.signed',
    }
    assert.deepStrictEqual(parsedArgs, expectedResult)
  })
})

// TODO add something for op certs (node ...)
