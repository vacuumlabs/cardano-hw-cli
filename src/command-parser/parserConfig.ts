import { parseHwSigningFile, parsePath, parseTxBodyFile } from './parsers'

const txSigningArgs = {
  '--network': { nargs: '?', dest: 'network', default: 'MAINNET' },
  '--mainnet': { nargs: '?', dest: 'network', const: 'MAINNET' },
  '--testnet': { nargs: '?', dest: 'network', const: 'TESTNET' },
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
    dest: 'changeOutputKeyFileData',
    action: 'append',
    default: [],
    type: (path: string) => parseHwSigningFile(path),
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
      sign: txSigningArgs,
      witness: {
        ...txSigningArgs,
        '--hw-signing-file': {
          dest: 'hwSigningFileData',
          required: true,
          type: (path: string) => parseHwSigningFile(path),
        },
      },
    },
  },
}
