/* eslint-disable max-len */
const assert = require('assert')
const { TxAux } = require('../../../../src/transaction/transaction')
const { TrezorCryptoProvider } = require('../../../../src/crypto-providers/trezorCryptoProvider')
const { NETWORKS, HARDENED_THRESHOLD } = require('../../../../src/constants')
const { validateSigning, validateWitnessing } = require('../../../../src/crypto-providers/util')

// mnemonic "all all all all all all all all all all all all"

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
    cborXPubKeyHex: '58405d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1f123474e140a2c360b01f0fa66f2f22e2e965a5b07a80358cf75f77abbd66088',
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
    cborXPubKeyHex: '5840bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e413a00f69b7700a96f67c149b7c8eec88afd7f0b9cfb4f86f4c5f1e56296ed90',
  },
  byron0: {
    type: 0,
    path: [
      44 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      0,
    ],
    cborXPubKeyHex: '5840b90fb812a2268e9569ff1172e8daed1da3dc7e72c7bded7c5bcb7282039f90d5fd8e71c1543de2cdc7f7623130c5f2cceb53549055fa1f5bc88199989e08cce7',
  },
}

const transactions = {
  withInputAndOutput: {
    // 97e0928d7f82f75e2917fddd07eeaaffaf2037ef07c9e1b0284337a3cfe4adcb
    unsignedCborHex: '82a4008182582066001e24baf17637192d3a91c418cf4ed3c8053e333d0c35bd388deb2fa89c92000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a002b8a44021a0002b473031a00a2d750f6',
    hwSigningFiles: [signingFiles.payment0],
    signedTxCborHex: '83a4008182582066001e24baf17637192d3a91c418cf4ed3c8053e333d0c35bd388deb2fa89c92000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a002b8a44021a0002b473031a00a2d750a100818258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c158408141385df82ac9baa1699a2f3c0aff8eb1a0db3bf937e7c6942b20b00add410c3fac56c63d07a65e5d797f6c684c10e84e39ef412c775d7d98b353cb00231404f6',
    network: 'MAINNET',
  },
  withDelegation: {
    // 37942f7997c26a6e7692a29fb382b68b9e485eabe204e2d0ae488d271a6eb3da
    unsignedCborHex: '82a500818258201d7b25ce20ee92aa96b6fba145e8b4a5efdefa7df8fc225477297cf026efadfa0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a00323cdc021a0002e595031a00e37f31048183028200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a500818258201d7b25ce20ee92aa96b6fba145e8b4a5efdefa7df8fc225477297cf026efadfa0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a00323cdc021a0002e595031a00e37f31048183028200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a10082825820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e5840d2addc046794d2ead623e3835b4edc02eba1502771ef145b5634ff63411751a4b63a7580ac9433914cc5e016bbbd23aced51044c479a39cc463cac235ad100038258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c158408c09b9f5aaaae2e07389d6101d5ecc4a2c6c33f87adc4ea4ff2a13b8a9128750ff4e67459d23c35aaff94e19d9be9ca8f5bb51245ebcf0d8c85a1ff45a401907f6',
    network: 'MAINNET',
  },
  withWithdrawal: {
    // 4376ea43c3552cb57197a41428fce00e3c2ec9cff7444e50fe9e3750c279549f
    unsignedCborHex: '82a500818258205c38555bbbec0e95cd59cd7df45195e07af73a8dbd08a246bf87a687765d6c590001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a003aee4b021a0002eb41031a00e37f3105a1581de1122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427719d08cf6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a500818258205c38555bbbec0e95cd59cd7df45195e07af73a8dbd08a246bf87a687765d6c590001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a003aee4b021a0002eb41031a00e37f3105a1581de1122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427719d08ca10082825820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e58400b266bfefe1919673e2aa456b123fdd9bc80ef9f6c948bbc2ad53ca58997ff454a8161d1164e1598255864a27c2ecab3734f9af1a753a24ba0275a72741e130a8258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c15840054075f078180eca611201dcf9b6278b2b11389db5a2c841f4e6a5bd62ef6313cfe18c6dd08068878fea764245ed1c63a1e76687899d48849db77c8d9e944e02f6',
    network: 'MAINNET',
  },
  withStakingKeyDeregistration: {
    // b25238a1c60ee9e30dd4ce41af5fa78e2cc4e17346bcc47831a3c98c5945370f
    unsignedCborHex: '82a500818258204376ea43c3552cb57197a41428fce00e3c2ec9cff7444e50fe9e3750c279549f0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a0056925e021a0002e06d031a00e37f31048182018200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a500818258204376ea43c3552cb57197a41428fce00e3c2ec9cff7444e50fe9e3750c279549f0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a0056925e021a0002e06d031a00e37f31048182018200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277a10082825820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e5840efe4b1bbfc0e4ec5aa3b7bb95d61c952bab7f4ab17b99ef197c0b1cb9dafd4b811a1275a56bfac75a1e2e718379487aef49d9f073d132a24ba13491698cef1098258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c158400741de2b8807e44f9c8fafc75e8fd44190eddd629d31e5093e2f2c8723bb5df3007ea44d0d242b0ba35b24525782ccbd2e1e7c6bca8b29af744ae88fec635c00f6',
    network: 'MAINNET',
  },
  withStakeKeyRegistrationAndDelegation: {
    // 1d7b25ce20ee92aa96b6fba145e8b4a5efdefa7df8fc225477297cf026efadfa
    unsignedCborHex: '82a50081825820b25238a1c60ee9e30dd4ce41af5fa78e2cc4e17346bcc47831a3c98c5945370f0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a00352271021a0002eb6d031a00e37f31048282008200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427783028200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a50081825820b25238a1c60ee9e30dd4ce41af5fa78e2cc4e17346bcc47831a3c98c5945370f0001818258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a00352271021a0002eb6d031a00e37f31048282008200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427783028200581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438a10082825820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e5840378975f3b728e434471179ed87b8a2041ea478aac2d588ca222a353de3beadae7ecf9c657e62cdb26e9a499dca67fb491386471a119a2b59e17c294ecf7329098258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c158406a111389b6bc7b8a8d4e0473f7d8833a4b9d07c28d7c3070e805e2c9ded76140ba77dee65cf4955557bb04e2b58e1c84113f1d20028612cc5fe8fb8b64614e02f6',
    network: 'MAINNET',
  },
  withMultipleInputsAndOutputs: {
    // b06f6d9fbb888e82fd785a7e84760bbf89aea7a54e961840ecb8cb0bfe4aa7b5
    unsignedCborHex: '82a4008182582056fad20b5e1786b3e76017b256b56dbe4d677f27da4675f5666b3344add7f330000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a00211c70021a00029b75031a00c4fab1f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a4008182582056fad20b5e1786b3e76017b256b56dbe4d677f27da4675f5666b3344add7f330000181825839013fc4aa3daffa8cc5275cd2d095a461c05903bae76aa9a5f7999613c58636aa540280a200e32f45e98013c24218a1a4996504634150dc55381a00211c70021a00029b75031a00c4fab1a100818258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c15840a77a20ce884f88e0cd690f65f864fa9946de93561c663066619ae8a40069a9a0df30f18561029b4f830451d69a8cfd8f597abb17abb2d56d7f165093dd6c980bf6',
    network: 'MAINNET',
  },
  withTestnetOutputs: {
    // ebdace28e630ee2d2048460bf2ebca31c2b0ad775206b78255ecf6f4e955b86e
    unsignedCborHex: '82a40081825820c8f0d737ca5c647c434fea02759755a404d9915c3bd292bd7443ae9e46f5b7b1000181825839003b04dabe6e473ebffa196a2cee191cba32a25a8dc71f2fa35e74785b5e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f121b00005af31077b2cf021a00028d31031a0081b320f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.stake0],
    signedTxCborHex: '83a40081825820c8f0d737ca5c647c434fea02759755a404d9915c3bd292bd7443ae9e46f5b7b1000181825839003b04dabe6e473ebffa196a2cee191cba32a25a8dc71f2fa35e74785b5e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f121b00005af31077b2cf021a00028d31031a0081b320a100818258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c15840c4826f8bb93bdf0b04a4f58d9190e75dbc2e615d4c2d68982d337163b062be65e0e5fb6749dacad30e329d3fa295d39a0ca6a8ec1230d47ef125a602e5c21b0ff6',
    network: 'TESTNET',
  },
  withPoolRegistration: {
    // e3b9a5657bf62609465a930c8359d774c73944973cfc5a104a0f0ed1e1e8db21
    unsignedCborHex: '82a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583901eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff0102182a030a04818a03581cf61c42cbf7c8c53af3f520508212ad3e72f674f957fe23ff0acb49735820198890ad6c92e80fbdab554dda02da9fb49d001bbd96181f3e07f7a6ab0d06401a1dcd65001a1443fd00d81e820102581de13a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c49071182581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c3a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c4907118584001904d244c0a8000150b80d01200000a3852e8a00003473700384001904d2f650b80d01200000a3852e8a00003473700384001904d244c0a80001f683011904d26d7777772e746573742e7465737482026e7777772e74657374322e74657374827568747470733a2f2f7777772e746573742e746573745820914c57c1f12bbf4a82b12d977d4f274674856a11ed4b9b95bd70f5d41c5064a6f6',
    hwSigningFiles: [signingFiles.stake0],
    signedTxCborHex: '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583901eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff0102182a030a04818a03581cf61c42cbf7c8c53af3f520508212ad3e72f674f957fe23ff0acb49735820198890ad6c92e80fbdab554dda02da9fb49d001bbd96181f3e07f7a6ab0d06401a1dcd65001a1443fd00d81e820102581de13a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c49071182581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c3a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c4907118584001904d244c0a8000150b80d01200000a3852e8a00003473700384001904d2f650b80d01200000a3852e8a00003473700384001904d244c0a80001f683011904d26d7777772e746573742e7465737482026e7777772e74657374322e74657374827568747470733a2f2f7777772e746573742e746573745820914c57c1f12bbf4a82b12d977d4f274674856a11ed4b9b95bd70f5d41c5064a6a10081825820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e584006305b52f76d2d2da6925c02036a9a28456976009f8c6432513f273110d09ea26db79c696cec322b010e5cbb7d90a6b473b157e65df846a1487062569a5f5a04f6',
    witness: {
      key: 0,
      data: [
        Buffer.from('bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e', 'hex'),
        Buffer.from('06305b52f76d2d2da6925c02036a9a28456976009f8c6432513f273110d09ea26db79c696cec322b010e5cbb7d90a6b473b157e65df846a1487062569a5f5a04', 'hex'),
      ],
    },
    network: 'MAINNET',
  },
  withPrivatePoolReg: {
    // 795c15a1b2ebe7358b64a3cbfd6865e3a065079db3559e4062ab2f2e30308e73
    unsignedCborHex: '82a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b7000181825839017cb05fce110fb999f01abb4f62bc455e217d4a51fde909fa9aea545443ac53c046cf6a42095e3c60310fa802771d0672f8fe2d1861138b090102182a030a04818a03581c13381d918ec0283ceeff60f7f4fc21e1540e053ccf8a77307a7a32ad582007821cd344d7fd7e3ae5f2ed863218cb979ff1d59e50c4276bdc479b0d0844501b0000000ba43b74001a1443fd00d81e82031864581de1794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad82581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c794d9b3408c9fb67b950a48a0690f070f117e9978f7fc1d120fc58ad80f6f6',
    hwSigningFiles: [signingFiles.stake0],
    signedTxCborHex: '83a500818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583901eb0baa5e570cffbe2934db29df0b6a3d7c0430ee65d4c3a7ab2fefb91bc428e4720702ebd5dab4fb175324c192dc9bb76cc5da956e3c8dff0102182a030a04818a03581cf61c42cbf7c8c53af3f520508212ad3e72f674f957fe23ff0acb49735820198890ad6c92e80fbdab554dda02da9fb49d001bbd96181f3e07f7a6ab0d06401a1dcd65001a1443fd00d81e820102581de13a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c49071182581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277581c3a7f09d3df4cf66a7399c2b05bfa234d5a29560c311fc5db4c4907118584001904d244c0a8000150b80d01200000a3852e8a00003473700384001904d2f650b80d01200000a3852e8a00003473700384001904d244c0a80001f683011904d26d7777772e746573742e7465737482026e7777772e74657374322e74657374827568747470733a2f2f7777772e746573742e746573745820914c57c1f12bbf4a82b12d977d4f274674856a11ed4b9b95bd70f5d41c5064a6a10081825820bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e584006305b52f76d2d2da6925c02036a9a28456976009f8c6432513f273110d09ea26db79c696cec322b010e5cbb7d90a6b473b157e65df846a1487062569a5f5a04f6',
    witness: {
      key: 0,
      data: [
        Buffer.from('bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e', 'hex'),
        Buffer.from('a1566eed590d732ce3734e9502f109035b209351b175bf27e33caeeac37602a22b5dbe5339e32ef985e449efb254b5da0251b8cb89dd444e0b28a59f60b30107', 'hex'),
      ],
    },
    network: 'MAINNET',
  },
  withBigintOutputs: {
    // 62c36ab26608bdd827c5494126063eea704a51ea68803c59834b34f9f85bf8d4
    unsignedCborHex: '82a50081825820897c3429f794c44aecbe6f2e4f292836f3153f85ce2026b86a13ecbdbadaa05700018182581d60daad04ed2b7f69e2a9be582e37091739fa036a14c1c22f88061d43c71b0055a275925d560f021a000249f00319138804818a03581c61891bbdc08431a1d4d4911903dad04705f82e29a87e54cc77db217f582092c4a889cca979e804327595768d107295ad7cb6e9a787ef6b23b757ba3433381b0000b5e620f480001a1dcd6500d81e82030a581de05e3b888f476e3634020b43079cf27437aee4432648a7580bc24a7f1281581c122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b427780f6f6',
    hwSigningFiles: [signingFiles.stake0],
    signedTxCborHex: '',
    witness: {
      key: 0,
      data: [
        Buffer.from('bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e', 'hex'),
        Buffer.from('7eee4be1b2b5640c30dd4cfd67836c0d79e2efa9d7d72c73d24ce1ffd7ec40d601316c9b8bc2ae5e6d5a2fd5e664094f5ae97a83ffacccefb87e43e98c30aa0f', 'hex'),
      ],
    },
    network: 'TESTNET',
  },
  withByronInputAndOutput: {
    // b6bd988dda0f75e322b253bbe971d467995796126987a99e039a9be8af36581a
    unsignedCborHex: '82a4008282582086e54b377489541d1e8fcd889c4e4a8d47cd03acfe784bc0bf191a9f1c84810f0082582086e54b377489541d1e8fcd889c4e4a8d47cd03acfe784bc0bf191a9f1c84810f01018282582b82d818582183581c578e965bd8e000b67ae6847de0c098b5c63470dc1a51222829c482bfa0001aae9713fc1a000f42408258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a0017c72f021a0002e630031a00b5b373f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.byron0],
    signedTxCborHex: '83a4008282582086e54b377489541d1e8fcd889c4e4a8d47cd03acfe784bc0bf191a9f1c84810f0082582086e54b377489541d1e8fcd889c4e4a8d47cd03acfe784bc0bf191a9f1c84810f01018282582b82d818582183581c578e965bd8e000b67ae6847de0c098b5c63470dc1a51222829c482bfa0001aae9713fc1a000f42408258390180f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b42771a0017c72f021a0002e630031a00b5b373a200818258205d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c158401c18913daef380349ea697bdde3c671fd57ee56f423602634f2b4b8384e38bdf43b8384c86a353ff3e96ecf7f53bf1060a5c19dc21588c747e9c1f17be3ace090281845820b90fb812a2268e9569ff1172e8daed1da3dc7e72c7bded7c5bcb7282039f90d55840bd5f70684019886ce98f88f3c9ed5693a790930f4a736cdbcd1103523bae16079d90e706372f17fd2e6e5eb46eda840afbb3e51135eb0c32507d82b31b3531035820fd8e71c1543de2cdc7f7623130c5f2cceb53549055fa1f5bc88199989e08cce741a0f6',
    network: 'MAINNET',
  },
}

async function testTxSigning(cryptoProvider, transaction) {
  const txAux = TxAux(transaction.unsignedCborHex)
  validateSigning(txAux, transaction.hwSigningFiles)
  const signedTxCborHex = await cryptoProvider.signTx(
    txAux,
    transaction.hwSigningFiles,
    NETWORKS[transaction.network],
    [],
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

describe('Trezor tx signing and witnessing', () => {
  let cryptoProvider
  before(async () => {
    cryptoProvider = await TrezorCryptoProvider()
  })
  after(async () => {
    process.exit(0)
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
