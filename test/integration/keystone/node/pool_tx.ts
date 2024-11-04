/* eslint-disable max-len */
import assert from 'assert'
import {decodeTx} from 'cardano-hw-interop-lib'
import {NETWORKS} from '../../../../src/constants'
import {
  determineSigningMode,
  getTxBodyHash,
} from '../../../../src/crypto-providers/util'
import {validateWitnessing} from '../../../../src/crypto-providers/witnessingValidation'
import {validateTxBeforeWitnessing} from '../../../../src/transaction/transactionValidation'

import {signingFiles} from './signingFiles'
import {CardanoEra} from '../../../../src/basicTypes'
import {CryptoProvider} from '../../../../src/crypto-providers/cryptoProvider'
import {TransportNodeUSB} from '@keystonehq/hw-transport-nodeusb'
import {KeystoneCryptoProvider} from '../../../../src/crypto-providers/keystoneCryptoProvider'

// Note for future readers (Dec 2022): The tests in this file were created in the cardano-cli's
// internal raw tx format. When we removed support for this format in favor of the CDDL-compliant
// format, we manually converted the test cases to the new format. Thus it is possible that some
// of the test cases would not be generated exactly as they are now by the cardano-cli - e.g. some
// native script witnesses might be missing due to the manual conversion.

const transactions = {
  ordinary_CertificatePoolRetirement: {
    cborHex:
      '83a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a04818304581cdbfee4665e58c8f8e9b9ff02b17f32e08a42c855476a5d867c2737b7186da0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.poolCold0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '3d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d',
              'hex',
            ),
            Buffer.from(
              '9a45328f1823a683723918313e2a421bf6c3a0e01964930ef9720db5409801d2816df50e5b066d57c427c104a36c6198b97c8192183cf53748f447ccb443aa08',
              'hex',
            ),
          ],
          path: signingFiles.poolCold0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2',
              'hex',
            ),
            Buffer.from(
              'db9082cd6f6157a201fbf2083e5b0d35ea4809f1ec9e40924ac981a3ee15bd79c0fd839adef0db5545967b3054f78f5df1d09617bd0785cc89c7a6468caafb03',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  poolRegistrationAsOwner_NoRelays: {
    // 997c29edb488dcd06df8ba1d9d4c857e8bf1450ecef43d648d69178bbabfb41e
    cborHex:
      '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8',
              'hex',
            ),
            Buffer.from(
              '98dbf7073ab0fe28afad08702bb9a363d638d55eed2ae6bc5c36a5137c36c9a806562180c8e33d0f3e74b27f61c7ebb7991e3cdb870af66e6fd9c943d197db0d',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
      ],
    },
  },

  poolRegistrationAsOwner_WithRelays: {
    // bc678441767b195382f00f9f4c4bddc046f73e6116fa789035105ecddfdee949
    cborHex:
      '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bba0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8',
              'hex',
            ),
            Buffer.from(
              '61fc06451462426b14fa3a31008a5f7d32b2f1793022060c02939bd0004b07f2bd737d542c2db6cef6dad912b9bdca1829a5dc2b45bab3c72afe374cef59cc04',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
      ],
    },
  },

  poolRegistrationAsOwner_BigIntOutputs: {
    // 5a788a7ed9624f30692f701c3778a245140c382a8a23a0caa78dd0013e93f308
    cborHex:
      '83a50081825820897c3429f794c44aecbe6f2e4f292836f3153f85ce2026b86a13ecbdbadaa05700018182581d60daad04ed2b7f69e2a9be582e37091739fa036a14c1c22f88061d43c71b0055a275925d560f021a000249f00319138804818a03581c61891bbdc08431a1d4d4911903dad04705f82e29a87e54cc77db217f582092c4a889cca979e804327595768d107295ad7cb6e9a787ef6b23b757ba3433381b0000b5e620f480001a1dcd6500d81e82030a581de05e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f1281581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c80f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8',
              'hex',
            ),
            Buffer.from(
              'affeb98e9e2a937e38f50a854dc857b4c60f64673626d2a3a1ac12f794ff6079d81c9cefa74a7590ba92206bd047c11614a0260089f6d1496cdc14fcb0f44e0f',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
      ],
    },
  },

  poolRegistrationAsOwner_WithMultiAsset: {
    // 28f655cb4baa746ed59d327362c09b1f5ca6a15d1edc9d8a7ec38b17196a10ac
    cborHex:
      '83a50082825820a2218c7738c374fa68fed428bf28447f550c3c33cb92a5bd06e2b62f3777953900825820ade4616f96066ab24f49dcd4adbcae9ae83750d34e4620a49d737d4a66835d6400018282583901bf63a166d9c10d85e4fd3401de03907e232e7707218c3bfd5a570d7acab53e9efebb49bafb4e74d675c2d682dd8e402f15885fb6d1bc0023821a0095b050a2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657404581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574044b7365636f6e646173736574048258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a0035476f021a0002e630031a0097fa4004818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8',
              'hex',
            ),
            Buffer.from(
              '72efd7b4f076b4ac3bb84b4e122d600d88c1445991985414eca2e49b01fff1013dfcc752fa6ab65309ca031d56ee0453a09dc5d0b8da1f1875f46f471c98140e',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
      ],
    },
  },

  poolRegistrationAsOperator: {
    cborHex:
      '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581cdbfee4665e58c8f8e9b9ff02b17f32e08a42c855476a5d867c2737b7582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bba0f6',
    hwSigningFiles: [signingFiles.poolCold0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '3d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d',
              'hex',
            ),
            Buffer.from(
              '9904d2575e3704b62866c005a606d3c272e5aaa9505165b316310d06b9f6f47797fb9319638df7f0e918285307ce157870fa43dd10345bb5a3b2905e1c888b0b',
              'hex',
            ),
          ],
          path: signingFiles.poolCold0.path,
        },
      ],
    },
  },
}

async function testTxWitnessing(
  cryptoProvider: CryptoProvider,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction: any,
) {
  validateTxBeforeWitnessing(transaction.cborHex)
  const txCbor = Buffer.from(transaction.cborHex, 'hex')
  const tx = decodeTx(txCbor)

  const signingParameters = {
    signingMode: determineSigningMode(tx.body, transaction.hwSigningFiles),
    tx,
    txBodyHashHex: getTxBodyHash(tx.body),
    hwSigningFileData: transaction.hwSigningFiles,
    network: NETWORKS[transaction.network],
    era: CardanoEra.BABBAGE,
  }
  const changeOutputFiles = transaction.changeOutputFiles || []
  validateWitnessing(signingParameters)
  const witnesses = await cryptoProvider.witnessTx(
    signingParameters,
    changeOutputFiles,
  )

  for (let i = 0; i < witnesses.shelleyWitnesses.length; i++) {
    console.log(witnesses.shelleyWitnesses[i].data[0].toString('hex'))
    console.log(
      transaction.witnesses.shelleyWitnesses[i].data[0].toString('hex'),
    )
    console.log('\n')
    console.log(witnesses.shelleyWitnesses[i].data[1].toString('hex'))
    console.log(
      transaction.witnesses.shelleyWitnesses[i].data[1].toString('hex'),
    )
    console.log('\n')
  }

  assert.deepStrictEqual(witnesses, transaction.witnesses)
}

describe('Keystone pool tx witnessing', () => {
  let cryptoProvider: CryptoProvider
  // eslint-disable-next-line prefer-arrow-callback
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await KeystoneCryptoProvider(
      await TransportNodeUSB.connect({
        timeout: 100000,
      }),
    )
  })
  const txs = Object.entries(transactions)

  txs.forEach(([txType, tx]) =>
    it(`Should witness pool tx ${txType}`, async () =>
      await testTxWitnessing(cryptoProvider, tx)).timeout(100000),
  )
})
