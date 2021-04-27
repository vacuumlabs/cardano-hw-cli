/* eslint-disable max-len */

const { HARDENED_THRESHOLD } = require('../../../../src/constants')

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

module.exports = {
  signingFiles,
}
