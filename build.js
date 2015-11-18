var fs = require('fs');
var path = require('path')

if (!process.argv[2])
 throw new Error('no script selected. node build [setup | package].');

// in lieu of including a bunch of dependencies for simple file functions

// http://w3stack.org/question/copy-folder-recursively-in-node-js/
var copyRecursiveSync = function(src, dest) {
  var exists = fs.existsSync(src);
  var stats = exists && fs.statSync(src);
  var isDirectory = exists && stats.isDirectory();
  var isNodeModules = path.basename(src) === 'node_modules';
  if (exists && isDirectory) {
    mkdirSync(dest);
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.linkSync(src, dest);
  }
};

// http://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
function copy(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}
// http://stackoverflow.com/questions/13696148/node-js-create-folder-or-use-existing
function mkdirSync(path) {
  try {
    fs.mkdirSync(path);
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}

// https://gist.github.com/liangzan/807712
function rmdirSync(dirPath) {
  try { var files = fs.readdirSync(dirPath); }
  catch(e) { return; }
  if (files.length > 0)
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile())
        fs.unlinkSync(filePath);
      else
        rmdirSync(filePath);
    }
  fs.rmdirSync(dirPath);
};

switch(process.argv[2]) {
  case 'setup':
    // clean up
    rmdirSync(path.resolve(__dirname, 'build'));
  
    // create build folder
    mkdirSync(path.resolve(__dirname, 'build'));
    mkdirSync(path.resolve(__dirname, 'build', 'public'));
    
    // get packages and ensure they are present
    copy(require.resolve('ccaf-server'), path.resolve(__dirname, 'build', 'server.js'), function(err) {
      if (err) throw new Error(err);
      
      ['apps', 'client', 'console', 'shared', 'lib'].forEach(function(folder) {
        copyRecursiveSync(path.resolve(path.dirname(require.resolve('ccaf-web')), folder), path.resolve(__dirname, 'build', 'public', folder));
      });
      
      copyRecursiveSync(path.resolve(__dirname, 'defaults'), path.resolve(__dirname, 'build'));
    });
  break;
  case 'package':
  
  
  
  break;
  default:
    throw new Error('invalid script selected. node build [setup | package].');
}