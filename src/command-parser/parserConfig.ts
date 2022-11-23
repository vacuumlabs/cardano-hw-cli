/* eslint-disable max-len */
/* eslint quote-props: ["error", "consistent"] */
import {
  parseAddressFile,
  parseHwSigningFile,
  parseNetwork,
  parseBIP32Path,
  parseRawTxFile,
  parseTxFile,
  parseKesVKeyFile,
  parseVotePubFile,
  parseScriptHashHex,
  parseNativeScriptFile,
  parseDerivationType,
} from './parsers'

const derivationTypeArg = {
  '--derivation-type': {
    required: false,
    type: (name?: string) => parseDerivationType(name),
    dest: 'derivationType',
    help: 'Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).',
  },
}

const pubkeyArgs = {
  '--path': {
    required: true,
    action: 'append',
    type: (path: string) => parseBIP32Path(path),
    dest: 'paths',
    help: 'Derivation path to the key to sign with.',
  },
  ...derivationTypeArg,
}

const keyGenArgs = {
  '--path': {
    required: true,
    action: 'append',
    type: (path: string) => parseBIP32Path(path),
    dest: 'paths',
    help: 'Derivation path to the key to sign with.',
  },
  '--hw-signing-file': {
    required: true,
    action: 'append',
    dest: 'hwSigningFiles',
    help: 'Output filepath of the verification key.',
  },
  '--verification-key-file': {
    required: true,
    action: 'append',
    dest: 'verificationKeyFiles',
    help: 'Output filepath of the hardware wallet signing file.',
  },
  ...derivationTypeArg,
}

const nodeKeyGenArgs = {
  '--path': {
    required: true,
    action: 'append',
    type: (path: string) => parseBIP32Path(path),
    dest: 'paths',
    help: 'Derivation path to the key to sign with.',
  },
  '--hw-signing-file': {
    required: true,
    action: 'append',
    dest: 'hwSigningFiles',
    help: 'Output filepath of the verification key.',
  },
  '--cold-verification-key-file': {
    required: true,
    action: 'append',
    dest: 'verificationKeyFiles',
    help: 'Output filepath of the hardware wallet signing file.',
  },
  '--operational-certificate-issue-counter-file': {
    required: true,
    action: 'append',
    dest: 'issueCounterFiles',
    help: 'Output filepath of the issue counter file.',
  },
}

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
  '_mutually-exclusive-group-required-tx-file': {
    '--tx-body-file': {
      dest: 'rawTxFileData',
      type: (path: string) => parseRawTxFile(path),
      help: 'Input filepath of the TxBody. Warning! This option is DEPRECATED and will be REMOVED in Oct 2022. Please use --tx-file instead.',
    },
    '--tx-file': {
      dest: 'txFileData',
      type: (path: string) => parseTxFile(path),
      help: 'Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.',
    },
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
  ...derivationTypeArg,
}

const opCertSigningArgs = {
  '--kes-verification-key-file': {
    required: true,
    dest: 'kesVKey',
    type: (path: string) => parseKesVKeyFile(path),
    help: 'Input filepath of the KES vkey.',
  },
  '--kes-period': {
    required: true,
    dest: 'kesPeriod',
    type: (kesPeriod: string) => BigInt(kesPeriod),
    help: 'KES period.',
  },
  '_mutually-exclusive-group-required-operational-certificate-issue-counter': {
    '--operational-certificate-issue-counter': {
      dest: 'issueCounterFile',
      help: 'Input filepath of the issue counter file. This option is DEPRECATED. Please use --operational-certificate-issue-counter-file instead.',
    },
    '--operational-certificate-issue-counter-file': {
      dest: 'issueCounterFile',
      help: 'Input filepath of the issue counter file.',
    },
  },
  '--hw-signing-file': {
    dest: 'hwSigningFileData',
    required: true,
    action: 'append',
    type: (path: string) => parseHwSigningFile(path),
    help: 'Input filepath of the hardware wallet signing file.',
  },
  '--out-file': {
    required: true,
    dest: 'outFile',
    help: 'Output filepath.',
  },
}

// If you want to define a group of mutually exclusive CLI arguments (eg. see address.show below),
// bundle these arguments under a key prefixed with '_mutually-exclusive-group'. Several such groups
// may be present next to each other, an optional key suffix can be added to enable this (JS objects
// cannot have duplicate keys).
// If you want argparse to ensure that one of the arguments is present, use
// '_mutually-exclusive-group-required' prefix instead.

// based on cardano-cli interface
// https://docs.cardano.org/projects/cardano-node/en/latest/reference/cardano-node-cli-reference.html
export const parserConfig = {
  // ===============  commands specific for hw interactions  ===============
  'version': {},
  'device': {
    'version': {},
  },
  'key': {
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
  'pubkey': {
    'query': pubkeyArgs,
  },

  // ===============  commands taken from cardano-cli interface  ===============
  'address': {
    // TODO JM: I don't like this endpoint here since it also supports staking keys
    // and bulk export unlike in cardano-cli; let's move it near/under 'key' above
    'key-gen': keyGenArgs,

    'show': { // hw-specific subpath
      '_mutually-exclusive-group-required-payment': {
        '--payment-path': {
          type: (path: string) => parseBIP32Path(path),
          dest: 'paymentPath',
          help: 'Payment derivation path. Either this or payment script hash has to be specified.',
        },
        '--payment-script-hash': {
          type: (hashHex: string) => parseScriptHashHex(hashHex),
          dest: 'paymentScriptHash',
          help: 'Payment derivation script hash in hex format.',
        },
      },
      '_mutually-exclusive-group-required-staking': {
        '--staking-path': {
          type: (path: string) => parseBIP32Path(path),
          dest: 'stakingPath',
          help: 'Stake derivation path. Either this or staking script hash has to be specified.',
        },
        '--staking-script-hash': {
          type: (hashHex: string) => parseScriptHashHex(hashHex),
          dest: 'stakingScriptHash',
          help: 'Stake derivation script hash in hex format',
        },
      },
      '--address-file': {
        required: true,
        type: (path: string) => parseAddressFile(path),
        dest: 'address',
        help: 'Input filepath of the address.',
      },
      ...derivationTypeArg,
    },
  },
  'transaction': {
    'sign': {
      ...txSigningArgs,
      '--out-file': {
        required: true,
        dest: 'outFile',
        help: 'Output filepath. Warning! This call is DEPRECATED and will be REMOVED in Oct 2022. Please use witness call instead.',
      },
    },
    'policyid': {
      '--script-file': {
        required: true,
        type: (path: string) => parseNativeScriptFile(path),
        dest: 'nativeScript',
        help: 'Filepath of the script.',
      },
      '--hw-signing-file': {
        dest: 'hwSigningFileData',
        required: false,
        action: 'append',
        type: (path: string) => parseHwSigningFile(path),
        help: 'Input filepath of the hardware wallet signing file.',
      },
      ...derivationTypeArg,
    },
    'witness': {
      ...txSigningArgs,
      '--out-file': {
        required: true,
        action: 'append',
        dest: 'outFiles',
        help: 'Output filepath.',
      },
    },
    'validate-raw': {
      '--tx-body-file': {
        required: true,
        dest: 'rawTxFileData',
        type: (path: string) => parseRawTxFile(path),
        help: 'Input filepath of the raw tx. Warning! This call is DEPRECATED and will be REMOVED in Oct 2022. Please use validate call instead.',
      },
    },
    'validate': {
      '--tx-file': {
        required: true,
        dest: 'txFileData',
        type: (path: string) => parseTxFile(path),
        help: 'Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.',
      },
    },
    'transform-raw': {
      '--tx-body-file': {
        required: true,
        dest: 'rawTxFileData',
        type: (path: string) => parseRawTxFile(path),
        help: 'Input filepath of the raw tx. Warning! This call is DEPRECATED and will be REMOVED in Oct 2022. Please use transform call instead.',
      },
      '--out-file': {
        required: true,
        dest: 'outFile',
        help: 'Output filepath.',
      },
    },
    'transform': {
      '--tx-file': {
        required: true,
        dest: 'txFileData',
        type: (path: string) => parseTxFile(path),
        help: 'Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.',
      },
      '--out-file': {
        required: true,
        dest: 'outFile',
        help: 'Output filepath.',
      },
    },
  },
  'node': {
    'key-gen': nodeKeyGenArgs,
    'issue-op-cert': opCertSigningArgs,
  },
  'catalyst': {
    'voting-key-registration-metadata': {
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
      '--vote-public-key': {
        required: true,
        dest: 'votePublicKey',
        type: (path: string) => parseVotePubFile(path),
        help: 'Input filepath to vote public key in ed25519extended.',
      },
      '--stake-signing-key': {
        required: true,
        dest: 'hwStakeSigningFileData',
        type: (path: string) => parseHwSigningFile(path),
        help: 'Input filepath of the hardware wallet stake signing file, which will be used to to sign the voting registration.',
      },
      '--reward-address': {
        required: true,
        dest: 'rewardAddress',
        help: 'Address to receive voting rewards.',
      },
      '--nonce': {
        required: true,
        dest: 'nonce',
        type: (nonce: string) => BigInt(nonce),
        help: 'Current slot number.',
      },
      '--reward-address-signing-key': {
        action: 'append',
        required: true,
        dest: 'rewardAddressSigningKeyData',
        type: (path: string) => parseHwSigningFile(path),
        help: 'Input filepath of the reward address signing file.',
      },
      '--metadata-cbor-out-file': {
        required: true,
        dest: 'outFile',
        help: 'Output metadata cbor filepath.',
      },
      ...derivationTypeArg,
    },
  },
}
