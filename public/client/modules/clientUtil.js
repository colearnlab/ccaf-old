define('clientUtil', ['exports'], function(exports) { 
  exports.css = function(url, persist) {
    var links = document.getElementsByTagName('link');
    for (var i = 0; i < links.length; i++)
      if (links[i].href === url)
        return;
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    if (!persist) link.classList.add('app-css');
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
});