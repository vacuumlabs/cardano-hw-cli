/* eslint-disable max-len */

const { HARDENED_THRESHOLD } = require('../../../../src/constants')
const { HwSigningType } = require('../../../../src/types')

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
    cborXPubKeyHex: '5840cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2914ba07fb381f23c5c09bce26587bdf359aab7ea8f4192adbf93a38fd893ccea',
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
    cborXPubKeyHex: '584066610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8e977e956d29810dbfbda9c8ea667585982454e401c68578623d4b86bc7eb7b58',
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
    cborXPubKeyHex: '5840b3d5f4158f0c391ee2a28a2e285f218f3e895ff6ff59cb9369c64b03b5bab5eb27e1d1f3a3d0fafc0884e02a2d972e7e5b1be8a385ecc1bc75a977b4073dbd08',
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
    cborXPubKeyHex: '584080d04383c04191af5436d6a25b3d193003884f8c770d2c0db6c54a61bf524075199ff847eb73fea22b46ec74e91ff0588715ce946b7983c85ae4d35477019d4a',
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
    cborXPubKeyHex: '584090ca5e64214a03ec975e5097c25b2a49d4ca4988243bc0142b5ada743d80b9d5be68538e05e31dc8fff62a62868c43f229cacbee5c40cbe6493929ad1f0e3cd9',
  },
  poolCold0: {
    type: HwSigningType.PoolCold,
    path: [
      1853 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
    ],
    cborXPubKeyHex: '58403d7e84dca8b4bc322401a2cc814af7c84d2992a22f99554fe340d7df7910768d1e2a47754207da3069f90241fbf3b8742c367e9028e5f3f85ae3660330b4f5b7',
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
    cborXPubKeyHex: '584066e283c52a7f05ca79db5483380597c0bb01abfb5bd8af27d5ed2487875d3b82f99653db092154b8299299c8b50c4411d1e18d2e5b0c22b17ce73128bfb92c99',
  },
  mint0: {
    type: HwSigningType.Mint,
    path: [
      1855 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
    ],
    // TODO Ledger: set correct key
    cborXPubKeyHex: '5840b75258e4f61eb7b313d8554c2fe10673cf214ca2d762bfd53ec3b7846e2ee8729ad37dc23fe1cda7b0ac5574c6f16171cdb2bb723496954770a2bf0e08334e8f',
  },
}

module.exports = {
  signingFiles,
}
