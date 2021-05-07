/* eslint-disable max-len */
const assert = require('assert')
const { LedgerCryptoProvider } = require('../../../../src/crypto-providers/ledgerCryptoProvider')

const { NETWORKS } = require('../../../../src/constants')
const { signingFiles } = require('./signingFiles')
const { addresses } = require('./addresses')

const votingRegistrations = {
  withBaseAddress0: {
    network: 'TESTNET',
    auxiliarySigningFiles: [signingFiles.payment0, signingFiles.stake0],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.testnet.base0,
    votePublicKeyHex: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
    nonce: 165564,
    signedVotingRegistrationMetaDataHex: 'a219ef64a40158203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b702582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e80358390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c041a000286bc19ef65a10158408a8cca0fbc26626c65eaf28608da21527c70c8f6136e3eb5166e8d665ef4f9f55e0b8063393d63bfa0104a1ac737a10c1c41a93a68d101a4cb0b405ec5bb6707',
  },
  withRewardAddress0: {
    network: 'TESTNET',
    auxiliarySigningFiles: [signingFiles.payment0, signingFiles.stake0],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.testnet.reward0,
    votePublicKeyHex: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
    nonce: 165564,
    signedVotingRegistrationMetaDataHex: 'a219ef64a40158203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b702582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e803581de01d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c041a000286bc19ef65a1015840d4401401a6f447c3e906c4dde2193f19a7c9085040c73f7941bb4cda212ada78a9c21f0b6e1afc54a34e17ecfc9e31bc46bb7836ffddf94b985e78f490159b06',
  },
}

async function testVotingRegistrationMetaDataSigning(cryptoProvider, votingRegistration) {
  const { signedVotingRegistrationMetaDataHex, ...args } = votingRegistration

  assert.deepStrictEqual(
    await cryptoProvider.signVotingRegistrationMetaData(
      args.auxiliarySigningFiles,
      args.hwStakeSigningFile,
      args.rewardAddressBech32,
      args.votePublicKeyHex,
      NETWORKS[args.network],
      args.nonce,
    ),
    signedVotingRegistrationMetaDataHex,
  )
}

describe('Ledger sign voting registration metadata', () => {
  let cryptoProvider
  // eslint-disable-next-line func-names
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await LedgerCryptoProvider()
  })
  const votingRegistrationsToSign = Object.entries(votingRegistrations)

  votingRegistrationsToSign.forEach(([votingRegistrationTestName, votingRegistration]) => it(
    `Should sign voting registration ${votingRegistrationTestName}`, async () => testVotingRegistrationMetaDataSigning(cryptoProvider, votingRegistration),
  ).timeout(100000))
})
