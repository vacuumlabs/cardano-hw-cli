/* eslint-disable max-len */
const assert = require('assert')
const { decodeTx } = require('cardano-hw-interop-lib')
const { LedgerCryptoProvider } = require('../../../../src/crypto-providers/ledgerCryptoProvider')
const { NETWORKS } = require('../../../../src/constants')
const { determineSigningMode, getTxBodyHash } = require('../../../../src/crypto-providers/util')
const { validateWitnessing } = require('../../../../src/crypto-providers/witnessingValidation')
const { validateTxBeforeWitnessing } = require('../../../../src/transaction/transactionValidation')

const { signingFiles } = require('./signingFiles')
const { getTransport } = require('./speculos')

const transactions = {

  ordinary_InputAndOutput: {
    // ca7b59e959a6a7cf570468438c728c7693bc1582450b89ea095f3d04ae312e6a
    cborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('93cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220a', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_InputAndOutputWithEmptyScriptWitnesses: {
    // 2aceac80d26c849bd927b5c3ae209c75ec45bd5a513f834f349747ceecdf3b38
    cborHex: '83a300818258202e6d090cf9ea1d422bdb194f9f2c0c8e8f788ff5c17af820b7b8baa447786a9000018182583901724038f8b030597ed190929f13fea3d557138b48c74cafd30d4b6c42876c29f8c45c3fa7d3af0ea45fb2564ace831f70e7d3d5b8c251739a1a002ae090021a0002e630a0f6',
    hwSigningFiles: [signingFiles.payment0account1],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('66e283c52a7f05ca79db5483380597c0bb01abfb5bd8af27d5ed2487875d3b82', 'hex'),
            Buffer.from('4023b019cac0540b4ee3a83d9fbf245173f612de8f26f279c23bac5d3ed9f018c95bd661ab03661da1656678b06ff8151cdda5539a252628afde298a99d26203', 'hex'),
          ],
          path: signingFiles.payment0account1.path,
        },
      ],
    },
  },

  ordinary_ByronInputAndOutput: {
    // 2a5eb80636ea07b703001eb408b607c38a4204dbe5d216352f384ed61ab66d70
    cborHex: '83a40082825820a160aea80fa85221810099305045a6a3bc345709eee4d68eb4b7e04f0894a1cb00825820d1831359e7a231e0352ef12188f6a4e450a9958bb78cf7740200d449f0fe443600018282582b82d818582183581c0d6a5a6a4b44454b78ff68105bf6eb648984737032a31a724cb08fa3a0001a87b0e2651a001e84808258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00537971021a0002b779031a00ac55f3a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.byron10],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [
        {
          key: 2,
          data: [
            Buffer.from('90ca5e64214a03ec975e5097c25b2a49d4ca4988243bc0142b5ada743d80b9d5', 'hex'),
            Buffer.from('88632f148f3092f50218374d2bf602a78e4a50dc55c51f0ef32306b49413df3757657380c35cf878a102f728c313ecbe9f37f6eb6a6b64f724ef1b7bee480f0c', 'hex'),
            Buffer.from('be68538e05e31dc8fff62a62868c43f229cacbee5c40cbe6493929ad1f0e3cd9', 'hex'),
            Buffer.from('a0', 'hex'),
          ],
          path: signingFiles.byron10.path,
        },
      ],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('e3e6c81a40f2a3a4ace9a5b3a7dfbac12a9f69115d0800145e163f4ed347dd9367e4e06ae6c4f4899b19c958c88fa4b81b17679b135a45b85f84aa0216ffc408', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_TestnetOutputs: {
    // ebdace28e630ee2d2048460bf2ebca31c2b0ad775206b78255ecf6f4e955b86e
    cborHex: '83a40081825820c8f0d737ca5c647c434fea02759755a404d9915c3bd292bd7443ae9e46f5b7b1000181825839003b04dabe6e473ebffa196a2cee191cba32a25a8dc71f2fa35e74785b5e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f121b00005af31077b2cf021a00028d31031a0081b320a0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('b4e0fcd0eb5709e41fe2ebaa150253988b107e73b2a2f6f4a1b35e4151ee055e4643495dde0d95cd66f877d076a59579c46956e6549575e1cdc9c4cd2c733e09', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_WithValidityIntervalStart: {
    // a2218c7738c374fa68fed428bf28447f550c3c33cb92a5bd06e2b62f37779539
    cborHex: '83a5008182582014fee2d6da11448c33c63d3f33eaafa33fbb55523a8e7a59f3454d4ff143f5f60001818258390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c821a00382d9fa2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657404581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574044b7365636f6e64617373657404021a0002e630031a0097fa40081a0089c970a0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('cdd429b33a126763872137283ecceed9d64803e8d70ff499f5b51fa96c0f066259f70a124e728006f4eb7b9f911c25591a77ef6a75244ab80cf46ac4d5b53305', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_MultiAssetInputAndOutput: {
    // 14fee2d6da11448c33c63d3f33eaafa33fbb55523a8e7a59f3454d4ff143f5f6
    cborHex: '83a300818258204592a808e80c8dcd3a5fa3d1ce4d480a97e1c58776190a3f6faad445a77ecc2e0001818258390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c821a003b13cfa2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657404581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574044b7365636f6e64617373657404021a0002e630a0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('76d30b08a504b2ecf8de05d195868046ef10c368e489b56f5c5613f111cbe617ccc1fc6adaa0bc78a5dbf3f4857e12afcfc2b80bc9b6bb2427745396003db804', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_MultipleAssetInputsAndOutputs: {
    // 28f655cb4baa746ed59d327362c09b1f5ca6a15d1edc9d8a7ec38b17196a10ac
    cborHex: '83a50082825820a2218c7738c374fa68fed428bf28447f550c3c33cb92a5bd06e2b62f3777953900825820ade4616f96066ab24f49dcd4adbcae9ae83750d34e4620a49d737d4a66835d6400018282583900bf63a166d9c10d85e4fd3401de03907e232e7707218c3bfd5a570d7acab53e9efebb49bafb4e74d675c2d682dd8e402f15885fb6d1bc0023821a0095b050a2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657404581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574044b7365636f6e646173736574048258390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a0035476f021a0002e630031a0097fa40081a0089c970a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.payment1],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('93067db3757c9f840ca08d42dd3379773e2f279960ccac9c2b109901ff6a3936c6fb6438e43025279ba609ef6c24ef9d653b56db8e80f2ae3c864747c3a6110d', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('b3d5f4158f0c391ee2a28a2e285f218f3e895ff6ff59cb9369c64b03b5bab5eb', 'hex'),
            Buffer.from('1055fe293226f9ba6850a6374a12eb84343a7efa678f881b14cc2f9a21a0260614fa1e4b468d88f4a92a5e13fa4ca0cc293f23ac47d1ed7a20005bbba33d0b03', 'hex'),
          ],
          path: signingFiles.payment1.path,
        },
      ],
    },
  },

  ordinary_WithWithdrawal: {
    // de59b913705be59f6aff90df6eccfe4f0f115bc8de8306a77b188642b763ad61
    cborHex: '83a50081825820bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b0001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00311cba021a0002c431031a00ac30b105a1581de11d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a000ded3aa0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
            Buffer.from('eeb76938fd9676a34ba0710dc27810d087507b3a75ac6f67543b0b22405c927ad9f575a258aa7ed1dd1bbf3d24596315ffba8d630e0a1ea8d105826b865b3808', 'hex'),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('501a09efd212efd741574e63e9ff6c701746cac68ddcba3af5ef655ff1e724399adef1eb258ffdb34fd09d7b91c4b2f612bfba083b2debaa87ed93fcf4bc1f08', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_CertificateStakingKeyDeregistration: {
    // 148aa5e66a734657fbe4125ec028b231adf40e9bd426493fadd387453c1ff4bf
    cborHex: '83a50081825820de59b913705be59f6aff90df6eccfe4f0f115bc8de8306a77b188642b763ad610001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a004cbb0a021a0002e630031a00ac352f048182018200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61ca0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
            Buffer.from('5bdfbda835bd3ed18043c399249561159a95d40bd1162bc8288f3319601519f1a7a01fdcca18a3ba598cc300f6f74e9c67dc203d7fb1300b8ce09ab5473ba905', 'hex'),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('be03013f49435795c02c6fd38057841133c0787fd80cca4a607d0b91ad8bd83f545b95a276f85b4568fdab3db851844cc88d9e77ad2080776fcef6679ec4be03', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_CertificateDelegation: {
    // a160aea80fa85221810099305045a6a3bc345709eee4d68eb4b7e04f0894a1cb
    cborHex: '83a5008182582071b1f4d93070d035b27ce482784617238f75342d7d2da77a97828c9f561bff380001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00286a2a021a0002e630031a00ac3962048183028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
            Buffer.from('9ed729fd0cd2b44a24aaceb4b0ba5d67c1130d1e6e23fdd8f696d873e4ccd4337aea112323ccdcc12eb9db1d89760dd9577e86e4b722618e997d7d4d1bf9130c', 'hex'),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('47d07eb25370e2c90b894aae04de382d49186645f67467e58a1af0ede05e1e00c0baf09dd277dfc7c8f2cd77f014ff120eb823d62f900dd98fd71093740fdd02', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_CertificateDelegation_HwsfilesSwappedOrder: {
    cborHex: '83a5008182582071b1f4d93070d035b27ce482784617238f75342d7d2da77a97828c9f561bff380001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00286a2a021a0002e630031a00ac3962048183028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a0f6',
    hwSigningFiles: [signingFiles.stake0, signingFiles.payment0],
    signedTxCborHex: '83a5008182582071b1f4d93070d035b27ce482784617238f75342d7d2da77a97828c9f561bff380001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00286a2a021a0002e630031a00ac3962048183028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a1008282582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e858409ed729fd0cd2b44a24aaceb4b0ba5d67c1130d1e6e23fdd8f696d873e4ccd4337aea112323ccdcc12eb9db1d89760dd9577e86e4b722618e997d7d4d1bf9130c825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584047d07eb25370e2c90b894aae04de382d49186645f67467e58a1af0ede05e1e00c0baf09dd277dfc7c8f2cd77f014ff120eb823d62f900dd98fd71093740fdd02f6',
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
            Buffer.from('9ed729fd0cd2b44a24aaceb4b0ba5d67c1130d1e6e23fdd8f696d873e4ccd4337aea112323ccdcc12eb9db1d89760dd9577e86e4b722618e997d7d4d1bf9130c', 'hex'),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('47d07eb25370e2c90b894aae04de382d49186645f67467e58a1af0ede05e1e00c0baf09dd277dfc7c8f2cd77f014ff120eb823d62f900dd98fd71093740fdd02', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_CertificateStakeKeyRegistrationAndDelegation: {
    // 71b1f4d93070d035b27ce482784617238f75342d7d2da77a97828c9f561bff38
    cborHex: '83a50081825820148aa5e66a734657fbe4125ec028b231adf40e9bd426493fadd387453c1ff4bf0001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b505a021a0002e630031a00ac3809048282008200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c83028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
            Buffer.from('82263d344567e6614f8493dc53fcc7737839bcf57f8566a8cd1e4b98b18704972a8e1784ca4d910986d9e706982a1a51b264b83ef25dfb17388ff23d8e124202', 'hex'),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('f0dff23af401202122f8681c1b2c78ec160fdb6b16a8d992ccbe86900e6fc377f0032102eab446ccb0b186f8fe929a11a2d5dfa42bd5505bf6d3e0125ea02107', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_CertificatePoolRetirement: {
    cborHex: '83a500818258201af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc00018182582b82d818582183581c9e1c71de652ec8b85fec296f0685ca3988781c94a2e1a5d89d92f45fa0001a0d0c25611a002dd2e802182a030a04818304581cdbfee4665e58c8f8e9b9ff02b17f32e08a42c855476a5d867c2737b7186da0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.poolCold0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('3d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d', 'hex'),
            Buffer.from('9a45328f1823a683723918313e2a421bf6c3a0e01964930ef9720db5409801d2816df50e5b066d57c427c104a36c6198b97c8192183cf53748f447ccb443aa08', 'hex'),
          ],
          path: signingFiles.poolCold0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('db9082cd6f6157a201fbf2083e5b0d35ea4809f1ec9e40924ac981a3ee15bd79c0fd839adef0db5545967b3054f78f5df1d09617bd0785cc89c7a6468caafb03', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  poolRegistrationAsOwner_NoRelays: {
    // 997c29edb488dcd06df8ba1d9d4c857e8bf1450ecef43d648d69178bbabfb41e
    cborHex: '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [{
        key: 0,
        data: [
          Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
          Buffer.from('98dbf7073ab0fe28afad08702bb9a363d638d55eed2ae6bc5c36a5137c36c9a806562180c8e33d0f3e74b27f61c7ebb7991e3cdb870af66e6fd9c943d197db0d', 'hex'),
        ],
        path: signingFiles.stake0.path,
      }],
    },
  },

  poolRegistrationAsOwner_WithRelays: {
    // bc678441767b195382f00f9f4c4bddc046f73e6116fa789035105ecddfdee949
    cborHex: '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bba0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [{
        key: 0,
        data: [
          Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
          Buffer.from('61fc06451462426b14fa3a31008a5f7d32b2f1793022060c02939bd0004b07f2bd737d542c2db6cef6dad912b9bdca1829a5dc2b45bab3c72afe374cef59cc04', 'hex'),
        ],
        path: signingFiles.stake0.path,
      }],
    },
  },

  poolRegistrationAsOwner_BigIntOutputs: {
    // 5a788a7ed9624f30692f701c3778a245140c382a8a23a0caa78dd0013e93f308
    cborHex: '83a50081825820897c3429f794c44aecbe6f2e4f292836f3153f85ce2026b86a13ecbdbadaa05700018182581d60daad04ed2b7f69e2a9be582e37091739fa036a14c1c22f88061d43c71b0055a275925d560f021a000249f00319138804818a03581c61891bbdc08431a1d4d4911903dad04705f82e29a87e54cc77db217f582092c4a889cca979e804327595768d107295ad7cb6e9a787ef6b23b757ba3433381b0000b5e620f480001a1dcd6500d81e82030a581de05e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f1281581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c80f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [{
        key: 0,
        data: [
          Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
          Buffer.from('affeb98e9e2a937e38f50a854dc857b4c60f64673626d2a3a1ac12f794ff6079d81c9cefa74a7590ba92206bd047c11614a0260089f6d1496cdc14fcb0f44e0f', 'hex'),
        ],
        path: signingFiles.stake0.path,
      }],
    },
  },

  poolRegistrationAsOwner_WithMultiAsset: {
    // 28f655cb4baa746ed59d327362c09b1f5ca6a15d1edc9d8a7ec38b17196a10ac
    cborHex: '83a50082825820a2218c7738c374fa68fed428bf28447f550c3c33cb92a5bd06e2b62f3777953900825820ade4616f96066ab24f49dcd4adbcae9ae83750d34e4620a49d737d4a66835d6400018282583901bf63a166d9c10d85e4fd3401de03907e232e7707218c3bfd5a570d7acab53e9efebb49bafb4e74d675c2d682dd8e402f15885fb6d1bc0023821a0095b050a2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657404581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574044b7365636f6e646173736574048258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a0035476f021a0002e630031a0097fa4004818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [{
        key: 0,
        data: [
          Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
          Buffer.from('72efd7b4f076b4ac3bb84b4e122d600d88c1445991985414eca2e49b01fff1013dfcc752fa6ab65309ca031d56ee0453a09dc5d0b8da1f1875f46f471c98140e', 'hex'),
        ],
        path: signingFiles.stake0.path,
      }],
    },
  },

  poolRegistrationAsOperator: {
    cborHex: '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581cdbfee4665e58c8f8e9b9ff02b17f32e08a42c855476a5d867c2737b7582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bba0f6',
    hwSigningFiles: [signingFiles.poolCold0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [{
        key: 0,
        data: [
          Buffer.from('3d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d', 'hex'),
          Buffer.from('9904d2575e3704b62866c005a606d3c272e5aaa9505165b316310d06b9f6f47797fb9319638df7f0e918285307ce157870fa43dd10345bb5a3b2905e1c888b0b', 'hex'),
        ],
        path: signingFiles.poolCold0.path,
      }],
    },
  },

  withMetaData: {
    // afcf8497561065afe1ca623823508753cc580eb575ac8f1d6cfaa18c3ceeac01
    cborHex: '83a400818258200a0172847d39d5ecb8ed921130415ba01b6c785651b99e9fe969b7837181bf5b0001818258390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00e1fb90021a0002e6300758207ad89f0443618428fbf1e9024686a20ee284735a993f9e770896c1a0a8c87014a082a1016763617264616e6f80',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('4cadece6fa2e7bb8a52d7d7e3204e0a0540a28bcd072a0a5ab57967f5d95e3f3b4c11450be7c7b161ed7acef21ec0a11ba645ad7383ed09ea2d112a85da86b00', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_withMint: {
    cborHex: '83a5008182582048665d1d06d3ad6671429b3dc47ff73b1f4ceaa3b9052fb4833bc724ac55a3460001818258390014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c821a3b980a73a1581cdc0cbdad231110934c2f144587ffbb1537396e8c53be8d2cba4dfd79a14756616375756d731a000f4240021a0002bf8d031a024171a809a1581cdc0cbdad231110934c2f144587ffbb1537396e8c53be8d2cba4dfd79a14756616375756d731a000f4240a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.mint0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('c3595cfde66b57fed17d413579a1040713eb8d4924800dd08c76189013f21f1e3399fa65421162b466c6c34a35e46bfaf02a461dd947f8e6ed7b6a5d79e6f409', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('b9de636bf236e5543377e4b4d6b63613f188fb65b83b8a61c4b68be0c196c3d8', 'hex'),
            Buffer.from('ab54a8a54ccddc5b68e8e6f16caf8a47bf6b815908b74f505fa081eea6301b6029dcef642dc3a4f035bc3624290b5c834b85f54bdac5d6a31d1b8c42982c0808', 'hex'),
          ],
          path: signingFiles.mint0.path,
        },
      ],
    },
  },

  multisig_withMultisigPaymentAddress: {
    // Tx sending ADA from address defined by `all` script which has two pubkey
    // hashes defined by the signing files below, that's why we need both
    // signing files to sign this transaction
    cborHex: '83a4008182582017ad99d6729537cf7e7bdaf5cc262c77bb0a578c2907a8948c7264d11cd58278000181825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a3b980b23021a0002bedd031a02407922a0f6',
    hwSigningFiles: [signingFiles.multisigPayment0, signingFiles.multisigPayment1],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0', 'hex'),
            Buffer.from('89f5706a7e0e7ac2d2f1f8d6631090b6bde479d887c331c27971734124aedb699cb194b430ff4929d669e7ea57d2855d20dfcf04901a8fbb17e5b90c3e18de01', 'hex'),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e', 'hex'),
            Buffer.from('f8a239f7c0f0587987aaf89496e23ad4574639458cf1ae3e158770a893e446d00f203cdfa74f2d63387df67bb1a18468490d8e37329f78d292599f68cfcff700', 'hex'),
          ],
          path: signingFiles.multisigPayment1.path,
        },
      ],
    },
  },

  multisig_stakeAddressRegistrationCertificate: {
    // Registers a script stake address that is used in the withdrawal below
    cborHex: '83a50081825820d5757f5ba07b09ee050692cebf3c605af12ff73c1eea4c99a769eae831850ec400018182583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb4011a3b6e88c7021a0002aa11031a0243037d048182008201581cb494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb401a0f6',
    hwSigningFiles: [signingFiles.multisigPayment0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0', 'hex'),
            Buffer.from('37e4343aa3fbd6097b787ff67d3ecd391be7a8b558a6a0d1aff29fc5191a2b3ba618387f8a89ac4d41a61f7040594a09aa269f9c484cfba1c1bc8d2f239c3308', 'hex'),
          ],
          path: signingFiles.multisigPayment0.path,
        },
      ],
    },
  },

  multisig_withdrawFromScriptStakeAddress: {
    // Withdraws from the script stake address defined by an `all` script which
    // contains two stake pubkey hashes defined by the signing files below. For
    // withdrawal we then need signature from both.
    cborHex: '83a400818258202074b3783b7739037cabe8d6e9f2ca2ac8031c9d1a45334ae6853f7839709c5500018182583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb4011a3b6b9d3a021a0002eb8d05a1581df0b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb40100a0f6',
    hwSigningFiles: [signingFiles.multisigPayment0, signingFiles.multisigStake0, signingFiles.multisigStake1],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0', 'hex'),
            Buffer.from('4f348f2c6c366a835bf4b57e3520c24cc79684c0b4aa0c53f649d549f773e8725378cc05dbf0e5d14db9deb20b425a4253ae98b7202b902964fd7f7b762bd901', 'hex'),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6', 'hex'),
            Buffer.from('3eceec558e9cb3a859fa4631aba0d2627e7e72f3d41bc80a050c8bc8ec87ab8d02b81a56cd540dc8f9fa2e6c63f139f31665ba3d7efd3ea63136603b239b9708', 'hex'),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('b58d0c958e7e76f7cac5f3e696285ce955750967972af13ba7427cd91808a560', 'hex'),
            Buffer.from('8680ed01ec7715f6a216b9f0bcfff30fb4129f773dd13cfb6804726d5f56c1e6eda83e33e87f4064dcca366a9d8c2525287c6e7c6f6213023f4a9fd5ad741f09', 'hex'),
          ],
          path: signingFiles.multisigStake1.path,
        },
      ],
    },
  },

  multisig_stakeAddressDeregistrationCertificate: {
    // The same stake address as used in withdrawal, also requires both stake
    // key signatures in order to be valid.
    cborHex: '83a40081825820c961208acdd0d92d24837e904adbf044dd1f0d2a0fa1e1c2108299e896673d5a00018182583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb4011a3b8fb758021a0002dae1048182018201581cb494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb401a0f6',
    hwSigningFiles: [signingFiles.multisigPayment0, signingFiles.multisigStake0, signingFiles.multisigStake1],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0', 'hex'),
            Buffer.from('dd08adfdbc5d9063df23dbe9e515cba6b01d4e846aea58fdee5a9ada32ea5cd5b631f7da3ff12afd116466fab7c002afce4114d13084e48719e51e84b6fa5006', 'hex'),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6', 'hex'),
            Buffer.from('9ce55b24e874c77410ef3ea9939bae13659260d3d95a723c977f9b2f3fe45cbb7414791a8f0313585d18328c5f9a38d4373c9f8ac679fbda60b44fd53090d306', 'hex'),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('b58d0c958e7e76f7cac5f3e696285ce955750967972af13ba7427cd91808a560', 'hex'),
            Buffer.from('ac0558c3e80cf650038dd1e7e5ef04e7bd4560847c94d5762875601a44c07445e20b8cf7aa263794d999626695ed5c6fb0447254792d44fe555834a12f03110f', 'hex'),
          ],
          path: signingFiles.multisigStake1.path,
        },
      ],
    },
  },

  multisig_withdrawFromAndDeregisterScriptStakeAddress: {
    // Payment address is an all script with multisigPayment1 and multisigPayment2 hashes
    // Stake address is a pubkey script with multisigStake0 hash
    // This tx withdraws from and deregisters the stake address
    cborHex: '83a50081825820a72233e30fecef67cbefb527a212bca5aea30dfb445ea5be63894957bfc238a4000182825839306665c42b15b35c7937381bd545c5e7b6b3a03a24cf0383d409ac4583381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc821a00989680a1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000927c0825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a2727ba60021a00030899048182018201581c381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc05a1581df0381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc00a0f6',
    hwSigningFiles: [signingFiles.multisigPayment1, signingFiles.multisigPayment2, signingFiles.multisigStake0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e', 'hex'),
            Buffer.from('5c88b9995af1866ac5822efe26d34b2e2ee2b05ab08c52029eac79f4aa9d6e983c867bf92a22888c732b638b1268cfc384dab7017b69152ddd842b6e4ea4ed0f', 'hex'),
          ],
          path: signingFiles.multisigPayment1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('d6718e4553626239ef7470b9287340490fe71d084039f21f5b10c84e29bf3e81', 'hex'),
            Buffer.from('8d0365080513e7b3236c6a018f93a153f711809397fc15a246ca0bf1a47bc83343396b0758418b101300c28692f42acd48182c1de2c787273e4c3c91b1dcb004', 'hex'),
          ],
          path: signingFiles.multisigPayment2.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6', 'hex'),
            Buffer.from('9e63450b57199505647b739375e6a10a6bb9e774dcd570bf569e951fefb1f86eac73a19416ce1e823cfe6a7dd90cd9c8b38478e8fc5d57e54e2a7349dd24e104', 'hex'),
          ],
          path: signingFiles.multisigStake0.path,
        },
      ],
    },
  },

  multisig_registerAndDelegateScriptStakeAddress: {
    cborHex: '83a40081825820e18839929c278002510040ef5e8e33cfd8e758dad788e91f2c96a5c0b63940bc000181825839306665c42b15b35c7937381bd545c5e7b6b3a03a24cf0383d409ac4583381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc821a00771887a1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000927c0021a0002f979048282008201581c381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc83028201581c381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc581c001337292eec9b3eefc6802f71cb34c21a7963eb12466d52836aa390a0f6',
    hwSigningFiles: [signingFiles.multisigPayment1, signingFiles.multisigPayment2, signingFiles.multisigStake0],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e', 'hex'),
            Buffer.from('101a42128519020bf92eb85b15650d75e91f37db2894d7dfbcd260db824546e90c39f7f307356ad4be6f61e832ab11ae165222236279c95e12a5146bd847bf08', 'hex'),
          ],
          path: signingFiles.multisigPayment1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('d6718e4553626239ef7470b9287340490fe71d084039f21f5b10c84e29bf3e81', 'hex'),
            Buffer.from('173431eee80c78cb7a6b1b701eb04f1c5c3184e42c59f5f51bb744775276dad510f359365f4d0189dee93016a194ce6fb88134a1459f1caf7c6193665d15fa0a', 'hex'),
          ],
          path: signingFiles.multisigPayment2.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6', 'hex'),
            Buffer.from('9c204a10dfdf69de8def2f7909a3f9fad408f891c61fb1c9c184c4989a549781e50aef53a874d418620d8645bbcd7a645e250f3a7499d41001eeee67362a440b', 'hex'),
          ],
          path: signingFiles.multisigStake0.path,
        },
      ],
    },
  },

  multisig_complex: {
    // testnet txId: 027214e64897005b61e7b07224fde9cfb5b94d7028a7309cce877a0355e18b78
    // Inputs:
    //   1. payment - all script [multisigPayment1 hash, multisigPayment2 hash]
    //      staking - pubkey script - multisigStake0 hash
    //   2. payment - pubkey script - multisigPayment0 hash
    //      staking - all script [multisigStake0 hash, multisigStake1 hash]
    // Withdrawals:
    //   1. Withdrawal from 1st input's stake address
    // Certificates:
    //   1. 2nd input's stake address deregistration certificate
    // Mint:
    //   1. Mints 1000000 of Kojn, defined by:
    //      all script [mint0 hash, mint1 hash]
    // Outputs:
    //   1. 1st address - 665491711 Lovelace + 600000 Kojn
    //   2. 2nd address - 665491711 Lovelace + 400000 Kojn
    //   3. Faucet address - 665491710 Lovelace
    cborHex: '83a60082825820169422f7193e3418318c2420590778e68619119403472f70c0bb9e9feb2b457100825820cba5f1dd03010380d5c1a6471e7223ac48a7baf75c76e3824896d4398fe0155e000183825839306665c42b15b35c7937381bd545c5e7b6b3a03a24cf0383d409ac4583381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc821a27aa98ffa1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000927c082583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb401821a27aa98ffa1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a00061a80825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a27aa98fe021a0003ba51048182018201581cb494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb40105a1581df0381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc0009a1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000f4240a0f6',
    hwSigningFiles: [signingFiles.multisigPayment1, signingFiles.multisigPayment2, signingFiles.multisigPayment0, signingFiles.multisigStake0, signingFiles.multisigStake1, signingFiles.mint0, signingFiles.mint1],
    network: 'TESTNET_LEGACY',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('b9de636bf236e5543377e4b4d6b63613f188fb65b83b8a61c4b68be0c196c3d8', 'hex'),
            Buffer.from('5b7ea7fcdf9c16e465f1ea02ccf0c2b3e99db8f7a94bf0865766a79d2db8c90244580442810fec40fed90a234ccc1f817cfc7a2963ff00dcf4250920c8002f05', 'hex'),
          ],
          path: signingFiles.mint0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('f87ee3ee2316d92f73dca6112a197340a1eae157574765099dd631132818bc15', 'hex'),
            Buffer.from('5ccdd2985d3d91b0b170f5dca1698ca7990016203247c16306e536d75d58a35e1becb9f8a0dcd8535d6e95fb9820864d470a69ad9c654c618ff0902e79e51800', 'hex'),
          ],
          path: signingFiles.mint1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e', 'hex'),
            Buffer.from('6e6fc694006adbf112a61a3e342e2e86511e45044c67598d4cf2f21d1ceb74017921c9cc696ee9274afca3a7d7efa2442bf83ab6115631b903d4d5348e7c720a', 'hex'),
          ],
          path: signingFiles.multisigPayment1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('d6718e4553626239ef7470b9287340490fe71d084039f21f5b10c84e29bf3e81', 'hex'),
            Buffer.from('b9047ab4029958ffd9bbc4a4b6c4891a015828a1d30981bc2c1add7463a6066e41ac4c9d8550ed8546b9dd060ca3559cab810e5da30dada6b6c89d26b4e53203', 'hex'),
          ],
          path: signingFiles.multisigPayment2.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0', 'hex'),
            Buffer.from('cf364809f1e57bfa7c85cf648c704fff96dbcbe3d9b3e75e62b12d1b72979f0fffa6db9caec02f15c95d2f96b2c90bea0d62015acdd0e694590879d4c8b87d0c', 'hex'),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6', 'hex'),
            Buffer.from('6a6fd7a0109be3f2d3c9d0c41b046081c92eff3cb0bef7663294709858ee044a98dfbb0a61ecb669632d51de98c79f22d6a1b3ebe6c0d57cd6f443f3d1682c0a', 'hex'),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('b58d0c958e7e76f7cac5f3e696285ce955750967972af13ba7427cd91808a560', 'hex'),
            Buffer.from('96e00570ee0117af841a8db8772681fc470232c2f60ca524c7cd58450c4ac9c916f72099308399da2ff8e6f085df593af1736f24e410cb88af721ac8faf01b0a', 'hex'),
          ],
          path: signingFiles.multisigStake1.path,
        },
      ],
    },
  },

  ordinary_withOutputDatumHash: {
    // cardano-cli transaction build-raw \
    //     --alonzo-era \
    //     --tx-in "dbc2334398601986d7479e813a30acaebb544a4dd8ccbedc63e8911ae32a7e36#0" \
    //     --tx-out addr_test1wz293phjmaeag8gnsl2zrt862wvaa9ugh4y34fc4kdnesec6qr6xk+990000000 \
    //     --tx-out-datum-hash-value '"chocolate"' \
    //     --tx-out addr_test1qrkecp93wdrus6l6ga97m966qyjp7t8qj8acyf27z6l63p8ecjewxgyxvj48wwntvnujh78vpajtzdjs993jalfwlyush4k89u+9000000 \
    //     --fee 1000000 \
    //     --out-file tx.raw \
    //     --cddl-format
    // cardano-hw-cli transaction transform --tx-file tx.raw --out-file tx.transformed
    cborHex: '84a30081825820dbc2334398601986d7479e813a30acaebb544a4dd8ccbedc63e8911ae32a7e3600018283581d70945886f2df73d41d1387d421acfa5399de9788bd491aa715b36798671a3b0233805820bb292f5270d8b30482d91ee44de4ffcb50c1efeb1c219d9cd08eda0f9242a7b582583900ed9c04b17347c86bfa474bed975a01241f2ce091fb82255e16bfa884f9c4b2e3208664aa773a6b64f92bf8ec0f64b1365029632efd2ef9391a00895440021a000f4240a0f5f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [{
        key: 0,
        data: [
          Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
          Buffer.from('607b1d1ebee1dc26c833abd58aa984cb0962be9ffe07a0018909ce660755b090420f0a1ae0a6b14c014cc4ff2fbf554d1da06aa9be243698b8cf22b494660e0c', 'hex'),
        ],
        path: signingFiles.payment0.path,
      }],
    },
  },

  plutus_spendFromScript: {
    // cardano-cli transaction build-raw \
    //     --alonzo-era \
    //     --tx-in "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#0" \
    //     --tx-in-script-file docs/data/datum-equals-redeemer.plutus \
    //     --tx-in-datum-value '"chocolate"' \
    //     --tx-in-redeemer-value '"chocolate"' \
    //     --tx-in-execution-units "(2000000, 6000)" \
    //     --tx-in-collateral "1789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8#1" \
    //     --tx-out addr_test1qrkecp93wdrus6l6ga97m966qyjp7t8qj8acyf27z6l63p8ecjewxgyxvj48wwntvnujh78vpajtzdjs993jalfwlyush4k89u+989817867 \
    //     --required-signer-hash $(cardano-cli stake-address key-hash --staking-verification-key-file test/integration/ledger/cli/keyFiles/stake.vkey) \
    //     --fee 182133 \
    //     --protocol-params-file protocol.json \
    //     --out-file tx.raw \
    //     --cddl-format
    // cardano-hw-cli transaction transform --tx-file tx.raw --out-file tx.transformed
    cborHex: '84a600818258201789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee800018182583900ed9c04b17347c86bfa474bed975a01241f2ce091fb82255e16bfa884f9c4b2e3208664aa773a6b64f92bf8ec0f64b1365029632efd2ef9391a3aff6c0b021a0002c7750b582013a83818f68bb170dff0ab8a8c0098c5a14db0e43e04c9661dd3f64deb8241c20d818258201789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8010e81581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61ca3038158425840010000332233322222253353004333573466ebc00c00801801440204c98d4c01ccd5ce2481094e6f7420457175616c000084984880084880048004480048004104814963686f636f6c61746505818400004963686f636f6c617465821917701a001e8480f5f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'TESTNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
            Buffer.from('b18af7c6097430b560a0e6d4234aaf45997b06de14edca32f75b481d403a888b6fd665eeed004cee1d7877eef9c6d303ddd472de8c10e3f8f133a576b0445d05', 'hex'),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('c049b5045eb0a389bb877a7727323380f646b783e5150dbae85aacee2876124392a574039fadf10573fc4ea795ca1e1796fdacbc4d791af3e9a148c69faac103', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  babbage_inlineDatumAndReferenceScript: {
    // cardano-cli transaction build-raw \
    //   --babbage-era \
    //   --tx-in "d44c3a039c9f4c4a117f91f7475974f64e51a3bfbc7729132f2ef0b025f76e06#1" \
    //   --tx-out addr_test1wr0u45k44cxpjt3dhnql4dmc85flsc4qd779n078xfz9w6cv7yy37+10000000 \
    //   --tx-out-inline-datum-value '"yet another chocolate"' \
    //   --tx-out addr_test1qzq0nckg3ekgzuqg7w5p9mvgnd9ym28qh5grlph8xd2z92sj922xhxkn6twlq2wn4q50q352annk3903tj00h45mgfmsu8d9w5+5000000 \
    //   --tx-out-reference-script-file docs/data/datum-equals-redeemer-v2.plutus \
    //   --tx-out addr_test1qzq0nckg3ekgzuqg7w5p9mvgnd9ym28qh5grlph8xd2z92sj922xhxkn6twlq2wn4q50q352annk3903tj00h45mgfmsu8d9w5+31000000 \
    //   --fee 4000000 \
    //   --out-file tx.raw \
    //   --cddl-format
    cborHex: '84a30081825820d44c3a039c9f4c4a117f91f7475974f64e51a3bfbc7729132f2ef0b025f76e06010183a300581d70dfcad2d5ae0c192e2dbcc1fab7783d13f862a06fbc59bfc73244576b011a00989680028201d818565579657420616e6f746865722063686f636f6c617465a30058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a004c4b4003d8185846820258425840010000332233322222253353004333573466ebc00c00801801440204c98d4c01ccd5ce2481094e6f7420457175616c0000849848800848800480044800480041a20058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a01d905c0021a003d0900a0f5f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('1134dcc754e30ef2cf7d5d38e43f9cc1f5f49316e1004f2f616663e35698a9b237a74094d3c6f7b79b32e908344cd6f4f0c6a824ea393dda727a59ecb86d1501', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  babbage_plutus_v2: {
    // cardano-cli transaction build-raw \
    //   --babbage-era \
    //   --tx-in "c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c9#0" \
    //   --spending-tx-in-reference "c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c9#1" \
    //   --spending-plutus-script-v2 \
    //   --spending-reference-tx-in-inline-datum-present \
    //   --spending-reference-tx-in-redeemer-value '"yet another chocolate"' \
    //   --spending-reference-tx-in-execution-units "(2356125, 5002)" \
    //   --tx-in-collateral "c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c9#2" \
    //   --tx-out-return-collateral "addr_test1qzq0nckg3ekgzuqg7w5p9mvgnd9ym28qh5grlph8xd2z92sj922xhxkn6twlq2wn4q50q352annk3903tj00h45mgfmsu8d9w5+23000000" \
    //   --tx-out "addr_test1qzq0nckg3ekgzuqg7w5p9mvgnd9ym28qh5grlph8xd2z92sj922xhxkn6twlq2wn4q50q352annk3903tj00h45mgfmsu8d9w5+6000000" \
    //   --fee 4000000 \
    //   --tx-total-collateral 8000000 \
    //   --protocol-params-file protocol.json \
    //   --out-file tx.raw \
    //   --cddl-format
    // cardano-hw-cli transaction transform --tx-file tx.raw --out-file tx.transformed
    cborHex: '84a80081825820c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c9000181a20058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a005b8d80021a003d09000b582083664b0bce93f500e9eee751375bbc58dfd8c7ed87ce577193082f2965e96d480d81825820c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c90210a20058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a015ef3c0111a007a12001281825820c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c901a105818400005579657420616e6f746865722063686f636f6c6174658219138a1a0023f39df5f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from('cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2', 'hex'),
            Buffer.from('3c92f3bf17a20040459cb9ce5f5bc6ce525d531c7bc4b229741a7133440e87e9975993106dc3acf91e256cbdedcdee4ee1371df3a35fc53f75e1573f6b85d60f', 'hex'),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },
}

async function testTxWitnessing(cryptoProvider, transaction) {
  validateTxBeforeWitnessing(transaction.cborHex)
  const txCbor = Buffer.from(transaction.cborHex, 'hex')
  const tx = decodeTx(txCbor)

  const signingParameters = {
    signingMode: determineSigningMode(tx.body, transaction.hwSigningFiles),
    tx,
    txBodyHashHex: getTxBodyHash(tx.body),
    hwSigningFileData: transaction.hwSigningFiles,
    network: NETWORKS[transaction.network],
  }
  const changeOutputFiles = transaction.changeOutputFiles || []
  validateWitnessing(signingParameters)
  const witnesses = await cryptoProvider.witnessTx(signingParameters, changeOutputFiles)
  assert.deepStrictEqual(witnesses, transaction.witnesses)
}

describe('Ledger tx signing and witnessing', () => {
  let cryptoProvider
  // eslint-disable-next-line func-names
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await LedgerCryptoProvider(await getTransport())
  })
  const txs = Object.entries(transactions)

  txs.forEach(([txType, tx]) => it(
    `Should witness tx ${txType}`,
    async () => testTxWitnessing(cryptoProvider, tx),
  ).timeout(100000))
})
