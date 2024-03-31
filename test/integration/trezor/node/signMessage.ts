/* eslint-disable max-len */
import assert from 'assert'
import {TrezorCryptoProvider} from '../../../../src/crypto-providers/trezorCryptoProvider'

import {signingFiles} from './signingFiles'
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
        'd284efe58b3bf9e71f5514a6000cfe4f1301a95e0ac20a736ec964ed75e2a38bdc19ef31ef0c7b748d057ba4f67c3ac37040fa1ed8b8ce04a6d66d546b4e8c01',
      signingPublicKeyHex:
        'bc65be1b0b9d7531778a1317c2aa6de936963c3f9ac7d5ee9e9eda25e0c97c5e',
      addressFieldHex:
        '122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277',
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
        'addr_test1qzq0nckg3ekgzuqg7w5p9mvgnd9ym28qh5grlph8xd2z92sj922xhxkn6twlq2wn4q50q352annk3903tj00h45mgfmsu8d9w5' as HumanAddress,
      addressHwSigningFileData: [
        signingFiles.payment0 as HwSigningData,
        signingFiles.stake0 as HwSigningData,
      ],
      outFile: 'msg.out',
    },
    expectedResult: {
      signatureHex:
        'aa471d2ccc2745083247f5acfd0c55756fe3e3116c4acaf9cca1f00927c9acbb2b9ad3ec222fb5025b869c886f493523bb37cb035e54bd889206b4ca23698105',
      signingPublicKeyHex:
        '5d010cf16fdeff40955633d6c565f3844a288a24967cf6b76acbeb271b4f13c1',
      addressFieldHex:
        '0080f9e2c88e6c817008f3a812ed889b4a4da8e0bd103f86e7335422aa122a946b9ad3d2ddf029d3a828f0468aece76895f15c9efbd69b4277',
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

describe('Trezor sign message', () => {
  let cryptoProvider: CryptoProvider
  // eslint-disable-next-line prefer-arrow-callback
  before(async function () {
    this.timeout(10000)
    cryptoProvider = await TrezorCryptoProvider()
  })
  const messagesToSign = Object.entries(msgTests)

  messagesToSign.forEach(([testName, testData]) =>
    it(`Should sign ${testName}`, async () =>
      await testMessageSigning(cryptoProvider, testData)).timeout(100000),
  )
})
