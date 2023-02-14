/* eslint-disable max-len */

import {HARDENED_THRESHOLD} from '../../../../src/constants'
import {HwSigningType} from '../../../../src/command-parser/argTypes'

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
    cborXPubKeyHex:
      '58405d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1f123474e140a2c360b01f0fa66f2f22e2e965a5b07a80358cf75f77abbd66088',
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
      '5840bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e413a00f69b7700a96f67c149b7c8eec88afd7f0b9cfb4f86f4c5f1e56296ed90',
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
    cborXPubKeyHex:
      '5840b90fb812a2268e9569ff1172e8daed1da3dc7e72c7bded7c5bcb7282039f90d5fd8e71c1543de2cdc7f7623130c5f2cceb53549055fa1f5bc88199989e08cce7',
  },
  mint0: {
    type: HwSigningType.Mint,
    path: [
      1855 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
    ],
    cborXPubKeyHex:
      '5840b75258e4f61eb7b313d8554c2fe10673cf214ca2d762bfd53ec3b7846e2ee8729ad37dc23fe1cda7b0ac5574c6f16171cdb2bb723496954770a2bf0e08334e8f',
  },
  mint1: {
    type: HwSigningType.Mint,
    path: [
      1855 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      1 + HARDENED_THRESHOLD,
    ],
    cborXPubKeyHex:
      '5840a54627d6d16724032172541d4261e7aa87c06395724f1d18975a21d56650bda9bccfd881a3bb7eefbfb885a80909c30892a9a2151f7530c10c68ec6e7a89b28a',
  },
  multisigPayment0: {
    type: HwSigningType.MultiSig,
    path: [
      1854 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      0,
    ],
    cborXPubKeyHex:
      '5840b10be5c0d11ad8292bbe69e220ca0cfbe154610b3041a8e72f9d515c226ab3b165233c4f8300b95eb497ed313f7294500c0a4aa0bd24f2127c4d260861fff4e7',
  },
  multisigPayment1: {
    type: HwSigningType.MultiSig,
    path: [
      1854 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      0,
      1,
    ],
    cborXPubKeyHex:
      '5840021a000e3be05eb09051983cbf728322149cc5687a79f0a1dbccd25b3a754c59fd1f24d96ba4d4fa344b5121ddfe77b9e8246e2885baa8c766bf35508498e2c5',
  },
  multisigStake0: {
    type: HwSigningType.MultiSig,
    path: [
      1854 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      2,
      0,
    ],
    cborXPubKeyHex:
      '5840f2ef4ecd21ad28a8d270ca7be7e96c87f60dc821e13c0d0c5870344e9693637cab0d8a3fa4999bc06b0aa9d49bee11fb196dc55d57ff71507f053550c7bdc1e0',
  },
  multisigStake1: {
    type: HwSigningType.MultiSig,
    path: [
      1854 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      0 + HARDENED_THRESHOLD,
      2,
      1,
    ],
    cborXPubKeyHex:
      '58408c9a9345563ec749fbd804bd9b19f048c6686dbc32f4854174c6e4a278fcc0c58690f1fc8289353904711b5aa2d8889265a97a46b14f408b47a69e6fafab176f',
  },
}

export {signingFiles}
