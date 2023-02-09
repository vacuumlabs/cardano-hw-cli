# Spellchecking

This file and setup is copied from NuFi.

We use the "Code Spell Checker" VSCode extension for development, and `cspell` to do checking from scripts. (This extension uses `cspell` under the hood.)

Both are configured in `.cspell.json`.

Run `yarn spell:check` to check the whole codebase. (The CI will also run this as part of the lint job.)

## Adding unknown words to the dictionary

The easiest way is to use VSCode's [Quick Fix](https://code.visualstudio.com/docs/getstarted/keybindings) menu. (Quickly accessible using `Ctrl+.`.) Alternately, you can use the `Spelling > Add Words to CSpell Configuration` context menu.

You can of course manually modify `.cspell.json` as well to add words. See the documentation for the [cspell configuration](http://cspell.org/configuration/) for more advanced features, like ignoring paths, or ignoring words based on a regular expression.

Finally, sometimes spellchecking some parts of the code is just not practical. Test fixtures are a common example of this, since they tend to use a lot of random constants. In such cases, you should just wrap the relevant parts of the code in `/* cspell:disable */` and `/* cspell:enable */` comments.

## Initial setup

I am documenting the steps for initially settings this up on a new project for completeness, but these steps will probably never be needed in the future:

- I aggregated all the errors with this command: `yarn cspell lint --words-only --gitignore '**' | sort | uniq -c | sort -nr > /tmp/words.txt`
- Went through the items from the top of the list, and generally handled the words in one of three ways:
  - I added words with many occurrences to the dictionary.
  - I corrected misspelled words.
  - For things that are not words (like base64 or hexadecimal strings), or words that are only one-offs, I added cspell ignore comments to their occurrences.
