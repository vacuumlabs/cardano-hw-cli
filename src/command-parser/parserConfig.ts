import { parseHwSigningFile, parsePath, parseTxBodyFile } from './parsers'

const flag = { action: 'store_true' }

const signOrWitness = {
  '--mainnet': flag,
  '--tx-body-file': {
    required: true, dest: 'txBodyFileData', type: (path: string) => parseTxBodyFile(path),
  },
  '--hw-signing-file': {
    dest: 'hwSigningFileData',
    required: true,
    action: 'append',
    type: (path: string) => parseHwSigningFile(path),
  },
  '--change-output-key-file': {
    dest: 'changeOutputKeyFileData', type: (path: string) => parseHwSigningFile(path),
  },
  '--out-file': { required: true, dest: 'outFile' },
}

export const parserConfig = {
  shelley: {
    address: {
      'key-gen': {
        '--path': { required: true, type: (path: string) => parsePath(path) },
        '--hw-signing-file': { required: true, dest: 'hwSigningFile' },
        '--verification-key-file': { required: true, dest: 'verificationKeyFile' },
      },
    },
    key: {
      'verification-key': {
        '--hw-signing-file': {
          required: true, dest: 'hwSigningFileData', type: (path: string) => parseHwSigningFile(path),
        },
        '--verification-key-file': { required: true, dest: 'verificationKeyFile' },
      },
    },
    transaction: {
      sign: signOrWitness,
      witness: signOrWitness,
    },
  },
}
