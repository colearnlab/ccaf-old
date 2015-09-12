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
  
  return exports;
});