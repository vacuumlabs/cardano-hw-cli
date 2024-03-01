/* eslint-disable max-len */
/* eslint quote-props: ["error", "consistent"] */
import {NetworkIds} from '../basicTypes'
import {
  parseAddressFile,
  parseHwSigningFile,
  parseNetwork,
  parseBIP32Path,
  parseTxFile,
  parseKesVKeyFile,
  parseVotePubFileJcli,
  parseScriptHashHex,
  parseNativeScriptFile,
  parseDerivationType,
  parseVotePubKeyBech32,
  parseVotePubFileHw,
  parseVotePubFileCli,
} from './parsers'

export type ParserConfig = {[key: string]: ParserConfig | object}

const derivationTypeArg = {
  '--derivation-type': {
    required: false,
    type: (name?: string) => parseDerivationType(name),
    dest: 'derivationType',
    help: 'Derivation type - currently applies only to Trezor. Options: LEDGER, ICARUS or ICARUS_TREZOR (default).',
  },
}

const keyGenArgs = {
  '--path': {
    required: true,
    dest: 'paths',
    action: 'append',
    type: (path: string) => parseBIP32Path(path),
    help: 'Derivation path to the key to sign with.',
  },
  '--hw-signing-file': {
    required: true,
    dest: 'hwSigningFiles',
    action: 'append',
    help: 'Output filepath of the verification key.',
  },
  '--verification-key-file': {
    required: true,
    dest: 'verificationKeyFiles',
    action: 'append',
    help: 'Output filepath of the hardware wallet signing file.',
  },
  ...derivationTypeArg,
}

const nodeKeyGenArgs = {
  '--path': {
    required: true,
    dest: 'paths',
    action: 'append',
    type: (path: string) => parseBIP32Path(path),
    help: 'Derivation path to the key to sign with.',
  },
  '--hw-signing-file': {
    required: true,
    dest: 'hwSigningFiles',
    action: 'append',
    help: 'Output filepath of the verification key.',
  },
  '--cold-verification-key-file': {
    required: true,
    dest: 'verificationKeyFiles',
    action: 'append',
    help: 'Output filepath of the hardware wallet signing file.',
  },
  '--operational-certificate-issue-counter-file': {
    required: true,
    dest: 'issueCounterFiles',
    action: 'append',
    help: 'Output filepath of the issue counter file.',
  },
}

const txSigningArgs = {
  '--mainnet': {
    nargs: '?',
    dest: 'network',
    const: parseNetwork(NetworkIds.MAINNET),
    default: parseNetwork(NetworkIds.MAINNET),
    help: 'NETWORK.',
  },
  '--testnet-magic': {
    nargs: '?',
    dest: 'network',
    type: (magic: string) => parseNetwork(NetworkIds.TESTNET, magic),
    help: 'Protocol magic number.',
  },
  '--tx-file': {
    required: true,
    dest: 'txFileData',
    type: (path: string) => parseTxFile(path),
    help: 'Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.',
  },
  '--hw-signing-file': {
    required: true,
    dest: 'hwSigningFileData',
    action: 'append',
    type: (path: string) => parseHwSigningFile(path),
    help: 'Input filepath of the hardware wallet signing file.',
  },
  '--change-output-key-file': {
    dest: 'changeOutputKeyFileData',
    action: 'append',
    type: (path: string) => parseHwSigningFile(path),
    default: [],
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
  '--operational-certificate-issue-counter-file': {
    dest: 'issueCounterFile',
    help: 'Input filepath of the issue counter file.',
  },
  '--hw-signing-file': {
    required: true,
    dest: 'hwSigningFileData',
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
export const parserConfig: ParserConfig = {
  // ===============  commands specific for hw interactions  ===============
  version: {},
  device: {
    version: {},
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

  // ===============  commands taken from cardano-cli interface  ===============
  address: {
    // TODO JM: I don't like this endpoint here since it also supports staking keys
    // and bulk export unlike in cardano-cli; let's move it near/under 'key' above
    'key-gen': keyGenArgs,

    'show': {
      // hw-specific subpath
      '_mutually-exclusive-group-required-payment': {
        '--payment-path': {
          dest: 'paymentPath',
          type: (path: string) => parseBIP32Path(path),
          help: 'Payment derivation path. Either this or payment script hash has to be specified.',
        },
        '--payment-script-hash': {
          dest: 'paymentScriptHash',
          type: (hashHex: string) => parseScriptHashHex(hashHex),
          help: 'Payment derivation script hash in hex format.',
        },
      },
      '_mutually-exclusive-group-required-staking': {
        '--staking-path': {
          dest: 'stakingPath',
          type: (path: string) => parseBIP32Path(path),
          help: 'Stake derivation path. Either this or staking script hash has to be specified.',
        },
        '--staking-script-hash': {
          dest: 'stakingScriptHash',
          type: (hashHex: string) => parseScriptHashHex(hashHex),
          help: 'Stake derivation script hash in hex format',
        },
      },
      '--address-file': {
        required: true,
        dest: 'address',
        type: (path: string) => parseAddressFile(path),
        help: 'Input filepath of the address.',
      },
      ...derivationTypeArg,
    },
  },
  transaction: {
    policyid: {
      '--script-file': {
        required: true,
        dest: 'nativeScript',
        type: (path: string) => parseNativeScriptFile(path),
        help: 'Filepath of the script.',
      },
      '--hw-signing-file': {
        required: false,
        dest: 'hwSigningFileData',
        action: 'append',
        type: (path: string) => parseHwSigningFile(path),
        default: [],
        help: 'Input filepath of the hardware wallet signing file.',
      },
      ...derivationTypeArg,
    },
    witness: {
      ...txSigningArgs,
      '--out-file': {
        required: true,
        dest: 'outFiles',
        action: 'append',
        help: 'Output filepath.',
      },
    },
    validate: {
      '--tx-file': {
        required: true,
        dest: 'txFileData',
        type: (path: string) => parseTxFile(path),
        help: 'Input filepath of the tx. Use --cddl-format when building transactions with cardano-cli.',
      },
    },
    transform: {
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
  node: {
    'key-gen': nodeKeyGenArgs,
    'issue-op-cert': opCertSigningArgs,
  },
  vote: {
    'registration-metadata': {
      '--mainnet': {
        nargs: '?',
        dest: 'network',
        const: parseNetwork(NetworkIds.MAINNET),
        default: parseNetwork(NetworkIds.MAINNET),
        help: 'NETWORK.',
      },
      '--testnet-magic': {
        nargs: '?',
        dest: 'network',
        type: (magic: string) => parseNetwork(NetworkIds.TESTNET, magic),
        help: 'Protocol magic number.',
      },

      // several ways of describing vote keys
      '--vote-public-key-jcli': {
        // jormungandr jcli format
        required: false,
        dest: 'votePublicKeys',
        action: 'append',
        type: (path: string) => parseVotePubFileJcli(path),
        help: 'Input filepath to vote public key in ed25519extended format (one or more keys can be provided).',
      },
      '--vote-public-key-string': {
        required: false,
        dest: 'votePublicKeys',
        action: 'append',
        type: (str: string) => parseVotePubKeyBech32(str),
        help: 'Bech32-encoded vote public key (one or more keys can be provided).',
      },
      '--vote-public-key-hwsfile': {
        required: false,
        dest: 'votePublicKeys',
        action: 'append',
        type: (path: string) => parseVotePubFileHw(path),
        help: 'Input filepath to vote public key in hw-signing-file format (one or more keys can be provided).',
      },
      '--vote-public-key-file': {
        required: false,
        dest: 'votePublicKeys',
        action: 'append',
        type: (path: string) => parseVotePubFileCli(path),
        help: 'Input filepath to vote public key in cardano-cli file format (one or more keys can be provided).',
      },

      '--vote-weight': {
        required: false, // we append 1 in commandExecutor.ts if there is only a single vote public key and its weight is not specified
        dest: 'voteWeights',
        action: 'append',
        type: (weight: string) => BigInt(weight),
        default: [],
        help: 'Weight assigned to the respective vote public key.',
      },
      '--stake-signing-key-hwsfile': {
        required: true,
        dest: 'hwStakeSigningFileData',
        type: (path: string) => parseHwSigningFile(path),
        help: 'Input filepath of the hardware wallet stake signing file, which will be used to to sign the registration.',
      },
      '--payment-address': {
        required: true,
        dest: 'paymentAddress',
        help: 'Address to receive voting rewards.',
      },
      '--nonce': {
        required: true,
        dest: 'nonce',
        type: (nonce: string) => BigInt(nonce),
        help: 'Current slot number.',
      },
      '--voting-purpose': {
        required: false,
        dest: 'votingPurpose',
        type: (votingPurpose: string) => BigInt(votingPurpose),
        help: 'Voting purpose.',
      },
      '--payment-address-signing-key-hwsfile': {
        required: false,
        dest: 'paymentAddressSigningKeyData',
        action: 'append',
        type: (path: string) => parseHwSigningFile(path),
        default: [],
        help: 'Input filepath of the payment address hardware wallet signing file.',
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
