/* eslint-disable max-len */
import assert from 'assert'
import {decodeTx} from 'cardano-hw-interop-lib'
import {TrezorCryptoProvider} from '../../../../src/crypto-providers/trezorCryptoProvider'
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

// Note for future readers (Dec 2022): The tests in this file were created in the cardano-cli's
// internal raw tx format. When we removed support for this format in favor of the CDDL-compliant
// format, we manually converted the test cases to the new format. Thus it is possible that some
// of the test cases would not be generated exactly as they are now by the cardano-cli - e.g. some
// native script witnesses might be missing due to the manual conversion.

const transactions = {
  withInputAndOutput: {
    // 97e0928d7f82f75e2917fddd07eeaaffaf2037ef07c9e1b0284337a3cfe4adcb
    cborHex:
      '83a4008182582066001e24baf17637192d3a91c418cf4ed3c8053e333d0c35bd388deb2fa89c92000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a002b8a44021a0002b473031a00a2d750a0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '8141385df82ac9baa1699a2f3c0aff8eb1a0db3bf937e7c6942b20b00add410c3fac56c63d07a65e5d797f6c684c10e84e39ef412c775d7d98b353cb00231404',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withDelegation: {
    // 37942f7997c26a6e7692a29fb382b68b9e485eabe204e2d0ae488d271a6eb3da
    cborHex:
      '83a500818258201d7b25ce20ee92aa96b6fba145e8b4a5efdefa7df8fc225477297cf026efadfa0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a00323cdc021a0002e595031a00e37f31048183028200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              'd2addc046794d2ead623e3835b4edc02eba1502771ef145b5634ff63411751a4b63a7580ac9433914cc5e016bbbd23aced51044c479a39cc463cac235ad10003',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '8c09b9f5aaaae2e07389d6101d5ecc4a2c6c33f87adc4ea4ff2a13b8a9128750ff4e67459d23c35aaff94e19d9be9ca8f5bb51245ebcf0d8c85a1ff45a401907',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withWithdrawal: {
    // 4376ea43c3552cb57197a41428fce00e3c2ec9cff7444e50fe9e3750c279549f
    cborHex:
      '83a500818258205c38555bbbec0e95cd59cd7df45195e07af73a8dbd08a246bf87a687765d6c590001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a003aee4b021a0002eb41031a00e37f3105a1581de1122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427719d08ca0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              '0b266bfefe1919673e2aa456b123fdd9bc80ef9f6c948bbc2ad53ca58997ff454a8161d1164e1598255864a27c2ecab3734f9af1a753a24ba0275a72741e130a',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '054075f078180eca611201dcf9b6278b2b11389db5a2c841f4e6a5bd62ef6313cfe18c6dd08068878fea764245ed1c63a1e76687899d48849db77c8d9e944e02',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withStakingKeyDeregistration: {
    // b25238a1c60ee9e30dd4ce41af5fa78e2cc4e17346bcc47831a3c98c5945370f
    cborHex:
      '83a500818258204376ea43c3552cb57197a41428fce00e3c2ec9cff7444e50fe9e3750c279549f0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a0056925e021a0002e06d031a00e37f31048182018200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              'efe4b1bbfc0e4ec5aa3b7bb95d61c952bab7f4ab17b99ef197c0b1cb9dafd4b811a1275a56bfac75a1e2e718379487aef49d9f073d132a24ba13491698cef109',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '0741de2b8807e44f9c8fafc75e8fd44190eddd629d31e5093e2f2c8723bb5df3007ea44d0d242b0ba35b24525782ccbd2e1e7c6bca8b29af744ae88fec635c00',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withStakeKeyRegistrationAndDelegation: {
    // 1d7b25ce20ee92aa96b6fba145e8b4a5efdefa7df8fc225477297cf026efadfa
    cborHex:
      '83a50081825820b25238a1c60ee9e30dd4ce41af5fa78e2cc4e17346bcc47831a3c98c5945370f0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a00352271021a0002eb6d031a00e37f31048282008200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427783028200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              '378975f3b728e434471179ed87b8a2041ea478aac2d588ca222a353de3beadae7ecf9c657e62cdb26e9a499dca67fb491386471a119a2b59e17c294ecf732909',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '6a111389b6bc7b8a8d4e0473f7d8833a4b9d07c28d7c3070e805e2c9ded76140ba77dee65cf4955557bb04e2b58e1c84113f1d20028612cc5fe8fb8b64614e02',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withMultipleInputsAndOutputs: {
    // b06f6d9fbb888e82fd785a7e84760bbf89aea7a54e961840ecb8cb0bfe4aa7b5
    cborHex:
      '83a4008182582056fad20b5e1786b3e76017b256b56dbe4d677f27da4675f5666b3344add7f330000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a00211c70021a00029b75031a00c4fab1a0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'a77a20ce884f88e0cd690f65f864fa9946de93561c663066619ae8a40069a9a0df30f18561029b4f830451d69a8cfd8f597abb17abb2d56d7f165093dd6c980b',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withTestnetOutputs: {
    // ebdace28e630ee2d2048460bf2ebca31c2b0ad775206b78255ecf6f4e955b86e
    cborHex:
      '83a40081825820c8f0d737ca5c647c434fea02759755a404d9915c3bd292bd7443ae9e46f5b7b1000181825839003b04dabe6e473ebffa196a2cee191cba32a25a8dc71f2fa35e74785b5e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f121b00005af31077b2cf021a00028d31031a0081b320a0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'c4826f8bb93bdf0b04a4f58d9190e75dbc2e615d4c2d68982d337163b062be65e0e5fb6749dacad30e329d3fa295d39a0ca6a8ec1230d47ef125a602e5c21b0f',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withPoolRegistration: {
    // e3b9a5657bf62609465a930c8359d774c73944973cfc5a104a0f0ed1e1e8db21
    cborHex:
      '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583901eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff0102182a030a04818a03581cf61c42cbf7c8c53af3f520508212ad3e72f674f957fe23ff0acb49735820198890ad6c92e80fbdab554dda02da9fb49d001bbd96181f3e07f7a6ab0d06401a1dcd65001a1443fd00d81e820102581de13a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c49071182581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c3a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c4907118584001904d244c0a8000150b80d01200000a3852e8a00003473700384001904d2f650b80d01200000a3852e8a00003473700384001904d244c0a80001f683011904d26d7777772e746573742e7465737482026e7777772e74657374322e74657374827568747470733a2f2f7777772e746573742e746573745820914c57c1f12bbf4a82b12d977d4f274674856a11ed4b9b95bd70f5d41c5064a6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              '06305b52f76d2d2da6925c02036a9a28456976009f8c6432513f273110d09ea26db79c696cec322b010e5cbb7d90a6b473b157e65df846a1487062569a5f5a04',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
      ],
    },
  },

  withPrivatePoolReg: {
    // 795c15a1b2ebe7358b64a3cbfd6865e3a065079db3559e4062ab2f2e30308e73
    cborHex:
      '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              'a1566eed590d732ce3734e9502f109035b209351b175bf27e33caeeac37602a22b5dbe5339e32ef985e449efb254b5da0251b8cb89dd444e0b28a59f60b30107',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
      ],
    },
  },

  withBigintOutputs: {
    // 62c36ab26608bdd827c5494126063eea704a51ea68803c59834b34f9f85bf8d4
    cborHex:
      '83a50081825820897c3429f794c44aecbe6f2e4f292836f3153f85ce2026b86a13ecbdbadaa05700018182581d60daad04ed2b7f69e2a9be582e37091739fa036a14c1c22f88061d43c71b0055a275925d560f021a000249f00319138804818a03581c61891bbdc08431a1d4d4911903dad04705f82e29a87e54cc77db217f582092c4a889cca979e804327595768d107295ad7cb6e9a787ef6b23b757ba3433381b0000b5e620f480001a1dcd6500d81e82030a581de05e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f1281581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427780f6a0f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              '7eee4be1b2b5640c30dd4cfd67836c0d79e2efa9d7d72c73d24ce1ffd7ec40d601316c9b8bc2ae5e6d5a2fd5e664094f5ae97a83ffacccefb87e43e98c30aa0f',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
      ],
    },
  },

  withByronInputAndOutput: {
    // b6bd988dda0f75e322b253bbe971d467995796126987a99e039a9be8af36581a
    cborHex:
      '83a4008282582086e54b377489541d1e8fcd889c4e4a8d47cd03acfe784bc0bf191a9f1c84810f0082582086e54b377489541d1e8fcd889c4e4a8d47cd03acfe784bc0bf191a9f1c84810f01018282582b82d818582183581c578e965bd8e000b67ae6847de0c098b5c63470dc1a51222829c482bfa0001aae9713fc1a000f42408258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a0017c72f021a0002e630031a00b5b373a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.byron0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [
        {
          key: 2,
          data: [
            Buffer.from(
              'b90fb812a2268e9569ff1172e8daed1da3dc7e72c7bded7c5bcb7282039f90d5',
              'hex',
            ),
            Buffer.from(
              'bd5f70684019886ce98f88f3c9ed5693a790930f4a736cdbcd1103523bae16079d90e706372f17fd2e6e5eb46eda840afbb3e51135eb0c32507d82b31b353103',
              'hex',
            ),
            Buffer.from(
              'fd8e71c1543de2cdc7f7623130c5f2cceb53549055fa1f5bc88199989e08cce7',
              'hex',
            ),
            Buffer.from('a0', 'hex'),
          ],
          path: signingFiles.byron0.path,
        },
      ],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '1c18913daef380349ea697bdde3c671fd57ee56f423602634f2b4b8384e38bdf43b8384c86a353ff3e96ecf7f53bf1060a5c19dc21588c747e9c1f17be3ace09',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withMultiAssetInputAndOutput: {
    cborHex:
      '83a30081825820ac9f9da514965a72270f3dea9f401e509a8e8f8af2716e88a182b399adc233c60101818258390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277821a00958940a2581c0b1bda00e69de8d554eeafe22b04541fbb2ff89a61d12049f55ba688a14a6669727374617373657401581c95a292ffee938be03e9bae5657982a74e9014eb4960108c9e23a5b39a24a66697273746173736574014b7365636f6e64617373657401021a00030d40a0f6',
    hwSigningFiles: [signingFiles.payment0],
    changeOutputFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'dfa1fdf3c3e4c2eb4e6afb9ff4ec5cf9b9ee25016787eac9f22ae5963b35c6c3295064d4ef141d2a68e218553c0a3c282d74cf3d796f42f9dc00d178ec604b04',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withValidityIntervalStart: {
    cborHex:
      '83a40081825820371b2d1aa350f3e3ffff8c7dddaa3a218022132d24541cba463292acd51cbbf60101818258390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a00493e00021a00030d40081a00868378a0f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'c548f31895c4c79b18eea6b181bf2497d1e00bc19ad059276be46d0999fc4684446cdbb4b958a59f264a7dc5af5a764f0c6abb92b6a72878ffe66c2459e31c01',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  withMetaData: {
    // 575d62a441695183211651ef616683e2d0e8db4b4fcc4e0099136fc34fd9d427
    cborHex:
      '83a5008182582008f7b94f631b931ee48bb9c9447f9cc7c366a76ad04b66033cfd3f4ba95740500001818258390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a3b97e3d0021a0002e630031a014369d7075820c0523b09bef39412ffd6e9eeb4c4171673821bbe5c06c7e522ecffca8b856eeda0a1016763617264616e6f',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'ba50f212c23b818a8a128a6a7affa73412463742207096a48450e8d3124517521b88a83fb400886bc770df13d9c04fef4a1db2f632dacfaf2d55dab35d5e060e',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_withMint: {
    // ba638246bd9be05aa46e865320c354efea75cf5796e88b763faaa30c9fbb78de
    cborHex:
      '83a4008282582005d590fa6fed4ed07c5649f3debab04e6263c34d42d1843e41e8e86cf5ceaf9d01825820d27832fed6902ebe1c1ce31b900be6275b230930e2d3c2076f4367ebd921c95c0101818258390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277821a39396951a1581c21c3e7f6f954e606fe90017628b048a0067b561a4f6e2aa0e1aa6131a14756616375756d731a000f4240021a0002d7f509a1581c21c3e7f6f954e606fe90017628b048a0067b561a4f6e2aa0e1aa6131a14756616375756d731a000f4240a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.mint0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '3fac72cc7414c9927b03f088f3553318c8785329b9eb36263ffb00a7e8afc059d45a93d064e2ff17c36225522828fbf497655586b64971cf97c3f212eb9ff20b',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'b75258e4f61eb7b313d8554c2fe10673cf214ca2d762bfd53ec3b7846e2ee872',
              'hex',
            ),
            Buffer.from(
              '563afe2103e0d8fbb26202f71b4cb1df150785359716b7ef62947b78e4c88725d5e0462b235c043e5452d2c137436ceefbb15b4a2264eb45873ea76176d44709',
              'hex',
            ),
          ],
          path: signingFiles.mint0.path,
        },
      ],
    },
  },

  multisig_withMultisigPaymentAddress: {
    // 3fb698e61fa97dbdc22800bbfc755d9206ac661a591389a4e4cd157e5efba6bd
    // Payment address defined by all script with two pubkeys of signing files
    // defined below, we need both for correct signature
    cborHex:
      '83a30081825820a122b7044d6f7da26a0f4bad87ad43fc967b471cfb231c96681c421b40868c5e010181825839301ed8427f8dba7f0edf1d3c942a82a8addf4ef838e24d76b5b77a5abbf8ecfa2654cfe1dd931439db45e43f5d1a73129dcb7e4acc736c766a1a05f31fe7021a0002c119a0f6',
    hwSigningFiles: [
      signingFiles.multisigPayment0,
      signingFiles.multisigPayment1,
    ],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'b10be5c0d11ad8292bbe69e220ca0cfbe154610b3041a8e72f9d515c226ab3b1',
              'hex',
            ),
            Buffer.from(
              '33de58835a8849049520b62d2dd77d0a12e3c79f242a0279641461d9678f72eadcc5a415d0f50590730baec3702eac3280a6726753ca414e9f5a782937ae620c',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '021a000e3be05eb09051983cbf728322149cc5687a79f0a1dbccd25b3a754c59',
              'hex',
            ),
            Buffer.from(
              'a4b17468b491e59b2445f6421fe7b03426dd01befa2dcc53bb7e1cd12a9b35a26c56444f284d753a7a1c532b3d533372d3271e1b36d52a25782aad99ad13d307',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment1.path,
        },
      ],
    },
  },

  multisig_stakeAddressRegistrationAndDelegationCertificate: {
    // c8dfe434e1a682a2cfe537b90af8f44c66cdbb849b89c11dd4d74e3913f08f69
    // Registers and delegates a stake address defined as an all script with
    // two pubkey hashes of the stake signing files defined below
    cborHex:
      '83a4008182582044d511ec0a24eda60aed8f66d83da4587e52a64ae3cdbfe23e19a397097179e60101818258393029fb5fd4aa8cadd6705acc8263cee0fc62edca5ac38db593fec2f9fda603435bcedf975543901383daaa264fe7ce513910472a113837c9a51a0077214b021a0002f0b5048282008201581ca603435bcedf975543901383daaa264fe7ce513910472a113837c9a583028201581ca603435bcedf975543901383daaa264fe7ce513910472a113837c9a5581c001337292eec9b3eefc6802f71cb34c21a7963eb12466d52836aa390a0f6',
    hwSigningFiles: [
      signingFiles.multisigPayment0,
      signingFiles.multisigStake0,
      signingFiles.multisigStake1,
    ],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'b10be5c0d11ad8292bbe69e220ca0cfbe154610b3041a8e72f9d515c226ab3b1',
              'hex',
            ),
            Buffer.from(
              'c0ca23ccca322ee4831fa8e325e446cf4bca05212e93b6906dfef14b4bd62cd652c3d1a420cb569c9630accbf7bf837caac34356df62e69b200b4bce01765604',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'f2ef4ecd21ad28a8d270ca7be7e96c87f60dc821e13c0d0c5870344e9693637c',
              'hex',
            ),
            Buffer.from(
              '2ecfcc7b76e92392f7ea9d76b8d25d0afd1db3713925a24a43596427be5ad79ef3ec5b368e619ffc4861f12bb08fd987f4172d05c0a9fc6cc0d430591f808b02',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '8c9a9345563ec749fbd804bd9b19f048c6686dbc32f4854174c6e4a278fcc0c5',
              'hex',
            ),
            Buffer.from(
              '8140d08a6a306d9ed8e51d7e921c4dd48ee30830b47a014eca57810d545cd48f6689c1c83175ce548479f8c519aba939c4bebcc351dac7d8b3824da8b4daf80a',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake1.path,
        },
      ],
    },
  },

  multisig_stakeAddressWithdrawalAndDeregistration: {
    // 2f6b85d5b0405a5ba6ad4db3a12defc7d74d8e9784a3b2edd136b86af26997a2
    // Deregisters and withdraws funds from the stake address as it was
    // registered in the tx above
    cborHex:
      '83a50081825820c8dfe434e1a682a2cfe537b90af8f44c66cdbb849b89c11dd4d74e3913f08f690001818258393029fb5fd4aa8cadd6705acc8263cee0fc62edca5ac38db593fec2f9fda603435bcedf975543901383daaa264fe7ce513910472a113837c9a51a0092ba3e021a0002eb8d048182018201581ca603435bcedf975543901383daaa264fe7ce513910472a113837c9a505a1581df0a603435bcedf975543901383daaa264fe7ce513910472a113837c9a500a0f6',
    hwSigningFiles: [
      signingFiles.multisigPayment0,
      signingFiles.multisigStake0,
      signingFiles.multisigStake1,
    ],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'b10be5c0d11ad8292bbe69e220ca0cfbe154610b3041a8e72f9d515c226ab3b1',
              'hex',
            ),
            Buffer.from(
              'd32e5346c93d6a7eaf116ebc049757bd1617f7df47e054d712594f6b842dcc04ffe0cd348ae7f53234c581b63b154615f3d3a4df041a6ff789634ee3c4e8ae01',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'f2ef4ecd21ad28a8d270ca7be7e96c87f60dc821e13c0d0c5870344e9693637c',
              'hex',
            ),
            Buffer.from(
              '81849b641395b5e5680f1fc14c94bb807c61ca31c210b3cb59f56dbd41e8184e3027e2708a588a62f6d809674ac6357ea03d0ff87acb90d934829d3aff2e2707',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '8c9a9345563ec749fbd804bd9b19f048c6686dbc32f4854174c6e4a278fcc0c5',
              'hex',
            ),
            Buffer.from(
              'e5108fa89e8723825ba7fb0a6cc3856c49b5b602d0a2e8b72d43eedbf46bb955728091acb408d0a2c71aa063f96f902dad91a4d71e37e2a877407f050685490e',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake1.path,
        },
      ],
    },
  },

  multisig_complex: {
    // c0a41c1362340368a9cde76a07953936f0bb0878b2ac3c5acace23e553fab9ce
    // Inputs: payment - all script [multisigPayment0 hash, multisigPayment1 hash]
    // Outputs: The input's payment address
    //          Faucet address
    // Contains registration and delegation for stake address (all script [
    // multisigStake0 hash, multisigStake1 hash])
    // Minting: 1000000 defined by policy script all [mint0 hash, mint1 hash]
    cborHex:
      '83a5008182582094461e17271b4a108f679eb7b6947aea29573296a5edca635d583fb40785e05d000182825839301ed8427f8dba7f0edf1d3c942a82a8addf4ef838e24d76b5b77a5abba603435bcedf975543901383daaa264fe7ce513910472a113837c9a5821a00769ed7a1581c0a35d58554c970a2782ad2e8821035bd6d84254504ca795861171bd8a14756616375756d731a000f4240825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a3b023380021a00037329048282008201581ca603435bcedf975543901383daaa264fe7ce513910472a113837c9a583028201581ca603435bcedf975543901383daaa264fe7ce513910472a113837c9a5581c001337292eec9b3eefc6802f71cb34c21a7963eb12466d52836aa39009a1581c0a35d58554c970a2782ad2e8821035bd6d84254504ca795861171bd8a14756616375756d731a000f4240a0f6',
    hwSigningFiles: [
      signingFiles.multisigPayment0,
      signingFiles.multisigPayment1,
      signingFiles.multisigStake0,
      signingFiles.multisigStake1,
      signingFiles.mint0,
      signingFiles.mint1,
    ],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'b10be5c0d11ad8292bbe69e220ca0cfbe154610b3041a8e72f9d515c226ab3b1',
              'hex',
            ),
            Buffer.from(
              'bf2991903c64b4b69d06338d5bed62c76e481f6b7192a438694e9be6665c65b27fe555a7c40ebdd480c1d9d70a46bbbb5330e75bbc495418da77e6b95e46700d',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '021a000e3be05eb09051983cbf728322149cc5687a79f0a1dbccd25b3a754c59',
              'hex',
            ),
            Buffer.from(
              '4013a7ce1aa1370aac8f0dcffb9dd09cbd88b019dd89fd22497867933a1ce5c8cf87c02e6f85af667d2a21a092c8a3076ac5416421002ab633def8780797c205',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'f2ef4ecd21ad28a8d270ca7be7e96c87f60dc821e13c0d0c5870344e9693637c',
              'hex',
            ),
            Buffer.from(
              'ad14ec09cc3eea78cd0e4774514cea6af9c291c8fc1e709801e5e2bfb1b6716237b29efc3c139d40af113e00dbb8e6f29c88de26850a4c3918ef83bcb101d00e',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '8c9a9345563ec749fbd804bd9b19f048c6686dbc32f4854174c6e4a278fcc0c5',
              'hex',
            ),
            Buffer.from(
              'c78653cfdcf0c929bf64164932bfdf9d7f92a1c02a47cfcbdee49d8c5449e6b7c1490588e324e3d6d7e54b7b12973b1c9d4c40651c30bc0a32c0c51f556b1a05',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'b75258e4f61eb7b313d8554c2fe10673cf214ca2d762bfd53ec3b7846e2ee872',
              'hex',
            ),
            Buffer.from(
              '70c343475e4bdf35b39d37fddd92702c4a8e4ff858cb3b2b27f808dde8707d686b61cb667c60e88b68da272c7aba1c427c1797edd362bcd25d3b6a6fff0c3100',
              'hex',
            ),
          ],
          path: signingFiles.mint0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'a54627d6d16724032172541d4261e7aa87c06395724f1d18975a21d56650bda9',
              'hex',
            ),
            Buffer.from(
              '371adae94e6d3d9f728736a33289f3285ad17eefc8a1af938fae1bf86768ac1c3a2e386feb940e58f17c221b7610c65051d4d131dbe7ab6a9fff4f826916990f',
              'hex',
            ),
          ],
          path: signingFiles.mint1.path,
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
    cborHex:
      '84a30081825820dbc2334398601986d7479e813a30acaebb544a4dd8ccbedc63e8911ae32a7e3600018283581d70945886f2df73d41d1387d421acfa5399de9788bd491aa715b36798671a3b0233805820bb292f5270d8b30482d91ee44de4ffcb50c1efeb1c219d9cd08eda0f9242a7b582583900ed9c04b17347c86bfa474bed975a01241f2ce091fb82255e16bfa884f9c4b2e3208664aa773a6b64f92bf8ec0f64b1365029632efd2ef9391a00895440021a000f4240a0f5f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY2',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'a0697556b250ef574ca8afddd2df20652f0a94faffd83c0196e416739182fd7a590d7e618617c77596ab6856a28f500c67695e975badc95f52c6a986dd10f501',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
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
    //     --required-signer-hash $(cardano-cli stake-address key-hash --staking-verification-key-file test/integration/trezor/cli/keyFiles/stake.vkey) \
    //     --fee 182133 \
    //     --protocol-params-file protocol.json \
    //     --out-file tx.raw \
    //     --cddl-format
    // cardano-hw-cli transaction transform --tx-file tx.raw --out-file tx.transformed
    cborHex:
      '84a600818258201789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee800018182583900ed9c04b17347c86bfa474bed975a01241f2ce091fb82255e16bfa884f9c4b2e3208664aa773a6b64f92bf8ec0f64b1365029632efd2ef9391a3aff6c0b021a0002c7750b582013a83818f68bb170dff0ab8a8c0098c5a14db0e43e04c9661dd3f64deb8241c20d818258201789f11f03143338cfcc0dbf3a93ad8f177e8698fc37ab3ab17c954cf2b28ee8010e81581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277a3038158425840010000332233322222253353004333573466ebc00c00801801440204c98d4c01ccd5ce2481094e6f7420457175616c000084984880084880048004480048004104814963686f636f6c61746505818400004963686f636f6c617465821917701a001e8480f5f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'TESTNET_LEGACY2',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              'f92cd0a7a47a97b034ccfa46e899dee01c3241cf23bf1eee1b9469ac1850a9fb5d967b3715ffc70a19ed58c004473f580144ae78bd694661f126dfb746f2e103',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '09cb0c7dc23f6b0ff1a3a736c4c32662deb18b692e5f7eab91e1e899c0cbd9a6456636ebf953277ee739b022988af58ba7434682493a38c79c52e8da8359e108',
              'hex',
            ),
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
    cborHex:
      '84a30081825820d44c3a039c9f4c4a117f91f7475974f64e51a3bfbc7729132f2ef0b025f76e06010183a300581d70dfcad2d5ae0c192e2dbcc1fab7783d13f862a06fbc59bfc73244576b011a00989680028201d818565579657420616e6f746865722063686f636f6c617465a30058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a004c4b4003d8185846820258425840010000332233322222253353004333573466ebc00c00801801440204c98d4c01ccd5ce2481094e6f7420457175616c0000849848800848800480044800480041a20058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a01d905c0021a003d0900a0f5f6',
    hwSigningFiles: [signingFiles.payment0],
    changeOutputFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'TESTNET_LEGACY2',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '7caee7e4d3ac3b2245997b36137543eb638d1c9629a233273d63836e3fc7bb79485c64a89dcd5d0589f7094d82ce8f2f51754595494d52e6ab7ab8382606e30b',
              'hex',
            ),
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
    cborHex:
      '84a80081825820c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c9000181a20058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a005b8d80021a003d09000b582083664b0bce93f500e9eee751375bbc58dfd8c7ed87ce577193082f2965e96d480d81825820c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c90210a20058390080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277011a015ef3c0111a007a12001281825820c16cd7176f1814396bb5437da4f97e92e8a166f374c3aa92124625b31b92d2c901a105818400005579657420616e6f746865722063686f636f6c6174658219138a1a0023f39df5f6',
    hwSigningFiles: [signingFiles.payment0],
    network: 'TESTNET_LEGACY2',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'a3eed57e4123a86757b8199017e9f3f0e3de4c6dacb65976277be2e22738a8283e0e21f1da904b47ef7c9b5f7a3e1cb987be39a47501d99bb7c947b2fec3e308',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_ConwayStakeRegistrationCertificate: {
    // from Martin Lang, modified key hashes
    cborHex:
      '84a50082825820c6fc270c3a129830cc06b27a192f85a0bf886565142e23911aa90a77f0d3e5a800825820c6fc270c3a129830cc06b27a192f85a0bf886565142e23911aa90a77f0d3e5a801018182583900682c74c6c82879fc538e8ac283b93fb8b1a119123e1ba970ebd08c77122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a0028918e021a0002a491031a010df1f2048183078200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a001e8480a10082825820543db1d03ac6a72166fc28cd76b95615fb00f21cd4f77aa1f103864437807f6b58409c194078576f5d1dd86f389f378dbfa399e56816c65b974750537a7ac3022800f717671173e087a2d222454a203b160e155c57542061deaf25d4aedb08decf0682582000c331f52f95d25caa3d378411c6699c4d9085090ad9534ee0f63a95d89a49d2584007119c4a1b02a632bd30b5b4ea29124e8e6a1de7cd3684099e582e7a284fac199007e68770d4ba017055e4c5b9149f4c14790ba505021dca91cf610969932f08f5f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              '25098094389592e99f8071fef537842d6de9e4117f5c79469b4be0bdbb3f9a77a205698afd5e44ee43f877f5aa597800f9e203783edc2712f852d401aeb7f609',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '23cae64efdfd9f23f89a8336d2f8113ba4d8fbc918a2f131c4649713cd5e27332b3c59153aaaf4fb40188bdcce5b8a1853bed3fc493d01761d69fcbc89dfdf09',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_ConwayVoteDelegationCertificate: {
    // from Martin Lang, modified key hashes and added script hash, abstain and no confidence certificates
    cborHex:
      '84a500818258209897c9087355250ad02e3b0cc5020d31e2869b1e26ec8df26d460f419e1ca9b70001818258390074976c54afaf444f7cd499bd8519aac6592b13b22b9d5817f0da5c52122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a002349a0021a0002a305031a010f4984048483098200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42778200581c2c0e9f599655bd3f7f313a3a61fe05fb9caac4cc3d1aa77740fc957983098200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42778201581c8df36abc34e113c5184bf6a0db0fda235ea766002ed81e9381c9690383098200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277810283098200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42778103a0f5f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              'c33da7654ea031a552bf36588870a80836010337dd3d86be47948902a7445207b0a16737d56b4e97f7ebb969b61c1249dc34a4f0a7c5505368a3da8dd0799504',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              '52d9805dd59992e30e50112f577911c770527ed74d0ae0ee867a8d1680fb06838eb5cbed484b7277d5fe5193b5e2581704f4e73d84211cc9a62c4601e350e10c',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
        },
      ],
    },
  },

  ordinary_ConwayTaggedSets: {
    // constructed manually as a combination of ledger.ordinary_ConwayDRepUpdateCertificate
    // and trezor.ordinary_ConwayStakeRegistrationCertificate
    cborHex:
      '84a500d9010281825820ebd40ab9f949ca492f31f30bd8b17a0f97df4d17fcf499d15aa641521b61a5d50001818258390074976c54afaf444f7cd499bd8519aac6592b13b22b9d5817f0da5c5203d205532089ad2f7816892e2ef42849b7b52788e41b3fd43a6e01cf1a0047c479021a0006bbc2031a011f6b4a04d901028183078200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a001e8480a0f5f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
              'hex',
            ),
            Buffer.from(
              'a6fd187409ad26d4fd08f00c141b26e0b5df8b9993c150a281c160de91cfff1ecdd8d4ae5800757ab353a4a16c07e455127b892b61562d37dbc1ff7c6e423c03',
              'hex',
            ),
          ],
          path: signingFiles.stake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
              'hex',
            ),
            Buffer.from(
              'b7bb56ef639520e353e08080f2367e642dbf03ec6e324906a5fca6f40a0527a742db9bf5d7df814a9df1077978cfff2cf8cd2cb024ed88ab149139df7035fe07',
              'hex',
            ),
          ],
          path: signingFiles.payment0.path,
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

  // for (let i = 0; i < witnesses.shelleyWitnesses.length; i++) {
  //   console.log(witnesses.shelleyWitnesses[i].data[0].toString('hex'))
  //   console.log(transaction.witnesses.shelleyWitnesses[i].data[0].toString('hex'))
  //   console.log('\n')
  //   console.log(witnesses.shelleyWitnesses[i].data[1].toString('hex'))
  //   console.log(transaction.witnesses.shelleyWitnesses[i].data[1].toString('hex'))
  //   console.log('\n')
  // }

  assert.deepStrictEqual(witnesses, transaction.witnesses)
}

describe('Trezor tx witnessing', () => {
  let cryptoProvider: CryptoProvider
  // eslint-disable-next-line prefer-arrow-callback
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await TrezorCryptoProvider()
  })
  const txs = Object.entries(transactions)

  txs.forEach(([txType, tx]) =>
    it(`Should witness tx ${txType}`, async () =>
      await testTxWitnessing(cryptoProvider, tx)).timeout(100000),
  )
})
