_cardano_hw_cli_completions()
{
    case $COMP_CWORD in
        1)
            COMPREPLY=( $(compgen -W "shelley device version" "${COMP_WORDS[1]}") )
            ;;
        2)
            if [ "${COMP_WORDS[1]}" = "shelley" ]; then
                COMPREPLY=( $(compgen -W "address key transaction" "${COMP_WORDS[2]}") )
            fi
            if [ "${COMP_WORDS[1]}" = "device" ]; then
                COMPREPLY=( $(compgen -W "version" "${COMP_WORDS[2]}") )
            fi
            ;;
        3)
            if [ "${COMP_WORDS[2]}" = "address" ]; then
                COMPREPLY=( $(compgen -W "key-gen show" "${COMP_WORDS[3]}") )
            fi
            if [ "${COMP_WORDS[2]}" = "key" ]; then
                COMPREPLY=( $(compgen -W "verification-key" "${COMP_WORDS[3]}") )
            fi
            if [ "${COMP_WORDS[2]}" = "transaction" ]; then
                COMPREPLY=( $(compgen -W "sign witness" "${COMP_WORDS[3]}") )
            fi
            ;;
        *)
            if [ "${COMP_WORDS[3]}" = "key-gen" ]; then
                COMPREPLY=( $(compgen -W "--path --hw-signing-file --verification-key-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[3]}" = "show" ]; then
                COMPREPLY=( $(compgen -W "--payment-path --staking-path --address-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[3]}" = "verification-key" ]; then
                COMPREPLY=( $(compgen -W "--hw-signing-file --verification-key-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[3]}" = "sign" ]; then
                COMPREPLY=( $(compgen -W "--mainnet --testnet-magic --tx-body-file --hw-signing-file --change-output-key-file --out-file" -- "${COMP_WORDS[-1]}") )
            fi
            if [ "${COMP_WORDS[3]}" = "witness" ]; then
                COMPREPLY=( $(compgen -W "--mainnet --testnet-magic --tx-body-file --hw-signing-file --change-output-key-file --out-file" -- "${COMP_WORDS[-1]}") )
            fi
            ;;
    esac
}

complete -F _cardano_hw_cli_completions cardano-hw-cli

