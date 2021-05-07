/* eslint-disable max-len */
const assert = require('assert')
const { TrezorCryptoProvider } = require('../../../../src/crypto-providers/trezorCryptoProvider')

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
    signedVotingRegistrationMetaDataHex: 'a219ef64a40158203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7025820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e0358390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277041a000286bc19ef65a1015840b58d8a168389bf29b654ff8c6b82b1f9d9d32f6f51f3a7ca2e41cb8d9098e2e8dd5da3d9641125318dac237d27e5136a6c5ad644e38dcd13383f783cd38b6c0a',
  },
  withRewardAddress0: {
    network: 'TESTNET',
    auxiliarySigningFiles: [signingFiles.payment0, signingFiles.stake0],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.testnet.reward0,
    votePublicKeyHex: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
    nonce: 165564,
    signedVotingRegistrationMetaDataHex: 'a219ef64a40158203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7025820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e03581de0122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277041a000286bc19ef65a10158404e84dc543384bd7bb7f9e6008e7fb50fc6f786964a884661f696c6877c11a90d807616033cca7648e105e9e3d6d9db94181d3636c62bc106f52262f6b1284b0d',
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

describe('Trezor sign voting registration metadata', () => {
  let cryptoProvider
  // eslint-disable-next-line func-names
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await TrezorCryptoProvider()
  })
  const votingRegistrationsToSign = Object.entries(votingRegistrations)

  votingRegistrationsToSign.forEach(([votingRegistrationTestName, votingRegistration]) => it(
    `Should sign voting registration ${votingRegistrationTestName}`, async () => testVotingRegistrationMetaDataSigning(cryptoProvider, votingRegistration),
  ).timeout(100000))
}).timeout(1000000)
