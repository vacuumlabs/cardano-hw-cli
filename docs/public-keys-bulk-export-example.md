## Generate public verification key and hardware wallet signing file - bulk export
```
cardano-hw-cli address key-gen \
--path 1852H/1815H/0H/0/0 \
--path 1852H/1815H/0H/0/1 \
--path 1852H/1815H/0H/0/2 \
--verification-key-file payment0.vkey \
--verification-key-file payment1.vkey \
--verification-key-file payment2.vkey \
--hw-signing-file payment0.hwsfile \
--hw-signing-file payment1.hwsfile \
--hw-signing-file payment2.hwsfile
```
Should create 6 files: `payment0.vkey`, `payment1.vkey`, `payment2.vkey`, `payment0.hwsfile`, `payment1.hwsfile`, `payment2.hwsfile`.