const cbor = require('borc')
// eslint-disable-next-line import/no-extraneous-dependencies
const { BigNumber } = require('bignumber.js')

export type KesVKey = Buffer

export type OpCertIssueCounter = {
  counter: BigInt,
  poolColdKey: Buffer,
}

export type SignedOpCertCborHex = string

export const OpCertSigned = (
  kesVKey: KesVKey,
  kesPeriod: BigInt,
  issueCounter: OpCertIssueCounter,
  signature: Buffer,
): SignedOpCertCborHex => cbor.encode(
  [
    [
      kesVKey,
      // TODO ?? how to encode BigInt?
      BigNumber(issueCounter.counter),
      BigNumber(kesPeriod),
      signature,
    ],
    issueCounter.poolColdKey,
  ],
).toString('hex')
