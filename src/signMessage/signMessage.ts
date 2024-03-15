import {HexString} from '../basicTypes'

export type SignedMessageData = {
  signatureHex: HexString
  signingPublicKeyHex: HexString
  addressFieldHex: HexString
}
