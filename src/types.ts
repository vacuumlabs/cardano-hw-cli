export type CborHex = string

export enum FileType {
  HwSigningFileType = 'PaymentHWSigningFileShelley_ed25519',
  TxBodyFileType = 'placeholder', // TODO
}

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
