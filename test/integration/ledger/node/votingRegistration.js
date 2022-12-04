/* eslint-disable max-len */
const assert = require('assert')
const { LedgerCryptoProvider } = require('../../../../src/crypto-providers/ledgerCryptoProvider')

const { NETWORKS } = require('../../../../src/constants')
const { signingFiles } = require('./signingFiles')
const { addresses } = require('./addresses')
const { getTransport } = require('./speculos')

const votingRegistrations = {
  withTestnetBaseAddress0: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 2,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.testnet.base0,
    nonce: 165564,
    votingPurpose: 0,
    network: 'TESTNET_LEGACY',
    auxiliarySigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedVotingRegistrationMetaDataHex: 'a219ef64a501818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b70202582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e80358390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c041a000286bc050019ef65a101584031aafad1223d2ac49584e55cf1232221bdb2312b826fef7c901d5802f987a391f4a57b82416de34d60ee13b3a823a61aadec0b0cf09c529efe56922ec3c1ab0c',
  },
  withMainnetBaseAddress0: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 2,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.mainnet.base0,
    nonce: 165564,
    votingPurpose: 1,
    network: 'MAINNET',
    auxiliarySigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedVotingRegistrationMetaDataHex: 'a219ef64a501818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b70202582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e80358390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c041a000286bc050119ef65a1015840fc76d0ef0e195b8d03a8988f7983c2d881b2fa1098762010d8a61270a779620a4a98361879344f1bc3bda7d33736ae3536d89aec65e4e6adaef15ccc90fa4704',
  },
  withTestnetRewardAddress0: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 1,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.testnet.reward0,
    nonce: 165564,
    votingPurpose: 0,
    network: 'TESTNET_LEGACY',
    auxiliarySigningFiles: [signingFiles.stake0],
    signedVotingRegistrationMetaDataHex: 'a219ef64a501818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b70102582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e803581de01d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c041a000286bc050019ef65a1015840b8d4e3315af77091fc78e1aef92d07121f8d767b65940ad46632d9a835d709aa2f64293beaa077c5c094e43e0bfc479717e6cc54842cdc28cecb2f34ec315507',
  },
  withMultipleDelegations: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 1,
      },
      {
        votePublicKey: '3eadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        voteWeight: 3,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.mainnet.reward0,
    nonce: 165564,
    votingPurpose: 0,
    network: 'MAINNET',
    auxiliarySigningFiles: [signingFiles.stake0],
    signedVotingRegistrationMetaDataHex: 'a219ef64a501828258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7018258203eadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef0302582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e803581de11d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c041a000286bc050019ef65a10158401500c4a09b763d5d396933f264d93e51e2aaf85ea41958d3425f1248c72b9d75215857eec227a21a14341efab85ac68882ed246a124398c9f9645b1921cd460c',
  },
  withThirdPartyRewardAddress: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 2,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    rewardAddressBech32: addresses.mainnet.base0,
    nonce: 165564,
    votingPurpose: 1,
    network: 'MAINNET',
    auxiliarySigningFiles: [],
    signedVotingRegistrationMetaDataHex: 'a219ef64a501818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b70202582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e80358390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c041a000286bc050119ef65a1015840fc76d0ef0e195b8d03a8988f7983c2d881b2fa1098762010d8a61270a779620a4a98361879344f1bc3bda7d33736ae3536d89aec65e4e6adaef15ccc90fa4704',
  },
}

async function testVotingRegistrationMetaDataSigning(cryptoProvider, votingRegistration) {
  const { signedVotingRegistrationMetaDataHex, ...args } = votingRegistration

  assert.deepStrictEqual(
    await cryptoProvider.signVotingRegistrationMetaData(
      args.delegations,
      args.hwStakeSigningFile,
      args.rewardAddressBech32,
      args.nonce,
      args.votingPurpose,
      NETWORKS[args.network],
      args.auxiliarySigningFiles,
    ),
    signedVotingRegistrationMetaDataHex,
  )
}

describe('Ledger sign voting registration metadata', () => {
  let cryptoProvider
  // eslint-disable-next-line func-names
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await LedgerCryptoProvider(await getTransport())
  })
  const votingRegistrationsToSign = Object.entries(votingRegistrations)

  votingRegistrationsToSign.forEach(([votingRegistrationTestName, votingRegistration]) => it(
    `Should sign voting registration ${votingRegistrationTestName}`,
    async () => testVotingRegistrationMetaDataSigning(cryptoProvider, votingRegistration),
  ).timeout(100000))
})
