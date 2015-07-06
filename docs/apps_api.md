# Apps API

## Introduction

An RP app is entirely self-contained. As long as it fits the specifications outlined below, it will be able to be dropped into the RP platform with all features working correctly (app/content sending, admin controls, mirroring, etc.);

## Basic requirements

### Directory structure

An app is placed into the `/apps` directory. The directory name must be unique, although it has no bearing on the behavior or characteristics of the app. An app must have a package.json file and at least one module (*.js file) specified in package.json to serve as the client. All supporting files are rooted in the app directory.

The apps folder is guaranteed to be served at `/apps` on the server domain. The path to the app folder must not be hardcoded because it is not guaranteed that an app will be installed at a particular path. The app directory name can be found at `state.device('app')` via the STM object - this is explained below. Thus, the full path to the directory will always be `'/apps/' + state.device('app') + '/'`.

### package.json

All paths are relative to the app's directory.

`package.json:`
```javascript
{
  "title": "App Title",     // Displayed in the dock and anywhere a pretty title is needed.
  "icon": "icon.png",       // 64x64px. Displayed in the dock, to signify a device is running an app, and in the loader.
  "client": "client.js",    // A module that is loaded on the client side - the actual activity that is run.
  "admin": "admin.js",      // A module that is loaded as a tab on the console side. This can control the activity.
  "shared": "shared.js",    // A module that is loaded anywhere - client, console or server.
  "contentReceiver": false, // Whether the app implements the ContentReceiver interface.
  "dataReporter": false     // Whether the app implements the DataReporter interface.
}
```

### Modules

A sample skeleton module is presented below.

`client.js:`
```javascript
define(function() {
  var exports = {};

  exports.startApp = function(stm, parentElement, api, shared) {
    /* ... */
  };

  return exports;
});

```

**Client** and **admin** modules *must* expose the `startApp` method. When an app is loaded this method is called once; there is no further interaction from the platform. Note that the app can be loaded in any state - for example, startApp can be called after the app's state has been modified by another client. The startApp method must then check the existing state presented by the Shared Transactional Memory object and initialize as needed.

#### - Parameters

`stm:` The Shared Transactional Memory object represents the state of an app. It is documented in stm.md.  
`parentElement:` The DOM node where the app should mount itself.  
`api`: ...
