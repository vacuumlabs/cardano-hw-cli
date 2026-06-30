/* eslint-disable max-len */
import assert from 'assert'
import {
  CardanoSignCip8DataRequest,
  MessageAddressFieldType,
} from '@keystonehq/bc-ur-registry-cardano'
import {WALLET_NAME} from '../../../src/crypto-providers/keystoneUtils'
import KeystoneSDK from '@keystonehq/keystone-sdk'

describe('Keystone sign message request', () => {
  it('Should build CIP-30 style address signing requests', () => {
    const requestId = '00000000-0000-4000-8000-000000000001'
    const messageHex = '68656c6c6f20776f726c64'
    const path = "m/1852'/1815'/0'/0/0"
    const xfp = '9c2dfa8e'
    const xpub =
      'cd2b047d1a803eee059769cffb3dfd0a4b9327e55bc78aa962d9bd4f720db0b2'
    const address =
      'addr_test1qq2vzmtlgvjrhkq50rngh8d482zj3l20kyrc6kx4ffl3zfqayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq2glhm4'
    const origin = WALLET_NAME

    const directRequest =
      CardanoSignCip8DataRequest.constructCardanoSignCip8DataRequest(
        messageHex,
        path,
        xfp,
        xpub,
        false,
        MessageAddressFieldType.ADDRESS,
        address,
        requestId,
        origin,
      )

    const keystoneSDK = new KeystoneSDK()
    const sdkRequest = keystoneSDK.cardano.generateSignCip8DataRequest({
      requestId,
      path,
      xfp,
      xpub,
      messageHex,
      signingPath: path,
      hashPayload: false,
      addressFieldType: MessageAddressFieldType.ADDRESS,
      address,
      origin,
    })

    assert.strictEqual(
      Buffer.compare(directRequest.toUR().cbor, sdkRequest.cbor),
      0,
    )
    assert.strictEqual(directRequest.getOrigin(), origin)
    assert.strictEqual(directRequest.getDerivationPath(), "1852'/1815'/0'/0/0")
    assert.strictEqual(directRequest.getXpub().toString('hex'), xpub)
  })

  it('Should build key-hash signing requests without an address', () => {
    const request =
      CardanoSignCip8DataRequest.constructCardanoSignCip8DataRequest(
        '68656c6c6f20776f726c64',
        "m/1852'/1815'/0'/2/0",
        '9c2dfa8e',
        '66610efd336e1137c525937b76511fbcf2a0e6bcf0d340a67bcb39bc870d85e8',
        false,
        MessageAddressFieldType.KEY_HASH,
        undefined,
        '00000000-0000-4000-8000-000000000002',
        WALLET_NAME,
      )

    assert.strictEqual(request.getDerivationPath(), "1852'/1815'/0'/2/0")
    assert.strictEqual(
      request.getAddressFieldType(),
      MessageAddressFieldType.KEY_HASH,
    )
    assert.strictEqual(request.getHashPayload(), false)
    assert.strictEqual(request.getAddressBench32(), undefined)
  })
})
