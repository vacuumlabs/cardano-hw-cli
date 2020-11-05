/* eslint-disable max-len */
const assert = require('assert')
const { TxAux } = require('../../../../src/transaction/transaction')
const { LedgerCryptoProvider } = require('../../../../src/crypto-providers/ledgerCryptoProvider')
const { NETWORKS, HARDENED_THRESHOLD } = require('../../../../src/constants')
const { validateSigning, validateWitnessing } = require('../../../../src/crypto-providers/util')

// mnemonic "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

const signingFiles = {
  payment0: {
    type: 0,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      0,
    ],
    cborXPubKeyHex: '5840cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2914ba07fb381f23c5c09bce26587bdf359aab7ea8f4192adbf93a38fd893ccea',
  },
  stake0: {
    type: 1,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      2,
      0,
    ],
    cborXPubKeyHex: '584066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8e977e956d29810dbfbda9c8ea667585982454e401c68578623d4b86bc7eb7b58',
  },
  byron10: {
    type: 0,
    path: [
      44 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      10,
    ],
    cborXPubKeyHex: '584090ca5e64214a03ec975e5097c25b2a49d4ca4988243bc0142b5ada743d80b9d5be68538e05e31dc8fff62a62868c43f229cacbee5c40cbe6493929ad1f0e3cd9',
  },
}

const transactions = {
  withInputAndOutput: {
    // ca7b59e959a6a7cf570468438c728c7693bc1582450b89ea095f3d04ae312e6a
    unsignedCborHex: '82a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474cf6',
    hwSigningFiles: [signingFiles.payment0],
    signedTxCborHex: '83a40081825820941a33cf9d39bba4102c4eff8bd54efd72cf93e65a023a4475ba48a58fc0de000001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b2b4b021a00029b75031a00a8474ca10081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584093cbb49246dffb2cb2ca2c18e75039bdb4f80730bb9478045c4b8ef5494145a71bd59a478df4ec0dd22e78c9fc919918f4404115fafb10fa4f218b269d3e220af6',
    network: 'MAINNET',
  },
  withDelegation: {
    // a160aea80fa85221810099305045a6a3bc345709eee4d68eb4b7e04f0894a1cb
    unsignedCborHex: '82a5008182582071b1f4d93070d035b27ce482784617238f75342d7d2da77a97828c9f561bff380001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00286a2a021a0002e630031a00ac3962048183028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a5008182582071b1f4d93070d035b27ce482784617238f75342d7d2da77a97828c9f561bff380001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00286a2a021a0002e630031a00ac3962048183028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a10082825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2584047d07eb25370e2c90b894aae04de382d49186645f67467e58a1af0ede05e1e00c0baf09dd277dfc7c8f2cd77f014ff120eb823d62f900dd98fd71093740fdd0282582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e858409ed729fd0cd2b44a24aaceb4b0ba5d67c1130d1e6e23fdd8f696d873e4ccd4337aea112323ccdcc12eb9db1d89760dd9577e86e4b722618e997d7d4d1bf9130cf6',
    network: 'MAINNET',
  },
  withWithdrawal: {
    // de59b913705be59f6aff90df6eccfe4f0f115bc8de8306a77b188642b763ad61
    unsignedCborHex: '82a50081825820bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b0001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00311cba021a0002c431031a00ac30b105a1581de11d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a000ded3af6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a50081825820bc8bf52ea894fb8e442fe3eea628be87d0c9a37baef185b70eb00a5c8a849d3b0001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00311cba021a0002c431031a00ac30b105a1581de11d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a000ded3aa10082825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b25840501a09efd212efd741574e63e9ff6c701746cac68ddcba3af5ef655ff1e724399adef1eb258ffdb34fd09d7b91c4b2f612bfba083b2debaa87ed93fcf4bc1f0882582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e85840eeb76938fd9676a34ba0710dc27810d087507b3a75ac6f67543b0b22405c927ad9f575a258aa7ed1dd1bbf3d24596315ffba8d630e0a1ea8d105826b865b3808f6',
    network: 'MAINNET',
  },
  withStakingKeyDeregistration: {
    // 148aa5e66a734657fbe4125ec028b231adf40e9bd426493fadd387453c1ff4bf
    unsignedCborHex: '82a50081825820de59b913705be59f6aff90df6eccfe4f0f115bc8de8306a77b188642b763ad610001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a004cbb0a021a0002e630031a00ac352f048182018200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61cf6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a50081825820de59b913705be59f6aff90df6eccfe4f0f115bc8de8306a77b188642b763ad610001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a004cbb0a021a0002e630031a00ac352f048182018200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61ca10082825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b25840be03013f49435795c02c6fd38057841133c0787fd80cca4a607d0b91ad8bd83f545b95a276f85b4568fdab3db851844cc88d9e77ad2080776fcef6679ec4be0382582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e858405bdfbda835bd3ed18043c399249561159a95d40bd1162bc8288f3319601519f1a7a01fdcca18a3ba598cc300f6f74e9c67dc203d7fb1300b8ce09ab5473ba905f6',
    network: 'MAINNET',
  },
  withStakeKeyRegistrationAndDelegation: {
    // 71b1f4d93070d035b27ce482784617238f75342d7d2da77a97828c9f561bff38
    unsignedCborHex: '82a50081825820148aa5e66a734657fbe4125ec028b231adf40e9bd426493fadd387453c1ff4bf0001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b505a021a0002e630031a00ac3809048282008200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c83028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a50081825820148aa5e66a734657fbe4125ec028b231adf40e9bd426493fadd387453c1ff4bf0001818258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a002b505a021a0002e630031a00ac3809048282008200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c83028200581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a10082825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b25840f0dff23af401202122f8681c1b2c78ec160fdb6b16a8d992ccbe86900e6fc377f0032102eab446ccb0b186f8fe929a11a2d5dfa42bd5505bf6d3e0125ea0210782582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8584082263d344567e6614f8493dc53fcc7737839bcf57f8566a8cd1e4b98b18704972a8e1784ca4d910986d9e706982a1a51b264b83ef25dfb17388ff23d8e124202f6',
    network: 'MAINNET',
  },
  withTestnetOutputs: {
    // ebdace28e630ee2d2048460bf2ebca31c2b0ad775206b78255ecf6f4e955b86e
    unsignedCborHex: '82a40081825820c8f0d737ca5c647c434fea02759755a404d9915c3bd292bd7443ae9e46f5b7b1000181825839003b04dabe6e473ebffa196a2cee191cba32a25a8dc71f2fa35e74785b5e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f121b00005af31077b2cf021a00028d31031a0081b320f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a40081825820c8f0d737ca5c647c434fea02759755a404d9915c3bd292bd7443ae9e46f5b7b1000181825839003b04dabe6e473ebffa196a2cee191cba32a25a8dc71f2fa35e74785b5e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f121b00005af31077b2cf021a00028d31031a0081b320a10081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b25840b4e0fcd0eb5709e41fe2ebaa150253988b107e73b2a2f6f4a1b35e4151ee055e4643495dde0d95cd66f877d076a59579c46956e6549575e1cdc9c4cd2c733e09f6',
    network: 'TESTNET',
  },
  withByronInputAndOutput: {
    // 2a5eb80636ea07b703001eb408b607c38a4204dbe5d216352f384ed61ab66d70
    unsignedCborHex: '82a40082825820a160aea80fa85221810099305045a6a3bc345709eee4d68eb4b7e04f0894a1cb00825820d1831359e7a231e0352ef12188f6a4e450a9958bb78cf7740200d449f0fe443600018282582b82d818582183581c0d6a5a6a4b44454b78ff68105bf6eb648984737032a31a724cb08fa3a0001a87b0e2651a001e84808258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00537971021a0002b779031a00ac55f3f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.byron10],
    signedTxCborHex: '83a40082825820a160aea80fa85221810099305045a6a3bc345709eee4d68eb4b7e04f0894a1cb00825820d1831359e7a231e0352ef12188f6a4e450a9958bb78cf7740200d449f0fe443600018282582b82d818582183581c0d6a5a6a4b44454b78ff68105bf6eb648984737032a31a724cb08fa3a0001a87b0e2651a001e84808258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00537971021a0002b779031a00ac55f3a20081825820cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b25840e3e6c81a40f2a3a4ace9a5b3a7dfbac12a9f69115d0800145e163f4ed347dd9367e4e06ae6c4f4899b19c958c88fa4b81b17679b135a45b85f84aa0216ffc408028184582090ca5e64214a03ec975e5097c25b2a49d4ca4988243bc0142b5ada743d80b9d5584088632f148f3092f50218374d2bf602a78e4a50dc55c51f0ef32306b49413df3757657380c35cf878a102f728c313ecbe9f37f6eb6a6b64f724ef1b7bee480f0c5820be68538e05e31dc8fff62a62868c43f229cacbee5c40cbe6493929ad1f0e3cd941a0f6',
    network: 'MAINNET',
  },
  withPoolRegistration: {
    // bc678441767b195382f00f9f4c4bddc046f73e6116fa789035105ecddfdee949
    unsignedCborHex: '82a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bbf6',
    hwSigningFiles: [signingFiles.stake0],
    signedTxCborHex: '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad848400190bb84436e44b9af68400190bb84436e44b9b500178ff2483e3a2330a34c4a5e576c2078301190bb86d616161612e626262622e636f6d82026d616161612e626262632e636f6d82782968747470733a2f2f7777772e76616375756d6c6162732e636f6d2f73616d706c6555726c2e6a736f6e5820cdb714fd722c24aeb10c93dbb0ff03bd4783441cd5ba2a8b6f373390520535bba1008182582066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8584061fc06451462426b14fa3a31008a5f7d32b2f1793022060c02939bd0004b07f2bd737d542c2db6cef6dad912b9bdca1829a5dc2b45bab3c72afe374cef59cc04f6',
    witness: {
      key: 0,
      data: [
        Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
        Buffer.from('61fc06451462426b14fa3a31008a5f7d32b2f1793022060c02939bd0004b07f2bd737d542c2db6cef6dad912b9bdca1829a5dc2b45bab3c72afe374cef59cc04', 'hex'),
      ],
    },
    network: 'MAINNET',
  },
  withPrivatePoolReg: {
    // 997c29edb488dcd06df8ba1d9d4c857e8bf1450ecef43d648d69178bbabfb41e
    unsignedCborHex: '82a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6f6',
    hwSigningFiles: [signingFiles.stake0],
    signedTxCborHex: '',
    witness: {
      key: 0,
      data: [
        Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
        Buffer.from('98dbf7073ab0fe28afad08702bb9a363d638d55eed2ae6bc5c36a5137c36c9a806562180c8e33d0f3e74b27f61c7ebb7991e3cdb870af66e6fd9c943d197db0d', 'hex'),
      ],
    },
    network: 'MAINNET',
  },
  withBigIntOutpusts: {
    // 5a788a7ed9624f30692f701c3778a245140c382a8a23a0caa78dd0013e93f308
    unsignedCborHex: '82a50081825820897c3429f794c44aecbe6f2e4f292836f3153f85ce2026b86a13ecbdbadaa05700018182581d60daad04ed2b7f69e2a9be582e37091739fa036a14c1c22f88061d43c71b0055a275925d560f021a000249f00319138804818a03581c61891bbdc08431a1d4d4911903dad04705f82e29a87e54cc77db217f582092c4a889cca979e804327595768d107295ad7cb6e9a787ef6b23b757ba3433381b0000b5e620f480001a1dcd6500d81e82030a581de05e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f1281581c1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c80f6f6',
    hwSigningFiles: [signingFiles.stake0],
    signedTxCborHex: '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583901eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff0102182a030a04818a03581cf61c42cbf7c8c53af3f520508212ad3e72f674f957fe23ff0acb49735820198890ad6c92e80fbdab554dda02da9fb49d001bbd96181f3e07f7a6ab0d06401a1dcd65001a1443fd00d81e820102581de13a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c49071182581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c3a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c4907118584001904d244c0a8000150b80d01200000a3852e8a00003473700384001904d2f650b80d01200000a3852e8a00003473700384001904d244c0a80001f683011904d26d7777772e746573742e7465737482026e7777772e74657374322e74657374827568747470733a2f2f7777772e746573742e746573745820914c57c1f12bbf4a82b12d977d4f274674856a11ed4b9b95bd70f5d41c5064a6a10081825820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e584006305b52f76d2d2da6925c02036a9a28456976009f8c6432513f273110d09ea26db79c696cec322b010e5cbb7d90a6b473b157e65df846a1487062569a5f5a04f6',
    witness: {
      key: 0,
      data: [
        Buffer.from('66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8', 'hex'),
        Buffer.from('affeb98e9e2a937e38f50a854dc857b4c60f64673626d2a3a1ac12f794ff6079d81c9cefa74a7590ba92206bd047c11614a0260089f6d1496cdc14fcb0f44e0f', 'hex'),
      ],
    },
    network: 'TESTNET',
  },
}
async function testTxSigning(cryptoProvider, transaction) {
  const txAux = TxAux(transaction.unsignedCborHex)
  validateSigning(txAux, transaction.hwSigningFiles)
  const signedTxCborHex = await cryptoProvider.signTx(
    txAux,
    transaction.hwSigningFiles,
    NETWORKS[transaction.network],
  )
  assert.deepStrictEqual(signedTxCborHex, transaction.signedTxCborHex)
}

async function testTxWitnessing(cryptoProvider, transaction) {
  const txAux = TxAux(transaction.unsignedCborHex)
  validateWitnessing(txAux, transaction.hwSigningFiles)
  const witness = await cryptoProvider.witnessTx(
    txAux,
    transaction.hwSigningFiles[0],
    NETWORKS[transaction.network],
  )
  assert.deepStrictEqual(witness, transaction.witness)
}

describe('Ledger tx signing and witnessing', () => {
  let cryptoProvider
  before(async () => {
    cryptoProvider = await LedgerCryptoProvider()
  })
  const txs = Object.entries(transactions)
  const txsToSign = txs.filter(([, tx]) => !tx.witness)
  txsToSign.forEach(([txType, tx]) => it(
    `Should sign tx ${txType}`, async () => testTxSigning(cryptoProvider, tx),
  ).timeout(100000))
  const txsWithWitness = txs.filter(([, tx]) => tx.witness)
  txsWithWitness.forEach(([txType, tx]) => it(
    `Should witness tx ${txType}`, async () => testTxWitnessing(cryptoProvider, tx),
  ).timeout(100000))
})
