echo 'This script will install ccaf in a structure conducive to developing.\n\nThis is not meant to be run with ccaf already installed -- instead download this script, place it in the directory that you wish to setup your environment and run it from there.\n'

echo 'Dev environment will be placed in the CWD. After this script is run, you will see the directories ccaf, ccaf-web and ccaf-server.\n'

echo 'Press enter to continue.\n'

sed -n q </dev/tty

command -v npm >/dev/null 2>&1 || { echo >&2 "I require npm but it's not installed.  Aborting."; exit 1; }
command -v git >/dev/null 2>&1 || { echo >&2 "I require git but it's not installed.  Aborting."; exit 1; }

npm install ccaf/ccaf
mv node_modules/ccaf ccaf

npm install ccaf/ccaf-web
mv node_modules/ccaf-web ccaf-web

npm install ccaf/ccaf-server
mv node_modules/ccaf-server ccaf-server

rm -rf node_modules

cd ccaf-web
npm link
cd ..

cd ccaf-server
npm link
cd ..

cd ccaf
npm link ccaf-web
npm link ccaf-server

cd defaults
yes '' | openssl req -newkey rsa:2048 -nodes -keyout domain.key -x509 -days 365 -out domain.crt
cd ..

./rebuild.sh
