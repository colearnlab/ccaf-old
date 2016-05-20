## Developing CCAF or for CCAF: recommended procedure

Make sure you have node and npm installed.

1. Create a directory to develop in - I usually use ~/Repositories  
2. Clone ccaf/ccaf, ccaf/ccaf-web and ccaf/ccaf-server from GitHub. So now we have ~/Repositories/ccaf, ~/Repositories/ccaf-web and ~/Repositories/ccaf-server. Of course substitute your forked repositories if you are developing from those, but keep the directory structure the same.  
3. In each folder: `npm install`
4. Both in ccaf-web and ccaf-server: `npm link`
5. In ccaf: `npm link ccaf-web` and `npm link ccaf-server`
What we have done is substituted the ccaf-web and ccaf-server packages in the overarching ccaf package with our own local packages.  
6. In ccaf: `sudo npm run build-continuous`
Note that nodemon uses a shell script to rebuild currently. If you are on Windows, change event handlers in nodemon.json to 'node build install' instead of './rebuild.sh', but your results will be less reliable and you might need to restart the server after changing anyways (type 'rs' and hit enter).  
7. Navigate to http://localhost in the browser. Default ports are specified in defaults/config.json. Whenever files in ccaf-web or ccaf-server are changed, the server will automatically be reloaded.

### Developing apps

The best way to start developing an app is to clone an existing app and update the package.json file accordingly (after setting up the dev environment as above). The most important file is client.js, which contains the client module (and must be pointed to in package.json). It uses [RequireJS](http://requirejs.org/)-style modules. [Underscore](http://underscorejs.org/), [Mithril](http://mithril.js.org/) and [interact.js](http://interactjs.io/) are already loaded, but any other modules you need to bring yourself.

Apps are simple: they need to export a single load function. The signature of the load function is load(el, action, store). el is the element that the app must be mounted on. action and store come from [checkerboard](http://github.com/gregoryfabry/checkerboard). action is an action creator:
```
    action('add-point').onReceive ...
```
and store is the synchronized store:
```    
    store.addObserver ...
```
Read the checkerboard documents to learn more about how a synchronized application works. As long as you follow those
