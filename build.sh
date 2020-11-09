#!/bin/sh

cd services/user-list
cargo update
fce build --release
cd ../history
cargo update
fce build --release

cd ../../
rm -f artifacts/user-list.wasm
rm -f artifacts/history.wasm
cp services/user-list/target/wasm32-wasi/release/user-list.wasm artifacts/
cp services/history/target/wasm32-wasi/release/history.wasm artifacts/

 cd artifacts
 rm -f sqlite3.wasm
 wget https://github.com/fluencelabs/sqlite/releases/download/v0.8.0_w/sqlite3.wasm
 base64 -w 0 user-list.wasm > userListBs64.ts && sed -i '1s/^/export const USER_LIST_BS64=\"/' userListBs64.ts && echo '"' >> userListBs64.ts
 base64 -w 0 history.wasm > historyBs64.ts && sed -i '1s/^/export const HISTORY_BS64=\"/' historyBs64.ts && echo '"' >> historyBs64.ts
 base64 -w 0 sqlite3.wasm > sqliteBs64.ts && sed -i '1s/^/export const SQLITE_BS64=\"/' sqliteBs64.ts && echo '"' >> sqliteBs64.ts
