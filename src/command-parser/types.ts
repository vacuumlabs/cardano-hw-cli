export enum CommandType {
  SHELLEY = 'shelley',

  ADDRESS = 'shelley.address',
  KEY_GEN = 'shelley.address.key-gen',

  KEY = 'shelley.key',
  GET_VERIFICATION_KEY = 'shelley.key.verification-key',

  TRANSACTION = 'shelley.transcation',
  SIGN_TRANSACTION = 'shelley.transcation.sign',
  WITNESS_TRANSACTION = 'shelley.transcation.witness',
}

export const enum ArgType { Default, FileInput, FileOutput}
