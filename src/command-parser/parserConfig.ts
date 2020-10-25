import {
  parseAddressFile,
  parseHwSigningFile,
  parseNetwork,
  parsePath,
  parseTxBodyFile,
} from './parsers'

const txSigningArgs = {
  '--mainnet': {
    nargs: '?',
    dest: 'network',
    const: parseNetwork('MAINNET'),
    default: parseNetwork('MAINNET'),
    help: 'NETWORK.',
  },
  '--testnet-magic': {
    nargs: '?',
    dest: 'network',
    type: (magic: string) => parseNetwork('TESTNET', magic),
    help: 'Protocol magic number.',
  },
  '--tx-body-file': {
    required: true,
    dest: 'txBodyFileData',
    type: (path: string) => parseTxBodyFile(path),
    help: 'Input filepath of the TxBody.',
  },
  '--hw-signing-file': {
    dest: 'hwSigningFileData',
    required: true,
    action: 'append',
    type: (path: string) => parseHwSigningFile(path),
    help: 'Input filepath of the hardware wallet signing file.',
  },
  '--change-output-key-file': {
    dest: 'changeOutputKeyFileData',
    action: 'append',
    default: [],
    type: (path: string) => parseHwSigningFile(path),
    help: 'Input filepath of change output file.',
  },
  '--out-file': {
    required: true,
    dest: 'outFile',
    help: 'Output filepath.',
  },
}

export const parserConfig = {
  device: {
    version: {},
  },
  shelley: {
    address: {
      'key-gen': {
        '--path': {
          required: true,
          type: (path: string) => parsePath(path),
          help: 'Derivation path to the key to sign with.',
        },
        '--hw-signing-file': {
          required: true,
          dest: 'hwSigningFile',
          help: 'Output filepath of the verification key.',
        },
        '--verification-key-file': {
          required: true,
          dest: 'verificationKeyFile',
          help: 'Output filepath of the hardware wallet signing file.',
        },
      },
      show: {
        '--payment-path': {
          required: true,
          type: (path: string) => parsePath(path),
          dest: 'paymentPath',
          help: 'Payment derivation path.',
        },
        '--staking-path': {
          required: true,
          type: (path: string) => parsePath(path),
          dest: 'stakingPath',
          help: 'Stake derivation path.',
        },
        '--address-file': {
          required: true,
          type: (path: string) => parseAddressFile(path),
          dest: 'address',
          help: 'Input filepath of the address.',
        },
      },
    },
    key: {
      'verification-key': {
        '--hw-signing-file': {
          required: true,
          dest: 'hwSigningFileData',
          type: (path: string) => parseHwSigningFile(path),
          help: 'Input filepath of the hardware wallet signing file.',
        },
        '--verification-key-file': {
          required: true,
          dest: 'verificationKeyFile',
          help: 'Output filepath of the verification key.',
        },
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
          help: 'Output filepath of the verification key.',
        },
      },
    },
  },
}
