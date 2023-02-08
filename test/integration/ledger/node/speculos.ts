const SpeculosTransport =
  require('@ledgerhq/hw-transport-node-speculos').default
const TransportNodeHid =
  require('@ledgerhq/hw-transport-node-hid-noevents').default

function shouldUseSpeculos() {
  return process.env.LEDGER_TRANSPORT === 'speculos'
}

async function getTransport() {
  return shouldUseSpeculos()
    ? SpeculosTransport.open({apduPort: 9999})
    : TransportNodeHid.create()
}

export {shouldUseSpeculos, getTransport}
