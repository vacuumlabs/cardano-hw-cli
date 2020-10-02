import { ArgType } from './types'

const flag = { action: 'store_true', argType: ArgType.Default }
const required = (argType: ArgType) => ({ required: true, argType })
const requiredOneOrMore = (argType: ArgType) => ({ required: true, action: 'append', argType })
const optional = (argType: ArgType) => ({ argType })

export default {
  shelley: {
    address: {
      'key-gen': {
        '--path': required(ArgType.Default),
        '--hw-signing-file': required(ArgType.FileOutput),
        '--verification-key-file': required(ArgType.FileOutput),
      },
    },
    key: {
      'verification-key': {
        '--hw-signing-file': required(ArgType.FileInput),
        '--verification-key-file': required(ArgType.FileOutput),
      },
    },
    transaction: {
      sign: {
        '--mainnet': flag,
        '--tx-body-file': required(ArgType.FileInput),
        '--hw-signing-file': requiredOneOrMore(ArgType.FileInput),
        '--change-output-key-file': optional(ArgType.FileInput),
        '--out-file': required(ArgType.FileOutput),
      },
      witness: {
        '--mainnet': flag,
        '--tx-body-file': required(ArgType.FileInput),
        '--hw-signing-file': requiredOneOrMore(ArgType.FileInput),
        '--change-output-key-file': optional(ArgType.FileInput),
        '--out-file': required(ArgType.FileOutput),
      },
    },
  },
} as { [key: string]: any }
