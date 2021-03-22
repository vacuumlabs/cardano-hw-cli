import { encodeCbor } from '../util'

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
): SignedOpCertCborHex => encodeCbor(
  [
    [
      kesVKey,
      issueCounter.counter,
      kesPeriod,
      signature,
    ],
    issueCounter.poolColdKey,
  ],
).toString('hex')
