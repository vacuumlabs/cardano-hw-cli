/* eslint-disable max-len */

const { HARDENED_THRESHOLD } = require('../../../../src/constants')
const { HwSigningType } = require('../../../../src/types')

// mnemonic "all all all all all all all all all all all all"

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
    cborXPubKeyHex: '58405d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1f123474e140a2c360b01f0fa66f2f22e2e965a5b07a80358cf75f77abbd66088',
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
    cborXPubKeyHex: '5840bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e413a00f69b7700a96f67c149b7c8eec88afd7f0b9cfb4f86f4c5f1e56296ed90',
  },
  byron0: {
    type: HwSigningType.Payment,
    path: [
      44 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      0,
    ],
    cborXPubKeyHex: '5840b90fb812a2268e9569ff1172e8daed1da3dc7e72c7bded7c5bcb7282039f90d5fd8e71c1543de2cdc7f7623130c5f2cceb53549055fa1f5bc88199989e08cce7',
  },
  mint0: {
    type: HwSigningType.Mint,
    path: [
      1855 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
    ],
    cborXPubKeyHex: '5840b75258e4f61eb7b313d8554c2fe10673cf214ca2d762bfd53ec3b7846e2ee8729ad37dc23fe1cda7b0ac5574c6f16171cdb2bb723496954770a2bf0e08334e8f',
  },
}

module.exports = {
  signingFiles,
}
