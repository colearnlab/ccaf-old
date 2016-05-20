/* start.js
 * This script starts the server using forever. It will automatically restart
 * in the case of a crash.
 */

var forever = require('forever-monitor');

var child = new (forever.Monitor)('build/server.js', {
    silent: false,
    args: []
});

child.on('exit:code', function(code) {
    if (1 === code) child.stop(); // don't restart the script on SIGTERM
});

child.start();
