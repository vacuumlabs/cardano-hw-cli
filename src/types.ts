export type CborHex = string

export type FileType = string

export type HwSigning = {
  type: FileType
  description: string
  path: string
  cborXPubKeyHex: string
}

export type TxBody = {
  type: FileType
  description: string
  cborHex: CborHex
}
