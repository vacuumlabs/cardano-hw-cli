const assert = require('assert')
const { LedgerCryptoProvider } = require('../../../../src/crypto-providers/ledgerCryptoProvider')
const { NativeScriptType, NativeScriptDisplayFormat } = require('../../../../src/types')

const nativeScripts = {
  pubkey: {
    nativeScript: {
      type: NativeScriptType.PUBKEY,
      keyHash: '3a55d9f68255dfbefa1efd711f82d005fae1be2e145d616c90cf0fa9',
    },
    expectedNativeScriptHashHex: '855228f5ecececf9c85618007cc3c2e5bdf5e6d41ef8d6fa793fe0eb',
  },
  all: {
    nativeScript: {
      type: NativeScriptType.ALL,
      scripts: [
        {
          type: NativeScriptType.PUBKEY,
          keyHash: '14c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f1124',
        },
      ],
    },
    expectedNativeScriptHashHex: 'b442025ae01ccb227ecbfc013d1c17eae7f8d04d366ffff5a091d03f',
  },
  any: {
    nativeScript: {
      type: NativeScriptType.ANY,
      scripts: [
        {
          type: NativeScriptType.PUBKEY,
          keyHash: '14c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f1124',
        },
      ],
    },
    expectedNativeScriptHashHex: '74c6eec4851daab6cc93283b06d73c7ce1eccc20f6f9bfdb715a05f3',
  },
  nOfK: {
    nativeScript: {
      type: NativeScriptType.N_OF_K,
      required: 1,
      scripts: [
        {
          type: NativeScriptType.PUBKEY,
          keyHash: '14c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f1124',
        },
      ],
    },
    expectedNativeScriptHashHex: 'cea740b672a5a359030b0355098407368fb3d4fa1a7f46b4adb8e8f3',
  },
  invalidBefore: {
    nativeScript: {
      type: NativeScriptType.INVALID_BEFORE,
      slot: 100,
    },
    expectedNativeScriptHashHex: '15fa0f97f3fe447a10dfbbd71edae89fb15d2b1b80f805ffaace9a5b',
  },
  invalidHereafter: {
    nativeScript: {
      type: NativeScriptType.INVALID_HEREAFTER,
      slot: 200,
    },
    expectedNativeScriptHashHex: '81a8f494e6cfe6b2407c9f68beda19ac74193548ab7c9aa94fe935f6',
  },
}

async function testNativeScriptHashDerivation(cryptoProvider, { nativeScript, expectedNativeScriptHashHex }) {
  const nativeScriptHashHex = await cryptoProvider.deriveNativeScriptHash(
    nativeScript,
    NativeScriptDisplayFormat.POLICY_ID,
  )
  assert.deepStrictEqual(nativeScriptHashHex, expectedNativeScriptHashHex)
}

describe('Ledger native script hash derivation', () => {
  let cryptoProvider
  // eslint-disable-next-line func-names
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await LedgerCryptoProvider()
  })
  const nativeScriptsToDerive = Object.entries(nativeScripts)
  nativeScriptsToDerive.forEach(([nativeScriptName, nativeScript]) => it(
    `Should derive native script hash, script type "${nativeScriptName}"`,
    async () => testNativeScriptHashDerivation(cryptoProvider, nativeScript),
  ).timeout(100000))
})
