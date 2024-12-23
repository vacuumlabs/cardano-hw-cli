/* eslint-disable max-len */

import {HARDENED_THRESHOLD} from '../../../../src/constants'
import {HwSigningType} from '../../../../src/command-parser/argTypes'

// mnemonic "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

const signingFiles = {
  payment0: {
    type: HwSigningType.Payment,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      0,
    ],
    cborXPubKeyHex:
      '5840cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2914ba07fb381f23c5c09bce26587bdf359aab7ea8f4192adbf93a38fd893ccea',
  },
  stake0: {
    type: HwSigningType.Stake,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      2,
      0,
    ],
    cborXPubKeyHex:
      '584066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8e977e956d29810dbfbda9c8ea667585982454e401c68578623d4b86bc7eb7b58',
  },
  payment1: {
    type: HwSigningType.Payment,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      1,
    ],
    cborXPubKeyHex:
      '5840b3d5f4158f0c391ee2a28a2e285f218f3e895ff6ff59cb9369c64b03b5bab5eb27e1d1f3a3d0fafc0884e02a2d972e7e5b1be8a385ecc1bc75a977b4073dbd08',
  },
  stake1: {
    type: HwSigningType.Stake,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      2,
      1,
    ],
    cborXPubKeyHex:
      '584080d04383c04191af5436d6a25b3d193003884f8c770d2c0db6c54a61bf524075199ff847eb73fea22b46ec74e91ff0588715ce946b7983c85ae4d35477019d4a',
  },
  byron10: {
    type: HwSigningType.Payment,
    path: [
      44 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      10,
    ],
    cborXPubKeyHex:
      '584090ca5e64214a03ec975e5097c25b2a49d4ca4988243bc0142b5ada743d80b9d5be68538e05e31dc8fff62a62868c43f229cacbee5c40cbe6493929ad1f0e3cd9',
  },
  dRep: {
    type: HwSigningType.DRep,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      3,
      0,
    ],
    cborXPubKeyHex:
      '58407cc18df2fbd3ee1b16b76843b18446679ab95dbcd07b7833b66a9407c0709e3701d881e1c04fed8defa9a3e8bd3cf85bd975f813ff8eb622d20a4375a07d6bc9',
  },
  committeeCold: {
    type: HwSigningType.CommitteeCold,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      4,
      0,
    ],
    cborXPubKeyHex:
      '5840bc8c8a37d6ab41339bb073e72ce2e776cefed98d1a6d070ea5fada80dc7d67376f58406a51d33bb35e98884cbadced9bc94f65a752001ad5f4788af07b2ec0fe',
  },
  committeeHot: {
    type: HwSigningType.CommitteeHot,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      1 + HARDENED_THRESHOLD,
      5,
      0,
    ],
    cborXPubKeyHex:
      '5840624142a80217b95ca2fc5b0c1f8d74e26e5683621c430c7bc7eebca6ee541a5892a8c64cfdf1af08e78c2ba59bef496eb34ddf24bdf0f91404a962415a7a0810',
  },
  poolCold0: {
    type: HwSigningType.PoolCold,
    path: [
      1853 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
    ],
    cborXPubKeyHex:
      '58403d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d1e2a47754207da3069f90241fbf3b8742c367e9028e5f3f85ae3660330b4f5b7',
  },
  payment0account1: {
    type: HwSigningType.Payment,
    path: [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      1 + HARDENED_THRESHOLD,
      0,
      0,
    ],
    cborXPubKeyHex:
      '584066e283c52a7f05ca79db5483380597c0bb01abfb5bd8af27d5ed2487875d3b82f99653db092154b8299299c8b50c4411d1e18d2e5b0c22b17ce73128bfb92c99',
  },
  mint0: {
    type: HwSigningType.Mint,
    path: [
      1855 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
    ],
    cborXPubKeyHex:
      '5840b9de636bf236e5543377e4b4d6b63613f188fb65b83b8a61c4b68be0c196c3d83545aee9b82476574ff115aa1c7ab688c24b4bca687af4bb79129e4fcea066da',
  },
  mint1: {
    type: HwSigningType.Mint,
    path: [
      1855 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      1 + HARDENED_THRESHOLD,
    ],
    cborXPubKeyHex:
      '5840f87ee3ee2316d92f73dca6112a197340a1eae157574765099dd631132818bc1587110ea86e1a14dec1cb234a179c2b5caba823b4812da2a5c431c695b17982ac',
  },
}

export {signingFiles}
