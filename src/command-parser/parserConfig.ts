import { readHwSigningFile, readTxBodyFile } from '../fileReader'

const flag = { action: 'store_true' }

export const parserConfig = {
  shelley: {
    address: {
      'key-gen': {
        '--path': { required: true },
        '--hw-signing-file': { required: true },
        '--verification-key-file': { required: true },
      },
    },
    key: {
      'verification-key': {
        '--hw-signing-file': { required: true, type: (path: string) => readHwSigningFile(path) },
        '--verification-key-file': { required: true },
      },
    },
    transaction: {
      sign: {
        '--mainnet': flag,
        '--tx-body-file': { required: true, type: (path: string) => readTxBodyFile(path) },
        '--hw-signing-file': {
          required: true, action: 'append', type: (path: string) => readHwSigningFile(path),
        },
        '--change-output-key-file': { type: (path: string) => readHwSigningFile(path) },
        '--out-file': { required: true },
      },
      witness: {
        '--mainnet': flag,
        '--tx-body-file': { required: true, type: (path: string) => readTxBodyFile(path) },
        '--hw-signing-file': {
          required: true, action: 'append', type: (path: string) => readHwSigningFile(path),
        },
        '--change-output-key-file': { type: (path: string) => readHwSigningFile(path) },
        '--out-file': { required: true },
      },
    },
  },
}
