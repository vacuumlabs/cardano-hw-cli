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
  ordinary_ByronInputAndOutput: {
    // 2a5eb80636ea07b703001eb408b607c38a4204dbe5d216352f384ed61ab66d70
    cborHex:
      '83a40082825820a160aea80fa85221810099305045a6a3bc345709eee4d68eb4b7e04f0894a1cb00825820d1831359e7a231e0352ef12188f6a4e450a9958bb78cf7740200d449f0fe443600018282582b82d818582183581c0d6a5a6a4b44454b78ff68105bf6eb648984737032a31a724cb08fa3a0001a87b0e2651a001e84808258390114c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c1a00537971021a0002b779031a00ac55f3a0f6',
    hwSigningFiles: [signingFiles.payment0, signingFiles.byron10],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [
        {
          key: 2,
          data: [
            Buffer.from(
              '90ca5e64214a03ec975e5097c25b2a49d4ca4988243bc0142b5ada743d80b9d5',
              'hex',
            ),
            Buffer.from(
              '88632f148f3092f50218374d2bf602a78e4a50dc55c51f0ef32306b49413df3757657380c35cf878a102f728c313ecbe9f37f6eb6a6b64f724ef1b7bee480f0c',
              'hex',
            ),
            Buffer.from(
              'be68538e05e31dc8fff62a62868c43f229cacbee5c40cbe6493929ad1f0e3cd9',
              'hex',
            ),
            Buffer.from('a0', 'hex'),
          ],
          path: signingFiles.byron10.path,
        },
      ],
      shelleyWitnesses: [
        {
          key: 0,
          data: [
            Buffer.from(
              'cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2',
              'hex',
            ),
            Buffer.from(
              'e3e6c81a40f2a3a4ace9a5b3a7dfbac12a9f69115d0800145e163f4ed347dd9367e4e06ae6c4f4899b19c958c88fa4b81b17679b135a45b85f84aa0216ffc408',
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
  // In the current version, Keystone 3 Pro does not support this path. It will be supported in the next version.
  assert.deepStrictEqual(witnesses, transaction.witnesses)
}

describe('Keystone byron tx witnessing', () => {
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
    it(`Should witness byron tx ${txType}`, async () =>
      await testTxWitnessing(cryptoProvider, tx)).timeout(100000),
  )
})
