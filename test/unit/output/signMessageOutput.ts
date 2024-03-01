/* eslint-disable max-len */
import assert from 'assert'

import {
  constructSignedMessageOutput,
} from '../../../src/fileWriter'
import {HexString} from '../../../src/basicTypes'
import { SignedMessageData } from '../../../src/signMessage/signMessage'
import { bech32_encodeAddress } from '@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils/address'

// data verified by M. Lang
describe('Sign message output', () => {
  it('Should generate correct output for a hashed message', () => {
    const messageHex = 'fafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafa' as HexString
    const hashPayload = true
    const signedMsgData = {
      signatureHex: '6fcc42c954ecaa143c8fab436a5cc1d0beb4f46c29c7e554d3593d5c4343b27e83a66b3df011c3197e88032a2e879730c67db71ed0f2d9cd3e9a0978990d3a02',
      signingPublicKeyHex: '7cc18df2fbd3ee1b16b76843b18446679ab95dbcd07b7833b66a9407c0709e37',
      addressFieldHex: 'ba41c59ac6e1a0e4ac304af98db801097d0bf8d2a5b28a54752426a1',
    } as SignedMessageData
    const output = constructSignedMessageOutput(messageHex, hashPayload, signedMsgData)
    const expectedOutput = {
      messageHex,
      isHashed: hashPayload,
      addressHex: 'ba41c59ac6e1a0e4ac304af98db801097d0bf8d2a5b28a54752426a1',
      signatureHex: '6fcc42c954ecaa143c8fab436a5cc1d0beb4f46c29c7e554d3593d5c4343b27e83a66b3df011c3197e88032a2e879730c67db71ed0f2d9cd3e9a0978990d3a02',
      publicKeyHex: '7cc18df2fbd3ee1b16b76843b18446679ab95dbcd07b7833b66a9407c0709e37',
      COSE_Sign1_hex: '845829a201276761646472657373581cba41c59ac6e1a0e4ac304af98db801097d0bf8d2a5b28a54752426a1a166686173686564f5581c47b2016f3ee8e36dbf83585571c7401236f4aee218ed11264dea91fc58406fcc42c954ecaa143c8fab436a5cc1d0beb4f46c29c7e554d3593d5c4343b27e83a66b3df011c3197e88032a2e879730c67db71ed0f2d9cd3e9a0978990d3a02',
      COSE_Key_hex: 'a40101032720062158207cc18df2fbd3ee1b16b76843b18446679ab95dbcd07b7833b66a9407c0709e37',
    }
    assert.deepStrictEqual(output, expectedOutput)
  })

  it('Should generate correct output for a non-hashed message', () => {
    const messageHex = 'deadbeef' as HexString
    const hashPayload = false
    const signedMsgData = {
      signatureHex: '92586e24a1a43b538720ea3915be0f6536f0894e4ea88713c01f948673865b6d2189a0306bbefc124954e578f8aa1d0f131b1d3e7af7827d1b4488d6fa0f6b07',
      signingPublicKeyHex: '650eb87ddfffe7babd505f2d66c2db28b1c05ac54f9121589107acd6eb20cc2c',
      addressFieldHex: '015a53103829a7382c2ab76111fb69f13e69d616824c62058e44f1a8b31d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c',
    } as SignedMessageData
    const output = constructSignedMessageOutput(messageHex, hashPayload, signedMsgData)
    console.log(bech32_encodeAddress(Buffer.from('015a53103829a7382c2ab76111fb69f13e69d616824c62058e44f1a8b31d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c', 'hex')))
    const expectedOutput = {
      messageHex,
      isHashed: hashPayload,
      addressHex: '015a53103829a7382c2ab76111fb69f13e69d616824c62058e44f1a8b31d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61c',
      signatureHex: '92586e24a1a43b538720ea3915be0f6536f0894e4ea88713c01f948673865b6d2189a0306bbefc124954e578f8aa1d0f131b1d3e7af7827d1b4488d6fa0f6b07',
      publicKeyHex: '650eb87ddfffe7babd505f2d66c2db28b1c05ac54f9121589107acd6eb20cc2c',
      COSE_Sign1_hex: '845846a2012767616464726573735839015a53103829a7382c2ab76111fb69f13e69d616824c62058e44f1a8b31d227aefa4b773149170885aadba30aab3127cc611ddbc4999def61ca166686173686564f444deadbeef584092586e24a1a43b538720ea3915be0f6536f0894e4ea88713c01f948673865b6d2189a0306bbefc124954e578f8aa1d0f131b1d3e7af7827d1b4488d6fa0f6b07',
      COSE_Key_hex: 'a4010103272006215820650eb87ddfffe7babd505f2d66c2db28b1c05ac54f9121589107acd6eb20cc2c',
    }
    assert.deepStrictEqual(output, expectedOutput)
  })
})
