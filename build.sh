#!/bin/sh

cd user-list
cargo update
fce build --release
cd ../history
cargo update
fce build --release

cd ..
rm -f artifacts/user-list.wasm
rm -f artifacts/history.wasm
cp user-list/target/wasm32-wasi/release/user-list.wasm artifacts/
cp history/target/wasm32-wasi/release/history.wasm artifacts/

cd artifacts
base64 -w 0 user-list.wasm > userList.ts && sed -i '1s/^/export const USER_LIST=\"/' userList.ts && echo '"' >> userList.ts
base64 -w 0 history.wasm > history.ts && sed -i '1s/^/export const HISTORY=\"/' history.ts && echo '"' >> history.ts
base64 -w 0 sqlite.wasm > sqlite.ts && sed -i '1s/^/export const SQLITE=\"/' sqlite.ts && echo '"' >> sqlite.ts
