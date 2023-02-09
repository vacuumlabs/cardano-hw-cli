# Macos autocomplete installation
On mac you need to update your bash first. Check your version with

```
bash --version
```

If you have version 3.2 from 2007, update to newer version:

```
brew install bash
```

Verify the installation, you should see new version installed:
```
$ which -a bash
/usr/local/bin/bash
/bin/bash
```

check version, you should see at least version 5.0:
```
$ /usr/local/bin/bash --version
GNU bash, version 5.0.18(1)-release (x86_64-apple-darwin20.2.0)
Copyright (C) 2019 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>

This is free software; you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
```

Newly installed bash should be new default, restart terminal and check:
```
$ bash --version
GNU bash, version 5.0.18(1)-release (x86_64-apple-darwin20.2.0)
...
```

Whitelist this shell. Add `/usr/local/bin/bash` to the end of `/etc/shells` file:
```
$ sudo vim /etc/shells
```

Change default shell:
```
$ chsh -s /usr/local/bin/bash
```

Restart terminal and check version:
```
$ echo $BASH_VERSION
5.0.18(1)-release
```

This change is only for current user, for super user execute:
```
$ sudo chsh -s /usr/local/bin/bash
```

Finally append contents of https://github.com/vacuumlabs/cardano-hw-cli/blob/develop/scripts/autocomplete.sh to the `~/.bashrc` and source it in `~/.bash_profile`:
```
source .bashrc
```