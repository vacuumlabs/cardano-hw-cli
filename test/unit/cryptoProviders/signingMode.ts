/* eslint-disable max-len */
import assert from 'assert'
import {
  decodeTx,
  Certificate,
  CertificateType,
  CredentialType,
  KeyHash,
  RewardAccount,
  ScriptHash,
  TransactionBody,
  Uint,
  VoterType,
} from 'cardano-hw-interop-lib'
import {determineSigningMode} from '../../../src/crypto-providers/util'
import {validateWitnessing} from '../../../src/crypto-providers/witnessingValidation'
import {
  SigningMode,
  TxSigningParameters,
} from '../../../src/crypto-providers/cryptoProvider'
import {Errors} from '../../../src/errors'
import {NETWORKS} from '../../../src/constants'
import {BIP32Path, CardanoEra, XPubKeyCborHex} from '../../../src/basicTypes'
import {
  HwSigningData,
  HwSigningType,
} from '../../../src/command-parser/argTypes'

// An ordinary tx (inputs/outputs/fee/ttl), no certificates.
const ordinaryTxCborHex =
  '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca0f6'

// A tx containing a stake pool registration certificate.
const poolRegistrationTxCborHex =
  '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6a0f6'

const testXPubKeyCborHex =
  '58400d94fa4489745249e9cd999c907f2692e0e5c7ac868a960312ed5d480c59f2dc231adc1ee85703f714abe70c6d95f027e76ee947f361cbb72a155ac8cad6d23f' as XPubKeyCborHex

// blake2b-224 hash of the public key inside testXPubKeyCborHex
const testXPubKeyHashHex =
  'dc0b21682c420507046b81d94fc72b756350b1682ba8020c5b5c5fa3'

const paymentSigningFile: HwSigningData = {
  type: HwSigningType.Payment,
  path: [2147485500, 2147485463, 2147483648, 0, 0] as BIP32Path, // 1852'/1815'/0'/0/0
  cborXPubKeyHex: testXPubKeyCborHex,
}

const multisigSigningFile: HwSigningData = {
  type: HwSigningType.MultiSig,
  path: [2147485502, 2147485463, 2147483648, 0, 0] as BIP32Path, // 1854'/1815'/0'/0/0
  cborXPubKeyHex: testXPubKeyCborHex,
}

const decode = (cborHex: string) => decodeTx(Buffer.from(cborHex, 'hex'))

const keyHashBuf = (hex: string): KeyHash => Buffer.from(hex, 'hex') as KeyHash

const stakeDeregistrationWithKeyHash = (keyHashHex: string) => ({
  type: CertificateType.STAKE_DEREGISTRATION as const,
  stakeCredential: {
    type: CredentialType.KEY_HASH as const,
    keyHash: keyHashBuf(keyHashHex),
  },
})

const stakeDeregistrationWithScriptHash = {
  type: CertificateType.STAKE_DEREGISTRATION as const,
  stakeCredential: {
    type: CredentialType.SCRIPT_HASH as const,
    scriptHash: Buffer.from(
      '00112233445566778899aabbccddeeff00112233445566778899aabb',
      'hex',
    ) as ScriptHash,
  },
}

const poolRetirement = {
  type: CertificateType.POOL_RETIREMENT as const,
  poolKeyHash: keyHashBuf(
    '13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad',
  ),
  epoch: 100 as Uint,
}

// 0xe1 header = key-hash reward account on mainnet, 0xf1 = script-hash (CIP-19)
const withdrawalWithRewardAccount = (header: number, hashHex: string) => ({
  rewardAccount: Buffer.concat([
    Buffer.from([header]),
    Buffer.from(hashHex, 'hex'),
  ]) as RewardAccount,
  amount: 0 as Uint,
})

// Synthesizes a TransactionBody by taking a known-good ordinary tx body and overriding fields.
const bodyWithOverrides = (
  overrides: Partial<TransactionBody>,
): TransactionBody => ({
  ...decode(ordinaryTxCborHex).body,
  ...overrides,
})

const bodyWithCertificates = (certificates: Certificate[]): TransactionBody =>
  bodyWithOverrides({
    certificates: {
      items: certificates,
      hasTag: false,
      _nonEmpty: true,
      _ordered: true,
    },
  })

describe('determineSigningMode', () => {
  it('infers ORDINARY_TRANSACTION for an ordinary tx', () => {
    const {body} = decode(ordinaryTxCborHex)
    assert.strictEqual(
      determineSigningMode(body, []),
      SigningMode.ORDINARY_TRANSACTION,
    )
  })

  it('infers POOL_REGISTRATION_AS_OWNER for a sole pool registration cert', () => {
    const {body} = decode(poolRegistrationTxCborHex)
    assert.strictEqual(
      determineSigningMode(body, []),
      SigningMode.POOL_REGISTRATION_AS_OWNER,
    )
  })

  it('keeps a POOL_REGISTRATION mode for pool registration combined with another certificate', () => {
    // No mode can sign such a tx — UNRESTRICTED rejects pool registration certs, too. The pool
    // registration mode is kept so that per-mode validation reports the violated rule precisely.
    const poolRegBody = decode(poolRegistrationTxCborHex).body
    const body: TransactionBody = {
      ...poolRegBody,
      certificates: {
        ...poolRegBody.certificates!,
        items: [
          ...poolRegBody.certificates!.items,
          stakeDeregistrationWithKeyHash(
            '1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c',
          ),
        ],
      },
    }
    assert.strictEqual(
      determineSigningMode(body, []),
      SigningMode.POOL_REGISTRATION_AS_OWNER,
    )
  })

  it('infers ORDINARY_TRANSACTION for a key-hash cert credential with a matching signing file', () => {
    const body = bodyWithCertificates([
      stakeDeregistrationWithKeyHash(testXPubKeyHashHex),
    ])
    assert.strictEqual(
      determineSigningMode(body, [paymentSigningFile]),
      SigningMode.ORDINARY_TRANSACTION,
    )
  })

  it('auto-applies UNRESTRICTED for a key-hash cert credential with no matching signing file', () => {
    const body = bodyWithCertificates([
      stakeDeregistrationWithKeyHash(
        'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      ),
    ])
    assert.strictEqual(determineSigningMode(body, []), SigningMode.UNRESTRICTED)
  })

  it('infers PLUTUS_TRANSACTION for a tx with reference inputs but no collateral inputs', () => {
    const {body} = decode(ordinaryTxCborHex)
    const txWithReferenceInputs = bodyWithOverrides({
      referenceInputs: {
        items: body.inputs.items,
        hasTag: false,
        _nonEmpty: true,
        _ordered: false,
      },
    })
    assert.strictEqual(
      determineSigningMode(txWithReferenceInputs, []),
      SigningMode.PLUTUS_TRANSACTION,
    )
  })

  it('infers MULTISIG_TRANSACTION for a script-hash cert credential with a multisig signing file', () => {
    const body = bodyWithCertificates([stakeDeregistrationWithScriptHash])
    assert.strictEqual(
      determineSigningMode(body, [multisigSigningFile]),
      SigningMode.MULTISIG_TRANSACTION,
    )
  })

  it('auto-applies UNRESTRICTED for a script-hash cert credential without a multisig signing file', () => {
    // The candidate mode is ORDINARY (no multisig signing files), which rejects script-hash
    // credentials.
    const body = bodyWithCertificates([stakeDeregistrationWithScriptHash])
    assert.strictEqual(
      determineSigningMode(body, [paymentSigningFile]),
      SigningMode.UNRESTRICTED,
    )
  })

  it('auto-applies UNRESTRICTED for a path-resolvable cert credential combined with a multisig signing file', () => {
    // The candidate mode is MULTISIG (multisig signing file present), which only accepts
    // script-hash credentials — but this credential would be sent as a key path.
    const body = bodyWithCertificates([
      stakeDeregistrationWithScriptHash,
      stakeDeregistrationWithKeyHash(testXPubKeyHashHex),
    ])
    assert.strictEqual(
      determineSigningMode(body, [multisigSigningFile]),
      SigningMode.UNRESTRICTED,
    )
  })

  it('auto-applies UNRESTRICTED for pool retirement in a multisig tx', () => {
    const body = bodyWithCertificates([
      stakeDeregistrationWithScriptHash,
      poolRetirement,
    ])
    assert.strictEqual(
      determineSigningMode(body, [multisigSigningFile]),
      SigningMode.UNRESTRICTED,
    )
  })

  it('auto-applies UNRESTRICTED for a withdrawal with no matching signing file', () => {
    const body = bodyWithOverrides({
      withdrawals: [
        withdrawalWithRewardAccount(
          0xe1,
          'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        ),
      ],
    })
    assert.strictEqual(determineSigningMode(body, []), SigningMode.UNRESTRICTED)
  })

  it('infers MULTISIG_TRANSACTION for a script-hash withdrawal with a multisig signing file', () => {
    const body = bodyWithOverrides({
      withdrawals: [
        withdrawalWithRewardAccount(
          0xf1,
          '00112233445566778899aabbccddeeff00112233445566778899aabb',
        ),
      ],
    })
    assert.strictEqual(
      determineSigningMode(body, [multisigSigningFile]),
      SigningMode.MULTISIG_TRANSACTION,
    )
  })

  it('auto-applies UNRESTRICTED for a voter with no matching signing file', () => {
    const body = bodyWithOverrides({
      votingProcedures: [
        {
          voter: {
            type: VoterType.STAKE_POOL,
            hash: keyHashBuf(
              'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            ),
          },
          votes: [],
        },
      ],
    })
    assert.strictEqual(determineSigningMode(body, []), SigningMode.UNRESTRICTED)
  })
})

describe('validateWitnessing in unrestricted mode', () => {
  const unrestrictedParams = (cborHex: string): TxSigningParameters => ({
    signingMode: SigningMode.UNRESTRICTED,
    tx: decode(cborHex),
    txBodyHashHex: '',
    hwSigningFileData: [],
    network: NETWORKS.MAINNET,
    era: CardanoEra.BABBAGE,
  })

  it('accepts an ordinary tx', () => {
    assert.doesNotThrow(() =>
      validateWitnessing(unrestrictedParams(ordinaryTxCborHex)),
    )
  })

  it('rejects a tx containing a pool registration certificate', () => {
    assert.throws(
      () => validateWitnessing(unrestrictedParams(poolRegistrationTxCborHex)),
      {
        message: Errors.PoolRegistrationCertificateNotAllowedInUnrestrictedMode,
      },
    )
  })
})
