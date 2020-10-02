const flag = { action: 'store_true' }
const required = { required: true }
const requiredOneOrMore = { required: true, action: 'append' }
const optional = {}

export const commandMap = {
  shelley: {
    address: {
      'key-gen': {
        '--path': required,
        '--hw-signing-file': required,
        '--verification-key-file': required,
      },
    },
    key: {
      'verification-key': {
        '--hw-signing-file': required,
        '--verification-key-file': required,
      },
    },
    transaction: {
      sign: {
        '--mainnet': flag,
        '--tx-body-file': required,
        '--hw-signing-file': requiredOneOrMore,
        '--change-output-key-file': optional,
        '--out-file': required,
      },
      witness: {
        '--mainnet': flag,
        '--tx-body-file': required,
        '--hw-signing-file': requiredOneOrMore,
        '--change-output-key-file': optional,
        '--out-file': required,
      },
    },
  },
}
