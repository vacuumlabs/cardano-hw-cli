import { read } from '../fileReader'

const flag = { action: 'store_true' }
const loadFile = (arg: string) => ((path: string) => read(arg, path))

export const commandMap = {
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
        '--hw-signing-file': { required: true, type: loadFile('--hw-signing-file') },
        '--verification-key-file': { required: true },
      },
    },
    transaction: {
      sign: {
        '--mainnet': flag,
        '--tx-body-file': { required: true, type: loadFile('--tx-body-file') },
        '--hw-signing-file': { required: true, action: 'append', type: loadFile('--hw-signing-file') },
        '--change-output-key-file': { type: loadFile('--change-output-key-file') },
        '--out-file': { required: true },
      },
      witness: {
        '--mainnet': flag,
        '--tx-body-file': { required: true, type: loadFile('--tx-body-file') },
        '--hw-signing-file': { required: true, action: 'append', type: loadFile('--hw-signing-file') },
        '--change-output-key-file': { type: loadFile('--change-output-key-file') },
        '--out-file': { required: true },
      },
    },
  },
}
