/* cSpell:disable*/
// NodeJS project for monoprice grid controller project

// delay function that holds up code execution for "ms" milliseconds.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// set to true to enable the welcome message animatioin on the launchpad.
var welcomeMessageEnable = false;

// imports...
// get the path that this file exists in
import path from 'path';
var __dirname = path.resolve(path.dirname(''));

// webserver and socket.io setup
import { Server } from 'socket.io';
import express from 'express';
import { createServer } from 'http';
const app = express(); 
const server = createServer(app); 
const socketio = new Server(server);
socketio.attach(server);


// import os from 'os';
// var fs = require('fs');
// import ipc from 'node-ipc';
import midi from 'midi';
// const {
//     v4: uuidv4
// } = require('uuid');
import rpio from 'rpio';
import SerialPort from 'serialport'
import { uptime } from 'process';

// "port" is an object for communicating over the serial port with the teensy
const port = new SerialPort('/dev/serial0', {
    baudRate: 1000000
}, function (err) {
    if (err) {
        return console.log('Error: ', err.message)
    }
})

// Midi message constants to be OR'ed with channel number
const noteOnMessage = 0b10010000;
const noteOffMessage = 0x80;

// for debugging
socketio.on("connection", socket => {
    console.log(socket);
})

console.log("MIDI.mjs -> Starting web server...");
// webserver listens on 8080. port 80 would require running as root or extra setup
server.listen(8080);
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        // if the port number was already in use, perhaps by main.mjs, try again in 1 second to give 
        // main.mjs a chance to shutdown the server. 
        console.log('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(8080);
        }, 1000);
    }
});

// load the webUI.
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
    res.sendFile(__dirname + '/index.html');
    // res.send("Launchpad not found. Please connect Launchpad and reload page.");
  });
  
  app.get('*', function(req, res) {
    res.sendFile(__dirname + req.url);
  });


// commented out for debugging

// serial port writing tests
// // let t0 = Date.now();
// port.write('main screen turn on', function (err) {
//     if (err) {
//         return console.log('Error on write: ', err.message)
//     }
//     // console.log('message written')
// })
// // let t1 = Date.now();
// // console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);


// Create new midi device constants for the launchpad
const launchpadMidiIn = new midi.Input(),
    launchpadMidiOut = new midi.Output();
var midiInputDevices = [],
    midiInputDevicesNames = [],
    midiInputDevicesEnabled = [],
    midiOutputDevices = [],
    midiOutputDevicesNames = [],
    midiOutputDevicesEnabled = [],
    midiInputDevicesHidden = [],
    midiOutputDevicesHidden = [],
    midiOutputDevicesClockEn = [];

// iterate through all the midi ports, find the launchpad and open that port, store the other ports
// in the array. set enabled and hidden variables, and init @todo clocken
for (let step = 0; step < launchpadMidiIn.getPortCount(); step++) {
    if (launchpadMidiIn.getPortName(step).search("Launchpad Mini MK3:Launchpad Mini MK3 MIDI 2") != -1) {
        launchpadMidiIn.openPort(step);
        midiInputDevicesHidden[step] = true;
        midiInputDevicesNames[step] = " ";
    } else {
        midiInputDevices[step] = new midi.Input();
        midiInputDevices[step].openPort(step);
        midiInputDevicesNames[step] = midiInputDevices[step].getPortName(step);
        midiInputDevicesEnabled[step] = true;
        if (midiInputDevicesNames[step].includes("RtMidi Output Client:RtMidi Output Client") || midiInputDevicesNames[step].includes("Midi Through:Midi Through Port") || midiInputDevicesNames[step].includes("Launchpad Mini MK3:Launchpad Mini MK3 MIDI")) {
            midiInputDevicesHidden[step] = true;
        } else {
            midiInputDevicesHidden[step] = false;
        }
    }
}

if (!launchpadMidiIn.isPortOpen()) {
    throw ("Launchpad Mini MK3 not found.")
}

launchpadMidiIn.ignoreTypes(false, false, false);

for (let step = 0; step < launchpadMidiOut.getPortCount(); step++) {
    if (launchpadMidiOut.getPortName(step).search("Launchpad Mini MK3:Launchpad Mini MK3 MIDI 2") != -1) {
        launchpadMidiOut.openPort(step);
        midiInputDevicesHidden[step] = true;
    } else {
        midiOutputDevices[step] = new midi.Output();
        midiOutputDevices[step].openPort(step);
        midiOutputDevicesNames[step] = midiOutputDevices[step].getPortName(step);
        midiOutputDevicesEnabled[step] = true;
        midiOutputDevicesClockEn[step] = true;
        if (midiOutputDevicesNames[step].includes("RtMidi Input Client") || midiOutputDevicesNames[step].includes("Midi Through:Midi Through Port") || midiOutputDevicesNames[step].includes("Launchpad Mini MK3:Launchpad Mini MK3 MIDI")) {
            midiOutputDevicesHidden[step] = true;
        } else {
            midiOutputDevicesHidden[step] = false;
        }
    }
}

// for debugging
console.log(midiOutputDevicesNames)

// Put the Launchpad into programmer mode
launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 14, 1, 247]);
// Send a welcome message
if (welcomeMessageEnable) {
    // launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 7, 0, 50, 1, 0, 127, 127].concat(getCharCodes("GRID MIDI")).concat(247));
    sendScrollTextToLaunchPad("GRID MIDI");
    // send color update to the scrolling text mapping color to sine wave
    var frequency = .3;
    for (var i = 0; i < 32; ++i) {
        let red = (Math.sin(frequency * i + 0) * 63 + 64) | 0;
        let grn = (Math.sin(frequency * i + 2) * 63 + 64) | 0;
        let blu = (Math.sin(frequency * i + 4) * 63 + 64) | 0;
        // console.log(red, grn, blu);
        launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 7, 0, 10, 1, red, grn, blu].concat(247));
        await delay(170);
    }
}

// Scrolls text across the launchpad.
function sendScrollTextToLaunchPad(textToSend,color = {r: 0, g: 127, b: 127},speed = 10){
    launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 7, 0, speed, 1, color.r, color.g, color.b].concat(getCharCodes(textToSend)).concat(247));
}

// converts a string to an array of char codes
function getCharCodes(s) {
    let charCodeArr = [];
    for (let i = 0; i < s.length; i++) {
        let code = s.charCodeAt(i);
        charCodeArr.push(code);
    }
    return charCodeArr;
}

// setup globals
var settings = {};
settings.debugLevel = 5;

settings.maxXsize = 64;
settings.maxYsize = 64;


// this class get instantiated for each pattern and tracks all the relevant info for that pattern
class gridPattern {
    // 
    constructor(flashPlayCB,playBtnOnCB,playBtnOffCB) {
        // this.playButtonNumber = playBtnIndex;
        this.playButtonOn = playBtnOnCB;
        this.playButtonOff = playBtnOffCB;
        this.flashPlayButton = flashPlayCB;
        this.playing = false;
        // array that holds all the notes in grid for this pattern
        this.grid = [];
        // size of grid for this pattern
        this.xSize = 16;
        this.ySize = 16;
        // index of the current viewable area
        this.xViewIndex = 0;
        this.yViewIndex = 0;
        // which step on the grid...
        this.currentXstep = 0;
        this.currentYstep = 0;
        // pattern tick counter
        this.tickCount = 0;
        // number of ticks per step for each of X and Y
        this.stepSizeX = 24; // number of ticks for ea step. 24 ticks = 1 beat
        this.stepSizeY = 24;
        // rollover point for pattern tick. 
        this.tickResetVal = 2000000;
        // @note pattern outPort spec
        // outport will match the index of the midi device in "midiInputDevices"/"midiOuputDevices".
        // If outPort is > 1000, it is a CV output.
        // If outport is > 1100, it is a Gate output. gates are 1100-1107 and stored as midi notes 60-67
        // Using a large index for CV / gate allows many USB midi devices to be connected without fear of overlapping indexes.
        this.outPort = {};
        this.outPort.portIndex = 1;
        this.outPort.channel = 0;
        // init the "grid" array
        for (let i = 0; i < settings.maxXsize; i++) {
            this.grid[i] = [];
            for (let u = 0; u < settings.maxYsize; u++) {
                this.grid[i][u] = {};
                this.grid[i][u].enabled = 0;
                this.grid[i][u].note = 60;
                this.grid[i][u].velocity = 100;
                this.grid[i][u].noteLength = 250;
                this.grid[i][u].playing = false; // this tracks whecther or not this grid point is already playing. 
            }
        }
    }
    // toggle grid location on / off
    toggleButton(x, y) {
        console.log(`toggle ${x}, ${y}`)
        // check that coords are within bounds of grid
        if ((x + this.xViewIndex) < this.xSize && (y + this.yViewIndex) < this.ySize) {
            if (this.grid[x + this.xViewIndex][y + this.yViewIndex].enabled == 1) {
                this.grid[x + this.xViewIndex][y + this.yViewIndex].enabled = 0;
            } else {
                this.grid[x + this.xViewIndex][y + this.yViewIndex].enabled = 1;
            }
            // return true if point was within grid bounds
            return true;
        }
        // returns false if the point was outside the grid bounds. This should never happen.
        return false;
    }
    // increase the X size of the grid
    increaseX(amnt = 1) {
        if (this.xSize + amnt < settings.maxXsize) {
            this.xSize += amnt;
        }
    }
    // decrease the X size of the grid
    decreaseX(amnt = 1) {
        if (this.xSize - amnt > 0) {
            this.xSize -= amnt;
        }
    }
    // increase the Y size of the grid
    increaseY(amnt = 1) {
        if (this.ySize + amnt < settings.maxYsize) {
            this.ySize += amnt;
        }
    }
    // decrease the y size of the grid
    decreaseY(amnt = 1) {
        if (this.ySize - amnt > 0) {
            this.ySize -= amnt;
        }
    }
    // shifts view to the right by one
    increaseXView(){
        // check bounds
        if(this.xViewIndex+8 < this.xSize){
            this.xViewIndex++;
        }
        // update the launchpad
        copyCurrentPatternGridEnabledToGridColor();
    }
    // shifts view to the ledt by one
    decreaseXView(){
        if(this.xViewIndex > 0){
            this.xViewIndex--;
        }
        // update the launchpad
        copyCurrentPatternGridEnabledToGridColor();
    }
    // shifts view up by one
    increaseYView(){
        if(this.yViewIndex + 8 < this.ySize){
            this.yViewIndex++;
        }
        // update the launchpad
        copyCurrentPatternGridEnabledToGridColor();
    }
    // shift view down by one
    decreaseYView(){
        if(this.yViewIndex > 0){
            this.yViewIndex--;
        }
        // update the launchpad
        copyCurrentPatternGridEnabledToGridColor();
    }
    // sets the velocity of the note at X,Y
    setVelocity(x,y,val = 0){
        // checks bounds
        if(val < 128){
            this.grid[x][y].velocity = val;
        }else{
            this.grid[x][y].velocity = 127;
        }
    }
    getVelocity(x,y){
        return this.grid[x][y].velocity;
    }
    // sets note value of note at X,Y
    setNote(x,y,val = 0){
        if(val < 128){
            this.grid[x][y].note = val;
        }else{
            this.grid[x][y].note = 127;
        }
    }
    getNote(x,y){
        return this.grid[x][y].note;
    }
    setNoteLength(x,y,val){
        if(val < 15000){
            this.grid[x][y].noteLength = val;
        }
    }
    getNoteLength(x,y){
        return this.grid[x][y].noteLength;
    }
    // return true/false bassed on note enabled or not
    // if offset == 1, take into account view shift
    getNoteEnabled(x,y,offset=0){
        // console.log(`x: ${x}, y:${y}`);
        if(offset==1){
            return this.grid[x + this.xViewIndex][y + this.yViewIndex].enabled == true;
        }else{
            return this.grid[x][y].enabled == true;
        }
    }
    //return whether or not the particular note was already started playing.
    getNotePlaying(x,y){
        return this.grid[x][y].playing == true;
    }
    setNotePlaying(x,y,playingBool){
        this.grid[x][y].playing = playingBool;
        // console.log("set note playing");
    }
    // plays the note at X,Y
    playNote(x,y){
        // @todo 
        this.setNotePlaying(x,y,true);
        // console.log(this.getNotePlaying(x,y));
        // console.log(this.getNoteLength(x,y));
        playNote(this.outPort.portIndex,this.outPort.channel,this.getNote(x,y),this.getVelocity(x,y),this.getNoteLength(x,y));

        setTimeout(() => {
            this.setNotePlaying(x,y,false);
        }, this.getNoteLength(x,y));
    }
    // finds and plays all the notes on the current X step
    playStepX(){
        copyCurrentPatternGridEnabledToGridColor();
        // finds and plays any notes that are enabled on the current step.
        this.grid[this.currentXstep].forEach((row,rowInd)=>{
            if(this.getNoteEnabled(this.currentXstep,rowInd)){// && !this.getNotePlaying(this.currentXstep,rowInd)){
                console.log({row});
                this.playNote(this.currentXstep,rowInd);
            }
        })
        this.currentXstep++;
        if(this.currentXstep >= this.xSize) this.currentXstep = 0;
    }
    // finds and plays all the notes on the current Y step
    playStepY(){
        // copyCurrentPatternGridEnabledToGridColor();
        // finds and plays any notes that are enabled on the current step.
        this.grid.forEach((col,colInd)=>{
            // if(col[this.currentYstep].enabled && !col[this.currentYstep].playing){
            //     console.log(col[this.currentYstep]);
            // }
            if(this.getNoteEnabled(colInd,this.currentYstep) && !this.getNotePlaying(colInd,this.currentYstep)){
                console.log(col[this.currentYstep]);
                this.playNote(colInd,this.currentYstep);
            }
        })
        this.currentYstep++;
        if(this.currentYstep >= this.ySize) this.currentYstep = 0;
    }
    // increases the tick on this pattern and if the tick has hit the step size, calls playStepX/Y
    tick(){
        if(this.tickCount % 24 == 0){
            this.flashPlayButton();
        }

        if(this.tickCount % this.stepSizeX == 0){
            this.playStepX();
        }
        // this.currentXstepTickCount++;
        // if(this.currentXstepTickCount > this.stepSizeX) this.currentXstepTickCount = 0;
        if(this.tickCount % this.stepSizeY == 0){
            this.playStepY();
        }
        // this.currentYstepTickCount++;
        // if(this.currentYstepTickCount > this.stepSizeY) this.currentYstepTickCount = 0;

        this.tickCount++;
        if(this.tickCount>=this.tickResetVal)this.tickCount=0;
        // copyCurrentPatternGridEnabledToGridColor();
    }
    // reset tick and current step, update grid
    tickReset(){
        this.tickCount = 0;
        this.currentYstep = 0;
        this.currentXstep = 0;
        this.playButtonOn();
        copyCurrentPatternGridEnabledToGridColor();
    }

    getCurrentGridX(){
        // console.log(this.currentXstep + this.xViewIndex);
        return this.currentXstep - this.xViewIndex;
    }

    getCurrentGridY(){
        // console.log(this.currentYstep + this.yViewIndex);
        return this.currentYstep - this.yViewIndex;
    }

    getOutPort(){
        return this.outPort;
    }

    setOutPort(val = -1){
        if(val != -1){
            // @todo 
            // set port if enabled, return false if not.
        }else{
            return false;
        }
    }

    turnOnPlayButton(){
        this.playButtonOn();
    }
}



var gridState = {};

// otherColor is the 8 buttons at the top (0-7) and the 8 buttons on the right (8-15) RGB colors
gridState.otherColor = [];
for (let i = 0; i < 16; i++) {
    gridState.otherColor[i] = {};
    gridState.otherColor[i].r = 10;
    gridState.otherColor[i].g = 0;
    gridState.otherColor[i].b = 0;
}
gridState.logoColor = {};
gridState.logoColor.r = 127;
gridState.logoColor.g = 127;
gridState.logoColor.b = 127;

gridState.bpm = 120;
gridState.gridMode = "normal";
gridState.currentSelectedPattern = 0;
gridState.numberOfPlayingPatterns = 0;
gridState.patterns = [7];
for (let i = 0; i < 7; i++) {
    gridState.patterns[i] = new gridPattern(()=>{
        gridState.otherColor[15 - i].r = gridState.otherColor[15 - i].r==0?127:0;
        gridState.otherColor[15 - i].g = gridState.otherColor[15 - i].g==0?127:0
        gridState.otherColor[15 - i].b = gridState.otherColor[15 - i].b==0?127:0
    },()=>{
        gridState.otherColor[15 - i].r = 10;
        gridState.otherColor[15 - i].g = 0;
        gridState.otherColor[15 - i].b = 0;
    },()=>{
        gridState.otherColor[15 - i].r = 0;
        gridState.otherColor[15 - i].g = 0;
        gridState.otherColor[15 - i].b = 0;
    });
    gridState.patterns[i].playButtonOff();
    // @todo load saved data into patterns
}
gridState.patterns[0].playButtonOn();


// ... receive MIDI messages ...
let gridButtonDownTime = new Array(64);
let gridButtonUpTime = new Array(64);
let gridButtonsPressed = [0,0,0,0,0,0,0,0,0,0];
let lastPressedGridButton = [0,0];
let tempVelocity = 0;
let tempNote = 0;
let tempOctave = 5;
let tempnoteLength = [0,0];

let playButtonDownTime = Date.now();

launchpadMidiIn.on('message', (deltaTime, message) => {
    debug(`m: ${message} d: ${deltaTime}`);
    
    // console.log(`m: ${message} d: ${deltaTime}`);
    // if (message[0] < 240 && message[2] == 127) {
    //     launchpadMidiOut.sendMessage([message[0], message[1], 87]);
    //     gridState.gridColor

    // }
    // if (message[0] == 144 && message[1] == 17 && message[2] == 127) {
    //     sendColors();
    // }

    let gridY = ((message[1] / 10) | 0) - 1;
    let gridX = (message[1] % 10) - 1;


    // if the first byte of the message was 176 and the 3rd was 127, then that was a button down
    // for any button not on the grid.
    if(message[0] == 176 && message[2] == 127){
        playButtonDownTime = Date.now();
        let patternNum;
        switch(message[1]){
            case 91:{
                gridState.patterns[gridState.currentSelectedPattern].increaseYView();
                break;
            }
            case 92:{
                gridState.patterns[gridState.currentSelectedPattern].decreaseYView();
                break;
            }
            case 93:{
                gridState.patterns[gridState.currentSelectedPattern].decreaseXView();
                break;
            }
            case 94:{
                gridState.patterns[gridState.currentSelectedPattern].increaseXView();
                break;
            }
            case 89:{
                // top play button
                patternNum = 0;
                break;
            }
            case 79:{
                // second play button
                patternNum = 1;
                break;
            }
            case 69:{
                patternNum = 2;
                break;
            }
            case 59:{
                patternNum = 3;
                break;
            }
            case 49:{
                patternNum = 4;
                break;
            }
            case 39:{
                patternNum = 5;
                break;
            }
            case 29:{
                // bottom play button
                patternNum = 6;
                break;
            }
            case 19:{
                // stop, mute, solo button
                patternNum = 7;

                gridState.currentSelectedPattern = 0;
                // patternNum = 0;

                // stop palying each pattern, reset it, and reset number of playing patterns. This will
                // stop the global playing, tick, and clock output.
                gridState.patterns.forEach((pat,ind)=>{
                    pat.playing = false;
                    pat.tickReset();
                })
                gridState.numberOfPlayingPatterns = 0;
                // @todo probably need to send an update to the grid now
                break;
            }
        }

        


        if(message[1] < 90){
            if(patternNum != gridState.currentSelectedPattern){
                gridState.currentSelectedPattern = patternNum;
                for(let e = 0; e < 7; e++){
                    if(!gridState.patterns[e].playing){
                        gridState.patterns[e].playButtonOff();
                    }
                }
                if(patternNum<7){
                    gridState.patterns[patternNum].playButtonOn();
                }else{
                    gridState.currentSelectedPattern = 0;
                    gridState.patterns[0].playButtonOn();
                }

            }else{
                // toggle playing state for pattern
                gridState.patterns[patternNum].playing = !gridState.patterns[patternNum].playing;

                // set overall play state to true
                if(gridState.patterns[patternNum].playing) gridState.playing = true;
                // if pattern was toggled off, reset tick and reduce number of playing patterns
                if(!gridState.patterns[patternNum].playing){
                    gridState.patterns[patternNum].tickReset();
                    gridState.numberOfPlayingPatterns--;
                }else{
                    // increase number of playing patterns
                    gridState.numberOfPlayingPatterns++;
                }
            }
        }

        copyCurrentPatternGridEnabledToGridColor();

        if(gridState.numberOfPlayingPatterns == 0){
            gridState.playing = false;
        }
    }
    
    if(message[0] == 176 && message[2] == 0 && message[1] < 90 && message[1] > 20){
        let playButtonUpTime = Date.now();
        if(playButtonUpTime - playButtonDownTime > 1000){
            process.stdout.write("pressed time: ");
            console.log(playButtonUpTime - playButtonDownTime);
            gridState.gridMode = "patternOpts1";
            sendScrollTextToLaunchPad("X steps", 15);
        }
    }

    switch(gridState.gridMode){
        case "normal":{
            if (message[0] == 144 && message[2] == 127) { // grid button
                console.log(gridX, gridY);
                gridButtonDownTime[gridX + (8 * gridY)] = Date.now();
                // console.log(gridButtonDownTime);
                gridState.patterns[gridState.currentSelectedPattern].toggleButton(gridX, gridY);
                copyCurrentPatternGridEnabledToGridColor();
                gridButtonsPressed.push(message[1]);
                gridButtonsPressed.shift();
                console.log({gridButtonsPressed})
                lastPressedGridButton[0] = gridX;
                lastPressedGridButton[1] = gridY;
            }
            if(message[0] == 144 && message[2] == 0){
                gridButtonUpTime[gridX + (8 * gridY)] = Date.now();
                let pressedArrayIndex = gridButtonsPressed.findIndex(el=>el==message[1]);
                let numberOfPressedButtons = 10 - gridButtonsPressed.findIndex(el=>el>0);
                gridButtonsPressed.splice(pressedArrayIndex,1);
                gridButtonsPressed.unshift(0);
                console.log({numberOfPressedButtons})
                // checking that this button release corresponds to a single button being pressed.
                if(numberOfPressedButtons == 1){
                    // check time this button was pressed
                    let timePressed = gridButtonUpTime[gridX + (8 * gridY)] - gridButtonDownTime[gridX + (8 * gridY)];
                    // console.log({timePressed});
                    //check for long press
                    if(timePressed>1000){
                        //enter gridNote options mode
                        gridState.gridMode = "gridNoteOpts";
                        clearGrid();
                        drawGridNoteOpts();
                        tempVelocity = gridState.patterns[gridState.currentSelectedPattern].getVelocity(gridX, gridY);
                        tempNote = gridState.patterns[gridState.currentSelectedPattern].getNote(gridX, gridY);
                        if(!gridState.patterns[gridState.currentSelectedPattern].getNoteEnabled(gridX, gridY)){
                            gridState.patterns[gridState.currentSelectedPattern].toggleButton(gridX, gridY);
                        }
                    }
                }
            }
            break;
        }
        case "patternOpts1":{
            if(message[0] == 144 && message[2] == 127){
                let numSteps = (gridY * 8) + gridX + 1;
                gridState.patterns[gridState.currentSelectedPattern].xSize = numSteps;
                gridState.gridMode = "patternOpts2";
                sendScrollTextToLaunchPad("Y steps", 15);
            }
            break;
        }
        case "patternOpts2":{
            if(message[0] == 144 && message[2] == 127){
                let numSteps = (gridY * 8) + gridX + 1;
                gridState.patterns[gridState.currentSelectedPattern].ySize = numSteps;
                gridState.gridMode = "patternOpts3";
                sendScrollTextToLaunchPad("X step size", 15);
            }
            break;
        }
        case "patternOpts3":{
            if(message[0] == 144 && message[2] == 127){
                gridState.patterns[gridState.currentSelectedPattern].stepSizeX = ((gridY * 8) + gridX + 1);
                gridState.gridMode = "patternOpts4";
                sendScrollTextToLaunchPad("Y step size", 15);
            }
            break;
        }
        case "patternOpts4":{
            if(message[0] == 144 && message[2] == 127){
                gridState.patterns[gridState.currentSelectedPattern].stepSizeY = ((gridY * 8) + gridX + 1);
                gridState.gridMode = "normal";
                copyCurrentPatternGridEnabledToGridColor();
                // sendScrollTextToLaunchPad("Y step size", 15);
            }
            break;
        }
        case "patternOpts5":{
            break;
        }
        case "patternOpts6":{
            break;
        }
        case "patternOpts7":{
            break;
        }
        case "patternOpts8":{
            copyCurrentPatternGridEnabledToGridColor();
            break;
        }
        case "gridNoteOpts":{
            // each button in this mode will set a temporary value that gets set when the confirm / ok button is pressed. 
            // for the buttons that set velocity, change the velocity settings for the slected note when the button is pressed.
            if(gridY == 4){
                tempVelocity = (gridX * 8) + 7;
            }else if(gridY == 5){
                tempVelocity = ((gridX + 8) * 8) + 7;
            }else if(gridY == 7){
                if(gridX == 0){
                    gridState.gridMode = "normal";
                    clearGrid();
                    copyCurrentPatternGridEnabledToGridColor();
                }else if(gridX == 7){
                    gridState.gridMode = "normal";
                    gridState.patterns[gridState.currentSelectedPattern].setVelocity(lastPressedGridButton[0], lastPressedGridButton[1],tempVelocity);
                    gridState.patterns[gridState.currentSelectedPattern].setNote(lastPressedGridButton[0], lastPressedGridButton[1],tempNote);
                    gridState.patterns[gridState.currentSelectedPattern].setNoteLength(lastPressedGridButton[0], lastPressedGridButton[1],calculateNoteLength(tempnoteLength,gridState.bpm));
                    clearGrid();
                    copyCurrentPatternGridEnabledToGridColor();
                }
            }
            // console.log({tempVelocity})

            if(message[0] == 144 && message[2] == 127){
                // note-on message
                // check for note buttons on grid
                if(gridY == 1){
                    let naturalNoteOffsets = [0,2,4,5,7,9,11,12];
                    tempNote = naturalNoteOffsets[gridX] + (tempOctave * 12);
                    // console.log({tempNote})
                    playNote(gridState.patterns[gridState.currentSelectedPattern].getOutPort().portIndex,gridState.patterns[gridState.currentSelectedPattern].getOutPort().channel,tempNote,tempVelocity,gridState.patterns[gridState.currentSelectedPattern].getNoteLength(lastPressedGridButton[0],lastPressedGridButton[1]));
                }else if(gridY == 2){
                    let sharpFlatNoteOffsets = [0,1,3,3,6,8,10,12];
                    tempNote = sharpFlatNoteOffsets[gridX] + (tempOctave * 12);
                    playNote(gridState.patterns[gridState.currentSelectedPattern].getOutPort().portIndex,gridState.patterns[gridState.currentSelectedPattern].getOutPort().channel,tempNote,tempVelocity,gridState.patterns[gridState.currentSelectedPattern].getNoteLength(lastPressedGridButton[0],lastPressedGridButton[1]));
                    // console.log({tempNote})
                }else if(gridY == 0){
                    tempOctave = gridX + 1;
                }else if(gridY == 6){
                    // tempnoteLength = gridX + 1;
                    gridButtonDownTime[gridX + (8 * gridY)] = Date.now();
                    gridButtonsPressed.push(message[1]);
                    gridButtonsPressed.shift();
                }

            }else if(message[0] == 144 && message[2] == 0){
                if(gridY == 1){
                    // @todo play note
                    let naturalNoteOffsets = [0,2,4,5,7,9,11,12];
                    tempNote = naturalNoteOffsets[gridX] + (tempOctave * 12);
                    // console.log({tempNote})
                    playNote(gridState.patterns[gridState.currentSelectedPattern].getOutPort().portIndex,gridState.patterns[gridState.currentSelectedPattern].getOutPort().channel,tempNote,0);
                }else if(gridY == 2){
                    let sharpFlatNoteOffsets = [0,1,3,3,6,8,10,12];
                    tempNote = sharpFlatNoteOffsets[gridX] + (tempOctave * 12);
                    playNote(gridState.patterns[gridState.currentSelectedPattern].getOutPort().portIndex,gridState.patterns[gridState.currentSelectedPattern].getOutPort().channel,tempNote,0);
                    // console.log({tempNote})
                }else if(gridY == 6){
                    // tempnoteLength = gridX + 1;
                    gridButtonUpTime[gridX + (8 * gridY)] = Date.now();
                    let pressedArrayIndex = gridButtonsPressed.findIndex(el=>el==message[1]);
                    let numberOfPressedButtons = 10 - gridButtonsPressed.findIndex(el=>el>0);
                    gridButtonsPressed.splice(pressedArrayIndex,1);
                    gridButtonsPressed.unshift(0);
                    // console.log({numberOfPressedButtons})
                    // checking that this button release corresponds to a single button being pressed.
                    if(numberOfPressedButtons == 1){
                        // check time this button was pressed
                        let timePressed = gridButtonUpTime[gridX + (8 * gridY)] - gridButtonDownTime[gridX + (8 * gridY)];
                        // console.log({timePressed});
                        //check for long press
                        if(timePressed>1000){
                            //enter gridNote options mode
                            // gridState.gridMode = "gridNoteOpts";
                            // clearGrid();
                            // drawGridNoteOpts();
                            // tempVelocity = gridState.patterns[gridState.currentSelectedPattern].getVelocity(gridX, gridY);
                            // tempNote = gridState.patterns[gridState.currentSelectedPattern].getNote(gridX, gridY);
                            console.log("break")
                            tempnoteLength[0] = gridX;
                        }else{
                            tempnoteLength[1] = gridX;
                        }
                    }
                }
            }
            break;
        }
    }

    
    if(message[0] == 176 && true){}
});

// gridColor is 8x8 grid RGB colors
gridState.gridColor = [];
for (let x = 0; x < 8; x++) {
    gridState.gridColor[x] = [];
    for (let y = 0; y < 8; y++) {
        gridState.gridColor[x][y] = {};
        gridState.gridColor[x][y].r = 0;
        gridState.gridColor[x][y].g = 0;
        gridState.gridColor[x][y].b = 0;
    }
}




function copyCurrentPatternGridEnabledToGridColor() {
    if(gridState.gridMode!="normal")return;
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            let currentPattern = gridState.patterns[gridState.currentSelectedPattern];

            gridState.gridColor[x][y].r = 0;
            gridState.gridColor[x][y].g = 0;
            gridState.gridColor[x][y].b = 0;
            

            if(currentPattern.getCurrentGridX() == x){
                gridState.gridColor[x][y].r = 10;
                gridState.gridColor[x][y].g = 10;
                gridState.gridColor[x][y].b = 10;
            }

            if(currentPattern.getCurrentGridY() == y){
                gridState.gridColor[x][y].r = 10;
                gridState.gridColor[x][y].g = 10;
                gridState.gridColor[x][y].b = 10;
            }

            // console.log(currentPattern.grid[x+currentPattern.xIndex])
            if (currentPattern.getNoteEnabled(x,y,1) == true){//grid[x + currentPattern.xViewIndex][y + currentPattern.yViewIndex].enabled == 1) {
                // gridState.gridColor[x][y].r = 0;
                // gridState.gridColor[x][y].g = 0;
                gridState.gridColor[x][y].b = 127;
            }
        }
    }
}


function clearGrid(){
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {            
            gridState.gridColor[x][y].r = 0;
            gridState.gridColor[x][y].g = 0;
            gridState.gridColor[x][y].b = 0;
        }
    }
}

function drawPatternOpts(stage){

}

function drawGridNoteOpts(){
    // cancel, top left
    gridState.gridColor[0][7].r = 127;
    // ok, top right
    gridState.gridColor[7][7].g = 127;
    // note length, row 2
    for(let x = 0; x < 8; x++){
        gridState.gridColor[x][6].r = 127;
        gridState.gridColor[x][6].b = 0;
        gridState.gridColor[x][6].g = 127;
    }
    // octaves, bottom row
    for(let x = 0; x < 8; x ++){
        gridState.gridColor[x][0].r = 127;
        gridState.gridColor[x][0].b = 127;
    }
    // keyboard, C's
    gridState.gridColor[7][1].r = 127;
    gridState.gridColor[7][1].b = 127;
    gridState.gridColor[0][1].r = 127;
    gridState.gridColor[0][1].b = 127;
    // keyboard, naturals
    for(let x = 1; x < 7; x++){
        gridState.gridColor[x][1].r = 127;
        gridState.gridColor[x][1].b = 127;
        gridState.gridColor[x][1].g = 127;
    }
    //keyboard, sharps/flats
    gridState.gridColor[1][2].r = 127;
    gridState.gridColor[1][2].b = 127;
    gridState.gridColor[1][2].g = 127;
    
    gridState.gridColor[2][2].r = 127;
    gridState.gridColor[2][2].b = 127;
    gridState.gridColor[2][2].g = 127;

    gridState.gridColor[4][2].r = 127;
    gridState.gridColor[4][2].b = 127;
    gridState.gridColor[4][2].g = 127;

    gridState.gridColor[5][2].r = 127;
    gridState.gridColor[5][2].b = 127;
    gridState.gridColor[5][2].g = 127;

    gridState.gridColor[6][2].r = 127;
    gridState.gridColor[6][2].b = 127;
    gridState.gridColor[6][2].g = 127;

    // velocity, rows 4,5
    for(let x = 0; x < 8; x++){
        for(let y = 4; y <= 5; y++){
            let val = ((((((y - 4) * 8) + x) / 2) * ((((y - 4) * 8) + x) / 2)) | 0 ) + 5;
            gridState.gridColor[x][y].r = 0;
            gridState.gridColor[x][y].b = val;
            gridState.gridColor[x][y].g = val;
        }
    }
}


var lastSendColorTime = Date.now();

function sendColors(overrideThrottle = false) {
    // Override throttle can be set to true in order to send an update immediately, although it may cause glitches.
    let currentTime = Date.now();
    if (currentTime - lastSendColorTime > 10 || overrideThrottle) {
        lastSendColorTime = Date.now();
        let sysExInit = [240, 0, 32, 41, 2, 13, 3];
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                sysExInit.push(3);
                sysExInit.push((x + 1) + ((y + 1) * 10));
                sysExInit.push(gridState.gridColor[x][y].r);
                sysExInit.push(gridState.gridColor[x][y].g);
                sysExInit.push(gridState.gridColor[x][y].b);
            }
        }
        for (let i = 1; i <= 8; i++) {
            sysExInit.push(3);
            sysExInit.push(90 + i);
            sysExInit.push(gridState.otherColor[i - 1].r);
            sysExInit.push(gridState.otherColor[i - 1].g);
            sysExInit.push(gridState.otherColor[i - 1].b);
        }
        for (let i = 1; i <= 8; i++) {
            sysExInit.push(3);
            sysExInit.push((i * 10) + 9);
            sysExInit.push(gridState.otherColor[i + 7].r);
            sysExInit.push(gridState.otherColor[i + 7].g);
            sysExInit.push(gridState.otherColor[i + 7].b);
        }
        sysExInit.push(247);
        // console.log(sysExInit)
        launchpadMidiOut.send(sysExInit);
        launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 3, 3, 99, gridState.logoColor.r, gridState.logoColor.g, gridState.logoColor.b, 247])
    }
}

// play a note on either midi device or CV out.If velocity is 0, do note off.
function playNote(deviceIndex,channel,note,velocity,length){
    // check that this should be sent to midi device
    if(deviceIndex < 1000){
        // check that the midi device is enabled
        if(midiOutputDevicesEnabled[deviceIndex]){
            if(velocity>0){
                // send the note to the midi device
                midiOutputDevices[deviceIndex].sendMessage([noteOnMessage | channel,note,velocity]);
                // check for -1 which means that the note gets turned off manually
                if(length != -1){
                    setTimeout(() => {
                        midiOutputDevices[deviceIndex].sendMessage([noteOffMessage | channel,note,0]);
                    }, length);
                }
            }else{
                // if velocity is 0, the note should turned off, send note-off
                midiOutputDevices[deviceIndex].sendMessage([noteOffMessage | channel,note,0]);
            }
        }
    }else if(deviceIndex < 1100){
        // @todo 
        // do CV-gate output
    }else if(deviceIndex < 1108){
        // @todo 
        // do drum gate output
    }
}

let tickTimer_1 = Date.now();
var counter_1 = 0;
setInterval(() => {
    let tickTimer_2 = Date.now();
    let tickTime = ((60 / ( gridState.bpm / 4)) / 96 ) * 1000;
    if(tickTimer_2 - tickTimer_1 > tickTime){
        tickTimer_1 = Date.now();
        // console.log(`tick: ${counter_1++}`);
        if(gridState.playing){
            midiOutputDevicesClockEn.forEach((devEn,devInd)=>{
                if(devEn){
                    midiOutputDevices[devInd].send([248])
                }
            })
            //@todo send midi clock using non-USB midi ports, if enabled
            // advanceX();
            // advanceY();
            gridState.patterns.forEach((pattern,ind) => {
                if(pattern.playing){
                    pattern.tick();
                    // console.log("pattern");
                }
            })
        }
    }
}, 1);


function calculateNoteLength(noteLengthIndex,bpm){
    
    let noteLengthArray = [
        [1/24,  2/24,   3/24,   4/24,   5/24,   6/24,   7/24,   8/24], // sixteenth triplets
        [1/16,  2/16,   3/16,   4/16,   5/16,   6/16,   7/16,   8/16], // sixteenths
        [1/12,  2/12,   3/12,   4/12,   5/12,   6/12,   7/12,   8/12], // triplets
        [1/8,   2/8,    3/8,    4/8,    5/8,    6/8,    7/8,    8/8], // eigths
        [1/6,   2/6,    3/6,    4/6,    5/6,    6/6,    7/6,    8/6], // quater triplets
        [1/4,   2/4,    3/4,    4/4,    5/4,    6/4,    7/4,    8/4], // qarters
        [1/3,   2/3,    3/3,    4/3,    5/3,    6/3,    7/3,    8/3], // half note triplets
        [1/2,   2/2,    3/2,    4/2,    5/2,    6/2,    7/2,    8/2] // half notes
    ];
    let secondsPerMeasure = 60 / ( bpm / 4);
    let noteTime = secondsPerMeasure * noteLengthArray[noteLengthIndex[0]][noteLengthIndex[1]];
    console.log(noteLengthIndex,bpm,noteLengthArray[noteLengthIndex[0]][noteLengthIndex[1]])
    console.log({noteTime});
    return noteTime * 1000;
}


copyCurrentPatternGridEnabledToGridColor();

setInterval(() => {
    sendColors();
}, 30);


















/* #region  debug and exit functions */
async function debug(s, format, lvl, comment) {
    if (!lvl) {
        lvl = 5;
    }
    if (lvl <= settings.debugLevel) {
        if(format)console.log("______________________");
        if(format)console.log("|    DEBUG OUTPUT    |");
        if (comment) {
            if(format)console.log(comment);
        }
        if(format)console.log("----------------------");
        console.log(s);
        if(format)console.log("______________________");
        if(format)console.log("**********************");
        if(format)console.log(" ");
        if(format)console.log(" ");
    }
}

function exit() {
    // fireMidiIn.closePort();
    // fireMidiOut.closePort();
    // if (settings.osType != "Windows_NT" && typeof virInput !== 'undefined') {
    //     virInput.closePort();
    //     virOutput.closePort();
    // }
    console.log("Closing midi devices...");
    launchpadMidiIn.closePort();

    // Take the launchpad out of programmer mode.
    launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 14, 0, 247]);
    launchpadMidiOut.closePort();
    console.log("Midi devices closed....");
    console.log("Closing server....");
    server.close(()=>{
        console.log("Server no longer listening form Midi.mjs....");
    });
    
    // rpio.spiEnd();

    console.log("All services stopped. Exiting.");
}


function exitHandler(options, exitCode) {
    exit();
    if (options.cleanup) debug('clean', 2);
    if (exitCode || exitCode === 0) debug(exitCode, 1);
    if (options.exit) process.exit();
    console.log({
        exitCode
    });
    console.log("Change debug logging level with '--debugLevel [0-5]'");
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {
    cleanup: true
}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
    exit: true
}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {
    exit: true
}));
process.on('SIGUSR2', exitHandler.bind(null, {
    exit: true
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
    exit: true
}));

/* #endregion */



// await delay(3000);
// process.send('exit')
// process.exit(1);
// console.log("test");
