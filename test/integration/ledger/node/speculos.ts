const SpeculosTransport =
  require('@ledgerhq/hw-transport-node-speculos').default
const TransportNodeHid =
  require('@ledgerhq/hw-transport-node-hid-noevents').default

function shouldUseSpeculos() {
  return process.env.LEDGER_TRANSPORT === 'speculos'
}

async function getTransport() {
  if (shouldUseSpeculos()) {
    return SpeculosTransport.open({apduPort: 9999})
  }
  const paths = await TransportNodeHid.list()
  if (paths.length === 0) {
    throw new Error('NoDeviceFound')
  }
  return TransportNodeHid.open(paths[0])
}

export {shouldUseSpeculos, getTransport}
