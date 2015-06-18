## About

Reflect-Project is a platform for managing multiple multitouch devices in a classroom. If you are one teacher with twenty-five kids and anywhere from a handful of devices to one-to-one pairings, how do you control each device without physically being at each one? RP is the solution - it allows a teacher to send apps and content to devices, get feedback on student's progress, and project device contents to a big screen, all with one or two taps.

## Start

    npm install reflectproject
    node main.js
    
Navigate to http://localhost:1867/ in one window (or http://YOUR_IP:1867/ on another device) for your client device and http://localhost:1867/console on your main device.

## Client

Select a device to get started. You'll see a blank screen.

## Console

Select a classroom to get started. The window represents an overhead visualization of the classroom. When a device is online, it lights up. Drag an app from the dock to a device to launch it. You'll see the app pop up on the device. You can 'freeze' a device (prevent interaction), clear it and the coolest thing - project its contents to another device - accessing the menu by clicking the screen.

## Demo

Open the path to a client in two windows. In the console, drag the 'Alphabetize' app to the device. Observe how when you move an object in one window, it moves in the other. And when you refresh, everything stays in place!

**Note:** Currently we are optimizing for touch screen tables, so there is some css set to remove the cursor. This can be frustrating when developing so to change this go to client/index.html and remove * { cursor: none; } from the stylesheet.

## Developing

It's easiest to duplicate an existing app in /apps. Reconfigure the package.json accordingly. The 'client' key points to your app module.

An app module has one export: function startApp(cb, parentElement). Mount your app onto the parentElement and you're good to go. You can load CSS with css(path) and javascript using require().

cb refers to a [checkerboard](https://github.com/gregoryfabry/checkerboard) object. When you write an app, you want to store your entire apps state on the state.global object. The global object is shared between all clients in a classroom that are running your app, so it's useful to create an object that will hold each devices state.

As long as you keep your app's state in checkerboard, it will automatically be synced with the classroom. Try projecting your app to another device, or opening the same device in two windows, and watch them sync up.

## The future

Obviously this readme is a bit light - a more thorough treatment/API is in order. Currently RP is in heavy development, but I am the only programmer on the team right now. The focus is iteration and functionality, so while everything works pretty well, it isn't production-ready (e.g. no authentication, security, etc.) Contributing: right now the most useful thing to do would be to develop apps that can demonstrate the functionality of the platform. Contributions to the platform itself are more than welcome; apologies in advance for the sparsely commented code. Please send me an email if you have any questions, I would be eager to talk to other developers about this project.

## Thank you

An honest thank you to all who are looking at or considering contributing to this project - you are actively making a difference.
