_cardano_hw_cli_completions()
{
    case $COMP_CWORD in
        1)
            COMPREPLY=( $(compgen -W "device version address key transaction node catalyst" "${COMP_WORDS[1]}") )
            ;;
        2)
            if [ "${COMP_WORDS[1]}" = "address" ]; then
                COMPREPLY=( $(compgen -W "key-gen show" "${COMP_WORDS[2]}") )
            fi
            if [ "${COMP_WORDS[1]}" = "key" ]; then
                COMPREPLY=( $(compgen -W "verification-key" "${COMP_WORDS[2]}") )
            fi
            if [ "${COMP_WORDS[1]}" = "transaction" ]; then
                COMPREPLY=( $(compgen -W "sign witness" "${COMP_WORDS[2]}") )
            fi
            if [ "${COMP_WORDS[1]}" = "device" ]; then
                COMPREPLY=( $(compgen -W "version" "${COMP_WORDS[2]}") )
            fi
            if [ "${COMP_WORDS[1]}" = "node" ]; then
                COMPREPLY=( $(compgen -W "key-gen issue-op-cert" "${COMP_WORDS[2]}") )
            fi
            ;;
        *)
            if [ "${COMP_WORDS[1]}" = "address" ] && [ "${COMP_WORDS[2]}" = "key-gen" ]; then
                COMPREPLY=( $(compgen -W "--path --hw-signing-file --verification-key-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[2]}" = "show" ]; then
                COMPREPLY=( $(compgen -W "--payment-path --staking-path --address-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[2]}" = "verification-key" ]; then
                COMPREPLY=( $(compgen -W "--hw-signing-file --verification-key-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[2]}" = "sign" ] || [ "${COMP_WORDS[2]}" = "witness" ]; then
                COMPREPLY=( $(compgen -W "--mainnet --testnet-magic --tx-body-file --hw-signing-file --change-output-key-file --out-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[1]}" = "node" ] && [ "${COMP_WORDS[2]}" = "key-gen" ]; then
                COMPREPLY=( $(compgen -W "--path --hw-signing-file --cold-verification-key-file --operational-certificate-issue-counter-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[2]}" = "issue-op-cert" ]; then
                COMPREPLY=( $(compgen -W "--kes-verification-key-file --kes-period --operational-certificate-issue-counter --hw-signing-file --out-file" -- "${COMP_WORDS[-1]}") )
            fi
            ;;
    esac
}

complete -F _cardano_hw_cli_completions cardano-hw-cli

