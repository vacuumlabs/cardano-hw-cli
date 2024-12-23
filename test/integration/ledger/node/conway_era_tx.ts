import assert from 'assert'
import {decodeTx} from 'cardano-hw-interop-lib'
import {LedgerCryptoProvider} from '../../../../src/crypto-providers/ledgerCryptoProvider'
import {NETWORKS} from '../../../../src/constants'
import {
  determineSigningMode,
  getTxBodyHash,
} from '../../../../src/crypto-providers/util'
import {validateWitnessing} from '../../../../src/crypto-providers/witnessingValidation'
import {validateTxBeforeWitnessing} from '../../../../src/transaction/transactionValidation'

import {signingFiles} from './signingFiles'
import {getTransport} from './speculos'
import {CardanoEra} from '../../../../src/basicTypes'
import {CryptoProvider} from '../../../../src/crypto-providers/cryptoProvider'
const transactions = {
  ordinary_ConwayEraInputAndOutput: {
    cborHex:
      '84a400d90102828258202a58d749fbc2b663b679421ce55848d763bd9776779e777e0e3de6ac16576250008258204bc48ab0c7a0eb38841290275a3f427b98a19d08cdde345ea203a059f5a218ac00018282581d6052e63f22c5107ed776b70f7b92248b02552fd08f3e747bc7450994411a004c4b408258390074976c54afaf444f7cd499bd8519aac6592b13b22b9d5817f0da5c5203d205532089ad2f7816892e2ef42849b7b52788e41b3fd43a6e01cf1a00be86c1021a00029309031a02a59942a0f5f6',
    hwSigningFiles: [signingFiles.stake0],
    network: 'MAINNET',
    witnesses: {
      byronWitnesses: [],
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
          path: signingFiles.stake0.path,
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
    era: CardanoEra.CONWAY,
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

describe('Ledger tx witnessing', () => {
  let cryptoProvider: CryptoProvider
  // eslint-disable-next-line prefer-arrow-callback
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await LedgerCryptoProvider(await getTransport())
  })
  const txs = Object.entries(transactions)

  txs.forEach(([txType, tx]) =>
    it(`Should witness tx ${txType}`, async () =>
      await testTxWitnessing(cryptoProvider, tx)).timeout(100000),
  )
})
