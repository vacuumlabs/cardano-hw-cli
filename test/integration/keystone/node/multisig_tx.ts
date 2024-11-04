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
  multisig_withMultisigPaymentAddress: {
    // Tx sending ADA from address defined by `all` script which has two pubkey
    // hashes defined by the signing files below, that's why we need both
    // signing files to sign this transaction
    cborHex:
      '83a4008182582017ad99d6729537cf7e7bdaf5cc262c77bb0a578c2907a8948c7264d11cd58278000181825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a3b980b23021a0002bedd031a02407922a0f6',
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
              '0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0',
              'hex',
            ),
            Buffer.from(
              '89f5706a7e0e7ac2d2f1f8d6631090b6bde479d887c331c27971734124aedb699cb194b430ff4929d669e7ea57d2855d20dfcf04901a8fbb17e5b90c3e18de01',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e',
              'hex',
            ),
            Buffer.from(
              'f8a239f7c0f0587987aaf89496e23ad4574639458cf1ae3e158770a893e446d00f203cdfa74f2d63387df67bb1a18468490d8e37329f78d292599f68cfcff700',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment1.path,
        },
      ],
    },
  },

  multisig_stakeAddressRegistrationCertificate: {
    // Registers a script stake address that is used in the withdrawal below
    cborHex:
      '83a50081825820d5757f5ba07b09ee050692cebf3c605af12ff73c1eea4c99a769eae831850ec400018182583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb4011a3b6e88c7021a0002aa11031a0243037d048182008201581cb494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb401a0f6',
    hwSigningFiles: [signingFiles.multisigPayment0],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0',
              'hex',
            ),
            Buffer.from(
              '37e4343aa3fbd6097b787ff67d3ecd391be7a8b558a6a0d1aff29fc5191a2b3ba618387f8a89ac4d41a61f7040594a09aa269f9c484cfba1c1bc8d2f239c3308',
              'hex',
            ),
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
    cborHex:
      '83a400818258202074b3783b7739037cabe8d6e9f2ca2ac8031c9d1a45334ae6853f7839709c5500018182583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb4011a3b6b9d3a021a0002eb8d05a1581df0b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb40100a0f6',
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
              '0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0',
              'hex',
            ),
            Buffer.from(
              '4f348f2c6c366a835bf4b57e3520c24cc79684c0b4aa0c53f649d549f773e8725378cc05dbf0e5d14db9deb20b425a4253ae98b7202b902964fd7f7b762bd901',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6',
              'hex',
            ),
            Buffer.from(
              '3eceec558e9cb3a859fa4631aba0d2627e7e72f3d41bc80a050c8bc8ec87ab8d02b81a56cd540dc8f9fa2e6c63f139f31665ba3d7efd3ea63136603b239b9708',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'b58d0c958e7e76f7cac5f3e696285ce955750967972af13ba7427cd91808a560',
              'hex',
            ),
            Buffer.from(
              '8680ed01ec7715f6a216b9f0bcfff30fb4129f773dd13cfb6804726d5f56c1e6eda83e33e87f4064dcca366a9d8c2525287c6e7c6f6213023f4a9fd5ad741f09',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake1.path,
        },
      ],
    },
  },

  multisig_stakeAddressDeregistrationCertificate: {
    // The same stake address as used in withdrawal, also requires both stake
    // key signatures in order to be valid.
    cborHex:
      '83a40081825820c961208acdd0d92d24837e904adbf044dd1f0d2a0fa1e1c2108299e896673d5a00018182583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb4011a3b8fb758021a0002dae1048182018201581cb494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb401a0f6',
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
              '0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0',
              'hex',
            ),
            Buffer.from(
              'dd08adfdbc5d9063df23dbe9e515cba6b01d4e846aea58fdee5a9ada32ea5cd5b631f7da3ff12afd116466fab7c002afce4114d13084e48719e51e84b6fa5006',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6',
              'hex',
            ),
            Buffer.from(
              '9ce55b24e874c77410ef3ea9939bae13659260d3d95a723c977f9b2f3fe45cbb7414791a8f0313585d18328c5f9a38d4373c9f8ac679fbda60b44fd53090d306',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'b58d0c958e7e76f7cac5f3e696285ce955750967972af13ba7427cd91808a560',
              'hex',
            ),
            Buffer.from(
              'ac0558c3e80cf650038dd1e7e5ef04e7bd4560847c94d5762875601a44c07445e20b8cf7aa263794d999626695ed5c6fb0447254792d44fe555834a12f03110f',
              'hex',
            ),
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
    cborHex:
      '83a50081825820a72233e30fecef67cbefb527a212bca5aea30dfb445ea5be63894957bfc238a4000182825839306665c42b15b35c7937381bd545c5e7b6b3a03a24cf0383d409ac4583381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc821a00989680a1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000927c0825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a2727ba60021a00030899048182018201581c381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc05a1581df0381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc00a0f6',
    hwSigningFiles: [
      signingFiles.multisigPayment1,
      signingFiles.multisigPayment2,
      signingFiles.multisigStake0,
    ],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e',
              'hex',
            ),
            Buffer.from(
              '5c88b9995af1866ac5822efe26d34b2e2ee2b05ab08c52029eac79f4aa9d6e983c867bf92a22888c732b638b1268cfc384dab7017b69152ddd842b6e4ea4ed0f',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'd6718e4553626239ef7470b9287340490fe71d084039f21f5b10c84e29bf3e81',
              'hex',
            ),
            Buffer.from(
              '8d0365080513e7b3236c6a018f93a153f711809397fc15a246ca0bf1a47bc83343396b0758418b101300c28692f42acd48182c1de2c787273e4c3c91b1dcb004',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment2.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6',
              'hex',
            ),
            Buffer.from(
              '9e63450b57199505647b739375e6a10a6bb9e774dcd570bf569e951fefb1f86eac73a19416ce1e823cfe6a7dd90cd9c8b38478e8fc5d57e54e2a7349dd24e104',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake0.path,
        },
      ],
    },
  },

  multisig_registerAndDelegateScriptStakeAddress: {
    cborHex:
      '83a40081825820e18839929c278002510040ef5e8e33cfd8e758dad788e91f2c96a5c0b63940bc000181825839306665c42b15b35c7937381bd545c5e7b6b3a03a24cf0383d409ac4583381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc821a00771887a1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000927c0021a0002f979048282008201581c381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc83028201581c381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc581c001337292eec9b3eefc6802f71cb34c21a7963eb12466d52836aa390a0f6',
    hwSigningFiles: [
      signingFiles.multisigPayment1,
      signingFiles.multisigPayment2,
      signingFiles.multisigStake0,
    ],
    network: 'TESTNET_LEGACY1',
    witnesses: {
      byronWitnesses: [],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              '2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e',
              'hex',
            ),
            Buffer.from(
              '101a42128519020bf92eb85b15650d75e91f37db2894d7dfbcd260db824546e90c39f7f307356ad4be6f61e832ab11ae165222236279c95e12a5146bd847bf08',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'd6718e4553626239ef7470b9287340490fe71d084039f21f5b10c84e29bf3e81',
              'hex',
            ),
            Buffer.from(
              '173431eee80c78cb7a6b1b701eb04f1c5c3184e42c59f5f51bb744775276dad510f359365f4d0189dee93016a194ce6fb88134a1459f1caf7c6193665d15fa0a',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment2.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6',
              'hex',
            ),
            Buffer.from(
              '9c204a10dfdf69de8def2f7909a3f9fad408f891c61fb1c9c184c4989a549781e50aef53a874d418620d8645bbcd7a645e250f3a7499d41001eeee67362a440b',
              'hex',
            ),
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
    cborHex:
      '83a60082825820169422f7193e3418318c2420590778e68619119403472f70c0bb9e9feb2b457100825820cba5f1dd03010380d5c1a6471e7223ac48a7baf75c76e3824896d4398fe0155e000183825839306665c42b15b35c7937381bd545c5e7b6b3a03a24cf0383d409ac4583381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc821a27aa98ffa1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000927c082583930de685e72586c4269087e282c9c7e78ba22082bce4a674977b4000e99b494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb401821a27aa98ffa1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a00061a80825839000743d16cfe3c4fcc0c11c2403bbc10dbc7ecdd4477e053481a368e7a06e2ae44dff6770dc0f4ada3cf4cf2605008e27aecdb332ad349fda71a27aa98fe021a0003ba51048182018201581cb494d35f236093e7caed75d2b99b1e523cde935a6f4a2d276b9fb40105a1581df0381f757b787201d66ae47603d1abd06ceaa031188e923568c937e8bc0009a1581c13a36080b2263de3bf122d69f680eff37f8f640dac951e6048abd664a1444b6f6a6e1a000f4240a0f6',
    hwSigningFiles: [
      signingFiles.multisigPayment1,
      signingFiles.multisigPayment2,
      signingFiles.multisigPayment0,
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
              '2573f7cde2d182ebbcd63dc0940fd53064824e716a6d0238fa3780bac2933e2e',
              'hex',
            ),
            Buffer.from(
              '6e6fc694006adbf112a61a3e342e2e86511e45044c67598d4cf2f21d1ceb74017921c9cc696ee9274afca3a7d7efa2442bf83ab6115631b903d4d5348e7c720a',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'd6718e4553626239ef7470b9287340490fe71d084039f21f5b10c84e29bf3e81',
              'hex',
            ),
            Buffer.from(
              'b9047ab4029958ffd9bbc4a4b6c4891a015828a1d30981bc2c1add7463a6066e41ac4c9d8550ed8546b9dd060ca3559cab810e5da30dada6b6c89d26b4e53203',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment2.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '0fa60d5831ee0be1f221ff93ba0a4fdeca5a5866e47569607b04e287fc9b5ec0',
              'hex',
            ),
            Buffer.from(
              'cf364809f1e57bfa7c85cf648c704fff96dbcbe3d9b3e75e62b12d1b72979f0fffa6db9caec02f15c95d2f96b2c90bea0d62015acdd0e694590879d4c8b87d0c',
              'hex',
            ),
          ],
          path: signingFiles.multisigPayment0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              '91e2647a4db84e47c895160b1f534d72c24c5eaf0aefb5f72dbfdea9913d96c6',
              'hex',
            ),
            Buffer.from(
              '6a6fd7a0109be3f2d3c9d0c41b046081c92eff3cb0bef7663294709858ee044a98dfbb0a61ecb669632d51de98c79f22d6a1b3ebe6c0d57cd6f443f3d1682c0a',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'b58d0c958e7e76f7cac5f3e696285ce955750967972af13ba7427cd91808a560',
              'hex',
            ),
            Buffer.from(
              '96e00570ee0117af841a8db8772681fc470232c2f60ca524c7cd58450c4ac9c916f72099308399da2ff8e6f085df593af1736f24e410cb88af721ac8faf01b0a',
              'hex',
            ),
          ],
          path: signingFiles.multisigStake1.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'b9de636bf236e5543377e4b4d6b63613f188fb65b83b8a61c4b68be0c196c3d8',
              'hex',
            ),
            Buffer.from(
              '5b7ea7fcdf9c16e465f1ea02ccf0c2b3e99db8f7a94bf0865766a79d2db8c90244580442810fec40fed90a234ccc1f817cfc7a2963ff00dcf4250920c8002f05',
              'hex',
            ),
          ],
          path: signingFiles.mint0.path,
        },
        {
          key: 0,
          data: [
            Buffer.from(
              'f87ee3ee2316d92f73dca6112a197340a1eae157574765099dd631132818bc15',
              'hex',
            ),
            Buffer.from(
              '5ccdd2985d3d91b0b170f5dca1698ca7990016203247c16306e536d75d58a35e1becb9f8a0dcd8535d6e95fb9820864d470a69ad9c654c618ff0902e79e51800',
              'hex',
            ),
          ],
          path: signingFiles.mint1.path,
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

  //   for (let i = 0; i < witnesses.shelleyWitnesses.length; i++) {
  //     console.log(witnesses.shelleyWitnesses[i].data[0].toString('hex'))
  //     console.log(transaction.witnesses.shelleyWitnesses[i].data[0].toString('hex'))
  //     console.log('\n')
  //     console.log(witnesses.shelleyWitnesses[i].data[1].toString('hex'))
  //     console.log(transaction.witnesses.shelleyWitnesses[i].data[1].toString('hex'))
  //     console.log('\n')
  //   }
  // In the current version, Keystone 3 Pro does not support multisig. It will be supported in the next version.
  assert.deepStrictEqual(witnesses, transaction.witnesses)
}

describe('Keystone multisig tx witnessing', () => {
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
    it(`Should witness multisig tx ${txType}`, async () =>
      await testTxWitnessing(cryptoProvider, tx)).timeout(100000),
  )
})
