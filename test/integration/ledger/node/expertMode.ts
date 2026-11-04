import {Ada} from '@cardano-foundation/ledgerjs-hw-app-cardano'
import {INS} from '@cardano-foundation/ledgerjs-hw-app-cardano/dist/interactions/common/ins'
import {interact} from '@cardano-foundation/ledgerjs-hw-app-cardano/dist/interactions/common/interact'
import type {Interaction} from '@cardano-foundation/ledgerjs-hw-app-cardano/dist/interactions/common/types'
import {isV7App} from '@cardano-foundation/ledgerjs-hw-app-cardano/dist/validation/deviceCapabilities'
import type Transport from '@ledgerhq/hw-transport'

// The debug settings APDU (INS.RUN_TESTS) exists only in DEBUG builds of app v8+.
// Its payload is [expertMode, silentPubkeyExport, blindSigning] and can be used to
// enable/disable expert mode, silent pubkey export, and blind signing.
function* debugSetExpertMode(expertMode: boolean): Interaction<void> {
  yield {
    ins: INS.RUN_TESTS,
    p1: 0x00,
    p2: 0x00,
    data: Buffer.from([expertMode ? 0x01 : 0x00, 0x01, 0x00]),
    expectedResponseLength: 3,
  }
}

export const canSetExpertMode = async (
  transport: Transport,
): Promise<boolean> => {
  const {version} = await new Ada(transport).getVersion()
  return version.flags.isDebug && !isV7App(version)
}

// Runs `test` with expert mode on, and turns it off afterwards.
export const withExpertMode = async (
  transport: Transport,
  test: () => Promise<void>,
): Promise<void> => {
  const ada = new Ada(transport)
  await interact(debugSetExpertMode(true), ada._send)
  try {
    await test()
  } finally {
    await interact(debugSetExpertMode(false), ada._send).catch(() => undefined)
  }
}
