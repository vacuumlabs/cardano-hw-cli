/* eslint-disable max-len */
import assert from 'assert'
import {decodeTx} from 'cardano-hw-interop-lib'
import {determineSigningMode} from '../../../src/crypto-providers/util'
import {validateWitnessing} from '../../../src/crypto-providers/witnessingValidation'
import {
  SigningMode,
  TxSigningParameters,
} from '../../../src/crypto-providers/cryptoProvider'
import {Errors} from '../../../src/errors'
import {NETWORKS} from '../../../src/constants'
import {CardanoEra} from '../../../src/basicTypes'

// An ordinary tx (inputs/outputs/fee/ttl), no certificates.
const ordinaryTxCborHex =
  '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca0f6'

// A tx containing a stake pool registration certificate.
const poolRegistrationTxCborHex =
  '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6a0f6'

const decode = (cborHex: string) => decodeTx(Buffer.from(cborHex, 'hex'))

describe('determineSigningMode with --unrestricted', () => {
  it('infers ORDINARY_TRANSACTION for an ordinary tx without the flag', () => {
    const {body} = decode(ordinaryTxCborHex)
    assert.strictEqual(
      determineSigningMode(body, []),
      SigningMode.ORDINARY_TRANSACTION,
    )
  })

  it('returns UNRESTRICTED_TRANSACTION when unrestricted is true', () => {
    const {body} = decode(ordinaryTxCborHex)
    assert.strictEqual(
      determineSigningMode(body, [], true),
      SigningMode.UNRESTRICTED_TRANSACTION,
    )
  })

  it('keeps the inferred mode when unrestricted is false', () => {
    const {body} = decode(ordinaryTxCborHex)
    assert.strictEqual(
      determineSigningMode(body, [], false),
      SigningMode.ORDINARY_TRANSACTION,
    )
  })

  it('takes precedence over auto-inference (overrides pool registration)', () => {
    const {body} = decode(poolRegistrationTxCborHex)
    // Without the flag this tx is auto-inferred as a pool registration.
    assert.strictEqual(
      determineSigningMode(body, []),
      SigningMode.POOL_REGISTRATION_AS_OWNER,
    )
    // With the flag, unrestricted wins regardless of tx contents.
    assert.strictEqual(
      determineSigningMode(body, [], true),
      SigningMode.UNRESTRICTED_TRANSACTION,
    )
  })
})

describe('validateWitnessing in unrestricted mode', () => {
  const unrestrictedParams = (cborHex: string): TxSigningParameters => ({
    signingMode: SigningMode.UNRESTRICTED_TRANSACTION,
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
