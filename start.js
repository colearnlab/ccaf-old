var forever = require('forever-monitor');

var child = new (forever.Monitor)('build/server.js', {
    silent: true,
    args: []
});

child.on('exit:code', function(code) {
    if (1 === code) child.stop(); // don't restart the script on SIGTERM
});

child.start();