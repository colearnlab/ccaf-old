define('clientUtil', [], function() {
  var exports = {};
  
  exports.css = function(url) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    link.classList.add('app-css');
    document.getElementsByTagName("head")[0].appendChild(link);
  };
  
  exports.parameter = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));  
  };
  
  function getToPath(root, path) {
    var cur = root;
    var components = typeof path === "string" ? path.split('.') : path;
    if (components.length === 1)
      return root[components[0]];
    else
      return getToPath(root[components[0]], path.slice(1));
  }
  
  var CheckerboardStem = exports.CheckerboardStem = function(root,  path) {
    this.root = root;
    this.path = path;
  }
  
  CheckerboardStem.prototype.try = function(callback) {
    this.root.try(function(state) {
      callback(getToPath(state, this.path));
    });
  };
  
  CheckerboardStem.prototype.subscribe = function(path, callback) {
    return this.root.subscribe(this.path + '.' + path, callback); 
  };
  
  CheckerboardStem.prototype.unsubscribe = function(path, callback) {
    return this.root.unsubscribe(this.path + '.' + path, callback);
  };
  
  return exports;
});