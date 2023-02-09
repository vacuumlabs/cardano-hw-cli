/* eslint-disable max-len */
import assert from 'assert'
import { TrezorCryptoProvider } from '../../../../src/crypto-providers/trezorCryptoProvider'

import { NETWORKS } from '../../../../src/constants'
import { signingFiles } from './signingFiles'
import { addresses } from './addresses'
import { CryptoProvider } from '../../../../src/crypto-providers/types'

const cip36Registrations = {
  withTestnetBaseAddress0: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 1,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    paymentAddressBech32: addresses.testnet.base0,
    nonce: 165564,
    votingPurpose: 0,
    network: 'TESTNET_LEGACY1',
    auxiliarySigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedCIP36RegistrationMetaDataHex: 'a219ef64a501818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b701025820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e0358390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277041a000286bc050019ef65a1015840d93fbfa58e4bed5c1474a6196ef7c9a87417403a45dcd9a96fc7ac51154e788f6285d1498f8d0e41ee87d8e62ae49f1a070a4677940abebcf3f274bfa60d7001',
  },
  withMainnetBaseAddress0: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 1,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    paymentAddressBech32: addresses.mainnet.base0,
    nonce: 165564,
    votingPurpose: 0,
    network: 'MAINNET',
    auxiliarySigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedCIP36RegistrationMetaDataHex: 'a219ef64a501818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b701025820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e0358390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277041a000286bc050019ef65a10158400e08dba5d4336c1c7b52cfd95ff2b016ca37cd476756f4217e8d7ecb1c95d09d372d87b8d8da88f701736e6ec15f46d6e55999afa54ecce6adc04da8cf927600',
  },
  withTestnetPaymentAddress0: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 1,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    paymentAddressBech32: addresses.testnet.reward0,
    nonce: 165564,
    votingPurpose: 0,
    network: 'TESTNET_LEGACY1',
    auxiliarySigningFiles: [signingFiles.stake0],
    signedCIP36RegistrationMetaDataHex: 'a219ef64a501818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b701025820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e03581de0122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277041a000286bc050019ef65a101584077cfc29043677f9061ca4b9b7004d6105e67f9488e9616cd5b5bc9dee5f4ff09db288af602bc3fabd8e259d0a080927f787af23d0e1a698898eaceb65efd6901',
  },
  withMultipleDelegations: {
    delegations: [
      {
        votePublicKey: '3b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7',
        voteWeight: 1,
      },
      {
        votePublicKey: '1af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc',
        voteWeight: 2,
      },
    ],
    hwStakeSigningFile: signingFiles.stake0,
    paymentAddressBech32: addresses.mainnet.reward0,
    nonce: 165564,
    votingPurpose: 0,
    network: 'MAINNET',
    auxiliarySigningFiles: [signingFiles.stake0],
    signedCIP36RegistrationMetaDataHex: 'a219ef64a501828258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7018258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc02025820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e03581de1122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277041a000286bc050019ef65a10158408dcc41c03e7fe9b281f00c9ac2a8418d4fce9c0673f163088f45a014ad30d8740cb60b065ecdb073d44bb0595e519f9e584c6620258f27e20432706999e7a604',
  },
}

async function testCIP36RegistrationMetaDataSigning(cryptoProvider: CryptoProvider, cip36Registration: any) {
  const { signedCIP36RegistrationMetaDataHex, ...args } = cip36Registration

  assert.deepStrictEqual(
    await cryptoProvider.signCIP36RegistrationMetaData(
      args.delegations,
      args.hwStakeSigningFile,
      args.paymentAddressBech32,
      args.nonce,
      args.votingPurpose,
      NETWORKS[args.network],
      args.auxiliarySigningFiles,
    ),
    signedCIP36RegistrationMetaDataHex,
  )
}

describe('Trezor sign CIP36 registration metadata', () => {
  let cryptoProvider: CryptoProvider
  // eslint-disable-next-line prefer-arrow-callback
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await TrezorCryptoProvider()
  })
  const cip36RegistrationsToSign = Object.entries(cip36Registrations)

  cip36RegistrationsToSign.forEach(([testName, cip36Registration]) => it(
    `Should sign CIP36 registration ${testName}`,
    async () => testCIP36RegistrationMetaDataSigning(cryptoProvider, cip36Registration),
  ).timeout(100000))
}).timeout(1000000)
