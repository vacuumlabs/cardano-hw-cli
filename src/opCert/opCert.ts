import { CborHex } from '../types'
import { encodeCbor } from '../util'

export type KesVKey = Buffer

export type OpCertIssueCounter = {
  counter: bigint,
  poolColdKey: Buffer,
}

export type SignedOpCertCborHex = CborHex

export const OpCertSigned = (
  kesVKey: KesVKey,
  kesPeriod: bigint,
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
