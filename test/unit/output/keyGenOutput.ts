/* eslint-disable max-len */
import assert from 'assert'
import { parseBIP32Path } from '../../../src/command-parser/parsers'

import { constructVerificationKeyOutput, constructHwSigningKeyOutput } from '../../../src/fileWriter'
import { XPubKeyHex } from '../../../src/types'

describe('Key-gen output', () => {
  it('Should generate correct output for CIP36 vote keys', () => {
    const pathStr = '1694H/1815H/0H/0/1'
    const keyHex = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as XPubKeyHex
    const path = parseBIP32Path(pathStr)
    const vkey = constructVerificationKeyOutput(keyHex, path)
    const expectedVkey = {
      type: 'CIP36VoteVerificationKey_ed25519',
      description: 'Hardware CIP36 Vote Verification Key',
      cborHex: '5820deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    }
    assert.deepStrictEqual(vkey, expectedVkey)

    const hwsfile = constructHwSigningKeyOutput(keyHex, path)
    const expectedHwsfile = {
      type: 'CIP36VoteHWSigningFile_ed25519',
      description: 'CIP36 Vote Hardware Signing File',
      cborXPubKeyHex: '5820deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      path: pathStr,
    }
    assert.deepStrictEqual(hwsfile, expectedHwsfile)
  })
})
