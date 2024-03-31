/* eslint-disable max-len */
import assert from 'assert'
import {LedgerCryptoProvider} from '../../../../src/crypto-providers/ledgerCryptoProvider'

import {signingFiles} from './signingFiles'
import {getTransport} from './speculos'
import {CryptoProvider} from '../../../../src/crypto-providers/cryptoProvider'
import {
  CommandType,
  HwSigningData,
  ParsedSignMessageArguments,
} from '../../../../src/command-parser/argTypes'
import {HexString, HumanAddress} from '../../../../src/basicTypes'

type TestData = {
  args: ParsedSignMessageArguments
  expectedResult: {
    signatureHex: string
    signingPublicKeyHex: string
    addressFieldHex: string
  }
}

const msgTests: {[testName: string]: TestData} = {
  msg01: {
    args: {
      command: CommandType.SIGN_MESSAGE,
      messageHex: '68656c6c6f20776f726c64' as HexString,
      hwSigningFileData: signingFiles.stake0 as HwSigningData,
      hashPayload: false,
      preferHexDisplay: false,
      outFile: 'msg.out',
    },
    expectedResult: {
      signatureHex:
        '3142bab939dc3a73329190c55b6aa2dae169ae1e5767b96cf1d2f9c79bc7974ffbaea46c06148b0a5f3240f177cde8437d79706879a3bfbcf74e110504ea3201',
      signingPublicKeyHex:
        '66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8',
      addressFieldHex:
        '1d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c',
    },
  },
  msg02: {
    args: {
      command: CommandType.SIGN_MESSAGE,
      messageHex: '68656c6c6f20776f726c64' as HexString,
      hwSigningFileData: signingFiles.payment0 as HwSigningData,
      hashPayload: true,
      preferHexDisplay: false,
      address:
        'addr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4' as HumanAddress,
      addressHwSigningFileData: [
        signingFiles.payment0 as HwSigningData,
        signingFiles.stake0 as HwSigningData,
      ],
      outFile: 'msg.out',
    },
    expectedResult: {
      signatureHex:
        '56ebf5bbea63aafbf1440cd63c5fbcbe3de799de401d48165a366e10f36c17b490c261ea8a00cf464cf7140732369cc4e333eb6714cabe625abddac1cd9dd20b',
      signingPublicKeyHex:
        'cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2',
      addressFieldHex:
        '0014c16d7f43243bd81478e68b9db53a8528fd4fb1078d58d54a7f11241d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c',
    },
  },
}

async function testMessageSigning(
  cryptoProvider: CryptoProvider,
  msgTestData: TestData,
) {
  const {expectedResult, args} = msgTestData
  const result = await cryptoProvider.signMessage(args)
  assert.deepStrictEqual(result, expectedResult)
}

describe('Ledger sign message', () => {
  let cryptoProvider: CryptoProvider
  // eslint-disable-next-line prefer-arrow-callback
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await LedgerCryptoProvider(await getTransport())
  })
  const messagesToSign = Object.entries(msgTests)

  messagesToSign.forEach(([testName, testData]) =>
    it(`Should sign ${testName}`, async () =>
      await testMessageSigning(cryptoProvider, testData)).timeout(100000),
  )
})
