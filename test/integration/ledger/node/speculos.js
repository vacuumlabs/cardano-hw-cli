const SpeculosTransport = require('@ledgerhq/hw-transport-node-speculos')
const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid-noevents')

function shouldUseSpeculos() {
  return process.env.LEDGER_TRANSPORT === 'speculos'
}

async function getTransport() {
  return shouldUseSpeculos()
    ? SpeculosTransport.open({ apduPort: 9999 })
    : TransportNodeHid.create()
}

module.exports = {
  shouldUseSpeculos,
  getTransport,
}
