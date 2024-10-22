/* eslint-disable max-len */
import assert from 'assert'
import {LedgerCryptoProvider} from '../../../../src/crypto-providers/ledgerCryptoProvider'
import {CryptoProvider} from '../../../../src/crypto-providers/cryptoProvider'

import {signingFiles} from './signingFiles'
import {getTransport} from './speculos'
import { KeystoneCryptoProvider } from '../../../../src/crypto-providers/keystoneCryptoProvider'
import { TransportNodeUSB } from '@keystonehq/hw-transport-nodeusb'

const opCerts = {
  opcert1: {
    kesVKey: Buffer.from(
      'f70601c4de155e67797e057c07fb768b5590b2241b05ec30235a85b71e2ae858',
      'hex',
    ),
    kesPeriod: 251n,
    issueCounter: {
      counter: 1,
      poolColdKey: Buffer.from(
        '3d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d',
        'hex',
      ),
    },
    hwSigningFiles: [signingFiles.poolCold0],
    signedOpCertCborHex:
      '82845820f70601c4de155e67797e057c07fb768b5590b2241b05ec30235a85b71e2ae8580118fb5840b44fcc4505aee4c93a716014ec709d17b28e0c95637384b78d2f8a4cebb92d1e01b54ce952e11771bbeaceda0eaf7a660e5c416f357bdec94e4ce2977997d20458203d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d',
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function testOpCertSigning(cryptoProvider: CryptoProvider, opCert: any) {
  const signedOpCertCborHex = await cryptoProvider.signOperationalCertificate(
    opCert.kesVKey,
    opCert.kesPeriod,
    opCert.issueCounter,
    opCert.hwSigningFiles,
  )
  assert.deepStrictEqual(signedOpCertCborHex, opCert.signedOpCertCborHex)
}

describe('Ledger operational certificate', () => {
  let cryptoProvider: CryptoProvider
  // eslint-disable-next-line prefer-arrow-callback
  before(async function () {
    this.timeout(10000)
    cryptoProvider =await KeystoneCryptoProvider(await TransportNodeUSB.connect({
        timeout: 100000}))
  })
  const opCertsToSign = Object.entries(opCerts)
  opCertsToSign.forEach(([opCertTestName, opCert]) =>
    it(`Should sign operational certificate ${opCertTestName}`, async () =>
      await testOpCertSigning(cryptoProvider, opCert)).timeout(100000),
  )
})
