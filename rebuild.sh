#!/bin/bash

# This script grabs all the relevent parts from ccaf-web and ccaf-server and
# compiles them into the build folder. The defaults folder contains default
# configuration information.

# TODO create windows version?

#cd ../ccaf-web
#npm install --unsafe-perm
#cd ../ccaf
rm -rf build

mkdir build
mkdir build/public

cp node_modules/ccaf-server/index.js build/server.js
cp -a ./defaults/. build/
cp -a ../ccaf-web/public/. build/public/
