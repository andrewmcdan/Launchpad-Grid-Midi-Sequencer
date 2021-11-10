// import fs from 'fs';
// import http from 'http';
var __dirname = path.resolve(path.dirname(''));
// import { Server } from 'socket.io';
import express from 'express';
import { createServer } from 'http';

const app = express(); 
const server = createServer(app); 
// const socketio = new Server(server);

// socketio.attach(server);
// socketio.set('transports', ['websocket']);

// import os from 'os';
import midi from 'midi';
import spawn from 'child_process';
import path from 'path';
import kill from 'tree-kill';

// delay function that holds up code execution for "ms" milliseconds.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

var midiJsChild;
// var timingJsChild;
var midiJs_isStarted = false;
// var timingJs_isStarted = false;
var launchpadFound = false;

var serverIsListening = false;


// socketio.on("connection", socket => {
//     console.log(socket);
// })

console.log("Starting web server...");
server.listen(8080);
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('Address in use, retrying...');
      setTimeout(() => {
        server.close();
        server.listen(8080);
      }, 1000);
    }
  });
serverIsListening = true;

const midiIn = new midi.Input();
console.log("Found " + midiIn.getPortCount() + " midi devices.");

setInterval(()=>{
    launchpadFound = false;
    for(let i  = 0; i < midiIn.getPortCount(); i++){
        let thisName = midiIn.getPortName(i);
        if(thisName.substring(0,44) == "Launchpad Mini MK3:Launchpad Mini MK3 MIDI 2"){
            launchpadFound = true;
        }
    }
    if(launchpadFound && !midiJs_isStarted){
        console.log("main.mjs -> Found Launchpad");
        process.stdout.write("main.mjs -> Starting midi.mjs.\r\n")
        let command = 'node';
        let parameters = [path.resolve('midi.mjs')];
        midiJsChild = spawn.spawn(command,parameters,{
            stdio: ['inherit','inherit','inherit','ipc']
        });
        midiJs_isStarted = true;
        server.close(()=>{
            console.log("server no longer listening from main.mjs");
            serverIsListening = false;
            delay(1000);
        })
        midiJsChild.on('exit', (code) => {
            console.log("midiJS exited. Will restart...");
            midiJs_isStarted = false;
        })
    }
    // if(launchpadFound && !timingJs_isStarted){
    //     process.stdout.write("main.mjs -> Starting timing.mjs.\r\n")
    //     let command = 'node';
    //     let parameters = [path.resolve('timing.mjs')];
    //     timingJsChild = spawn.spawn(command,parameters,{
    //         stdio: ['pipe','pipe','pipe','ipc']
    //     });
    //     timingJs_isStarted = true;
    // }
    if(!launchpadFound && midiJs_isStarted){
        process.stdout.write("\r\nmain.mjs -> Launchpad not found. Killing midi.mjs.\r\n");
        kill(midiJsChild.pid);
        midiJs_isStarted = false;
        if(!serverIsListening){
            console.log("main.mjs -> Starting web server...");
            server.listen(8080);
            serverIsListening = true;
        }
    }
    // if(!launchpadFound && timingJs_isStarted){
    //     process.stdout.write("main.mjs -> Launchpad not found. Killing timing.mjs.\r\n");
    //     kill(timingJsChild.pid);
    //     timingJs_isStarted = false;
    // }
},1000)




// load the webUI by default. Also, parse the query string from the request and set each query item to its own cookie on the client so that the JS in the page can see it.
app.get('/', function(req, res) {
    //console.log(Object.entries(req.query));
    // if (Object.keys(req.query).length === 0 && req.query.constructor === Object) {
    //   res.cookie('query', 'none');
    // } else {
    //   keys = Object.keys(req.query);
    //   keys.forEach(function(key) {
    //     res.cookie(key, req.query[key]);
    //   });
    // }
    // debugger;
    res.sendFile(__dirname + '/index2.html');
    // res.send("Launchpad not found. Please connect Launchpad and tap anywhere to reload page.");
  });
  
//   app.get('*', function(req, res) {
//     res.sendFile(__dirname + req.url);
//   });