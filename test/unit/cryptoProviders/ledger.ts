import assert from 'assert'
import { HARDENED_THRESHOLD } from '../../../src/constants'
import { AddressType, NetworkIds, ProtocolMagics } from '../../../src/basicTypes'
import { classifyPath, getAddressAttributes, PathTypes } from '../../../src/crypto-providers/util'

describe('Test util', () => {
  describe('Classify path', () => {
    it('Byron wallet address path', () => {
      const HD = HARDENED_THRESHOLD

      assert.deepStrictEqual(
        classifyPath([44 + HD, 1815 + HD, 0 + HD, 0, 0]),
        PathTypes.PATH_WALLET_SPENDING_KEY_BYRON,
      )

      assert.deepStrictEqual(
        classifyPath([44 + HD, 1815 + HD, 0 + HD, 0]),
        PathTypes.PATH_INVALID,
      )
    })

    it('Shelley wallet address path', () => {
      const HD = HARDENED_THRESHOLD

      assert.deepStrictEqual(
        classifyPath([1852 + HD, 1815 + HD, 0 + HD, 1, 5]),
        PathTypes.PATH_WALLET_SPENDING_KEY_SHELLEY,
      )

      assert.deepStrictEqual(
        classifyPath([1852 + HD, 1815 + HD, 0 + HD, 3, 0]),
        PathTypes.PATH_INVALID,
      )
    })

    it('Staking path', () => {
      const HD = HARDENED_THRESHOLD

      assert.deepStrictEqual(
        classifyPath([1852 + HD, 1815 + HD, 1 + HD, 2, 0]),
        PathTypes.PATH_WALLET_STAKING_KEY,
      )

      assert.deepStrictEqual(
        classifyPath([1852 + HD, 1815 + HD, 3 + HD, 2, 1]),
        PathTypes.PATH_INVALID,
      )
    })
  })

  describe('Gets correct address attributes', () => {
    it('Byron address', () => {
      assert.deepStrictEqual(
        getAddressAttributes('Ae2tdPwUPEZELF6oijm8VFmhWpujnNzyG2zCf4RxfhmWqQKHo2drRD5Uhah'),
        {
          addressType: AddressType.BYRON,
          networkId: NetworkIds.MAINNET,
          protocolMagic: ProtocolMagics.MAINNET,
        },
      )
    })

    it('Shelley address (testnet, payment key, staking key)', () => {
      assert.deepStrictEqual(
        // eslint-disable-next-line max-len
        getAddressAttributes('addr_test1qpd9xypc9xnnstp2kas3r7mf7ylxn4sksfxxypvwgnc63vcayfawlf9hwv2fzuygt2km5v92kvf8e3s3mk7ynxw77cwq9nnhk4'),
        {
          addressType: AddressType.BASE_PAYMENT_KEY_STAKE_KEY,
          networkId: NetworkIds.TESTNET,
          protocolMagic: ProtocolMagics.TESTNET_PREVIEW,
        },
      )
    })

    it('Shelley address (mainnet, payment script, staking script)', () => {
      assert.deepStrictEqual(
        // eslint-disable-next-line max-len
        getAddressAttributes('addr1x96vdmkys5w64dkvjv5rkpkh837wrmxvyrm0n07mw9dqtu6jms758dkjge0fvyyuuadtvx47t6wpmz3unnn0lz36755qp6mwvr'),
        {
          addressType: AddressType.BASE_PAYMENT_SCRIPT_STAKE_SCRIPT,
          networkId: NetworkIds.MAINNET,
          protocolMagic: ProtocolMagics.MAINNET,
        },
      )
    })
  })

  it('Classify script payment path', () => {
    const HD = HARDENED_THRESHOLD

    assert.deepStrictEqual(
      classifyPath([1854 + HD, 1815 + HD, 0 + HD, 0, 5]),
      PathTypes.PATH_WALLET_SPENDING_KEY_MULTISIG,
    )

    assert.deepStrictEqual(
      classifyPath([1854 + HD, 1815 + HD, 0 + HD, 1, 0]),
      PathTypes.PATH_INVALID,
    )

    assert.deepStrictEqual(
      classifyPath([1854 + HD, 1815 + HD, 0 + HD, 3, 0]),
      PathTypes.PATH_INVALID,
    )
  })

  it('Classify script staking path', () => {
    const HD = HARDENED_THRESHOLD

    assert.deepStrictEqual(
      classifyPath([1854 + HD, 1815 + HD, 1 + HD, 2, 0]),
      PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG,
    )

    assert.deepStrictEqual(
      classifyPath([1854 + HD, 1815 + HD, 1 + HD, 2, 1]),
      PathTypes.PATH_WALLET_STAKING_KEY_MULTISIG,
    )
  })

  it('Classify mint path', () => {
    const HD = HARDENED_THRESHOLD

    assert.deepStrictEqual(
      classifyPath([1855 + HD, 1815 + HD, 1 + HD]),
      PathTypes.PATH_WALLET_MINTING_KEY,
    )

    assert.deepStrictEqual(
      classifyPath([1855 + HD, 1815 + HD, 0 + HD, 0, 0]),
      PathTypes.PATH_INVALID,
    )

    assert.deepStrictEqual(
      classifyPath([1855 + HD, 1815 + HD, 0 + HD, 2, 0]),
      PathTypes.PATH_INVALID,
    )
  })
})
