#!/bin/bash

#cd ../ccaf-web
#npm install --unsafe-perm
#cd ../ccaf
rm -rf build

mkdir build
mkdir build/public

cp node_modules/ccaf-server/index.js build/server.js
cp -a ./defaults/. build/
cp -a ../ccaf-web/public/. build/public/
