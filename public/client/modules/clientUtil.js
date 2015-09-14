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
  
  function getByPath(obj, keyPath){ 
   
      var keys, keyLen, i=0, key;
   
      obj = obj || window;      
      keys = keyPath && keyPath.split(".");
      keyLen = keys && keys.length;
   
      while(i < keyLen && obj){
   
          key = keys[i];        
          obj = (typeof obj.get == "function") 
                      ? obj.get(key)
                      : obj[key];                    
          i++;
      }
   
      if(i < keyLen){
          obj = null;
      }
   
      return obj;
  };
  
  var CheckerboardStem = exports.CheckerboardStem = function(root,  path) {
    this.root = root;
    this.path = path;
  }
  
  CheckerboardStem.prototype.try = function(callback) {
    var path = this.path;
    return this.root.try(function(state) {
      callback(getByPath(state, path));
    });
  };
  
  CheckerboardStem.prototype.get = function(path, callback) {
    return this.root.get(this.path + '.' + path, callback);
  };
  
  CheckerboardStem.prototype.subscribe = function(path, callback) {
    return this.root.subscribe(this.path + '.' + path, callback); 
  };
  
  CheckerboardStem.prototype.unsubscribe = function(path, callback) {
    return this.root.unsubscribe(this.path + '.' + path, callback);
  };
  
  return exports;
});