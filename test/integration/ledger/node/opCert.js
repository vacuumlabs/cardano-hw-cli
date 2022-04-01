/* eslint-disable max-len */
const assert = require('assert')
const { LedgerCryptoProvider } = require('../../../../src/crypto-providers/ledgerCryptoProvider')

const { signingFiles } = require('./signingFiles')
const { getTransport } = require('./speculos')

const opCerts = {
  opcert1: {
    kesVKey: Buffer.from('f70601c4de155e67797e057c07fb768b5590b2241b05ec30235a85b71e2ae858', 'hex'),
    kesPeriod: 251, // fails when I use BigInt(251)   ???
    issueCounter: {
      counter: 1,
      poolColdKey: Buffer.from('3d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d', 'hex'),
    },
    hwSigningFiles: [signingFiles.poolCold0],
    signedOpCertCborHex: '82845820f70601c4de155e67797e057c07fb768b5590b2241b05ec30235a85b71e2ae8580118fb5840b44fcc4505aee4c93a716014ec709d17b28e0c95637384b78d2f8a4cebb92d1e01b54ce952e11771bbeaceda0eaf7a660e5c416f357bdec94e4ce2977997d20458203d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d',
  },
}

async function testOpCertSigning(cryptoProvider, opCert) {
  const signedOpCertCborHex = await cryptoProvider.signOperationalCertificate(
    opCert.kesVKey,
    opCert.kesPeriod,
    opCert.issueCounter,
    opCert.hwSigningFiles,
  )
  assert.deepStrictEqual(signedOpCertCborHex, opCert.signedOpCertCborHex)
}

describe('Ledger operational certificate', () => {
  let cryptoProvider
  // eslint-disable-next-line func-names
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await LedgerCryptoProvider(await getTransport())
  })
  const opCertsToSign = Object.entries(opCerts)
  opCertsToSign.forEach(([opCertTestName, opCert]) => it(
    `Should sign operational certificate ${opCertTestName}`,
    async () => testOpCertSigning(cryptoProvider, opCert),
  ).timeout(100000))
})
