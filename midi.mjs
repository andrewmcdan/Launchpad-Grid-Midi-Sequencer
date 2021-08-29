// NodeJS projet for monoprice grid controller project

// const os = require('os');
import os from 'os';
// var fs = require('fs');
import ipc from 'node-ipc';
// const midi = require('midi');
import midi from 'midi';
// const {
//     v4: uuidv4
// } = require('uuid');

process.on('message', (mes) => {
    console.log("received message: ");
    console.log(mes);
})

// Set up a new input.
const midiIn = new midi.Input();
const midiOut = new midi.Output();

// Count the available input ports.
// console.log(midiIn.getPortCount());

// Get the name of a specified input port.
// console.log(midiIn.getPortName(2));

// Configure a callback.
midiIn.on('message', (deltaTime, message) => {
    // console.log(`m: ${message} d: ${deltaTime}`);
    if (message[0] < 240 && message[2] == 127) {
        midiOut.sendMessage([message[0], message[1], 87]);
        // console.log(`m: ${message} d: ${deltaTime}`);
    }
    if (message[0] == 144 && message[1] == 17 && message[2] == 127) {
        sendColors();
    }

});

// Open the first available input port.
midiIn.openPort(2);
midiOut.openPort(2);

midiOut.send([240, 0, 32, 41, 2, 13, 14, 1, 247]);
// midiOut.send([240,126,127,6,1,247])
// midiOut.send([240,0,32,41,2,13,7,0,10,1,0,127,127].concat(getCharCodes("GRID MIDI")).concat(247));

function getCharCodes(s) {
    let charCodeArr = [];

    for (let i = 0; i < s.length; i++) {
        let code = s.charCodeAt(i);
        charCodeArr.push(code);
    }

    return charCodeArr;
}

// Sysex, timing, and active sensing messages are ignored
// by default. To enable these message types, pass false for
// the appropriate type in the function below.
// Order: (Sysex, Timing, Active Sensing)
// For example if you want to receive only MIDI Clock beats
// you should use
// input.ignoreTypes(true, false, true)
midiIn.ignoreTypes(false, false, false);

// ... receive MIDI messages ...


// setup globals
var settings = {};
settings.debugLevel = 5;
var gridState = {};

// gridColor is 8x8 grid RGB colors
gridState.gridColor = [];
for (let x = 0; x < 8; x++) {
    gridState.gridColor[x] = [];
    for (let y = 0; y < 8; y++) {
        gridState.gridColor[x][y] = {};
        gridState.gridColor[x][y].r = 0;
        gridState.gridColor[x][y].g = 0;
        gridState.gridColor[x][y].b = 127;
    }
}
// otherColor is the 8 buttons at the top (0-7) and the 8 buttons on the right (8-15) RGB colors
gridState.otherColor = [];
for (let i = 0; i < 16; i++) {
    gridState.otherColor[i] = {};
    gridState.otherColor[i].r = 127;
    gridState.otherColor[i].g = 0;
    gridState.otherColor[i].b = 0;
}

gridState.logoColor = {};
gridState.logoColor.r = 127;
gridState.logoColor.g = 127;
gridState.logoColor.b = 127;

function sendColors(overrideThrottle = false) {
    // need to implement throttling of this function to avoid calling it too often. Override throttle can be set to true in order to send an update immediately, although it may cause glitches.
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
        sysExInit.push(gridState.otherColor[i - 1].r);
        sysExInit.push(gridState.otherColor[i - 1].g);
        sysExInit.push(gridState.otherColor[i - 1].b);
    }
    sysExInit.push(247);
    // console.log(sysExInit)
    midiOut.send(sysExInit);
    midiOut.send([240, 0, 32, 41, 2, 13, 3, 3, 99, gridState.logoColor.r, gridState.logoColor.g, gridState.logoColor.b, 247])
}

setTimeout(() => {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            gridState.gridColor[x][y].r = x % 2 == 1 ? 0 : 127;
        }
    }
    sendColors();
}, 10);


setTimeout(() => {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            gridState.gridColor[x][y].g = x % 2 == 1 ? 0 : 127;
        }
    }
    sendColors();
}, 20);

setTimeout(() => {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            gridState.gridColor[x][y].b = x % 2 == 1 ? 0 : 127;
        }
    }
    sendColors();
}, 30);

setTimeout(() => {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            gridState.gridColor[x][y].r = x % 2 == 1 ? 127 : 0;
        }
    }
    sendColors();
}, 40);

setTimeout(() => {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            gridState.gridColor[x][y].g = x % 2 == 1 ? 127 : 0;
        }
    }
    sendColors();
}, 50);

setTimeout(() => {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            gridState.gridColor[x][y].b = x % 2 == 1 ? 127 : 0;
        }
    }
    sendColors();
}, 60);





gridState.enabledPoints = [];
for (let i = 0; i < 8; i++) {
    gridState.enabledPoints[i] = [];
    for (let u = 0; u < 8; u++) {
        gridState.enabledPoints[i][u] = {};
        gridState.enabledPoints[i][u].bool = true;
        gridState.enabledPoints[i][u].color = 0;
    }
}
gridState.currentXstep = 0;
gridState.currentYstep = 0;
gridState.tempo = 120; // beat per minute
gridState.XstepSize = 0.5; // steps per beat. 0.5 would be eigth notes. 1 is quarter notes.
gridState.YstepSize = 1;

// trnaslate incoming mid from the controller to triggers

// send color data to buttons

// handle time to step calcualtions
var timePlayX = Date.now();
var timePlayY = Date.now();


function stepHandler() {
    timeCurrent = Date.now();
    var firstIterationOfThisStepX = false;
    var firstIterationOfThisStepY = false;
    // 120 bpm / 60 seconds = 2 beats per second
    // 1 / 2 beats per socond = time for one beat
    // if surrect step * time for one beat is greater than timeCurrent - timePlay
    // then do step
    //      - increment current step (for both lr and tb if necessary)
    //      - check for note to play
    let beatsPerSecond = gridState.tempo / 60.0;
    let beatTime = 1 / beatsPerSecond * 1000;
    let timeSincePlayX = timeCurrent - timePlayX;
    let timeSincePlayY = timeCurrent - timePlayY;
    // console.log("math: " + (beatTime * gridState.currentXstep * gridState.XstepSize * 1000));
    // console.log("X: " ,beatTime,gridState.currentXstep,gridState.XstepSize, timeSincePlayX);
    // console.log("Y: ", beatTime,gridState.currentYstep,gridState.XstepSize, timeSincePlayY)
    if (beatTime * gridState.currentXstep * gridState.XstepSize <= timeSincePlayX) {
        gridState.currentXstep++;
        firstIterationOfThisStepX = true;
        if (gridState.currentXstep > 7) {
            gridState.currentXstep = 0;
            timePlayX = Date.now();
        }
    }
    if (beatTime * gridState.currentYstep * gridState.YstepSize <= timeSincePlayY) {
        gridState.currentYstep++;
        firstIterationOfThisStepY = true;
        if (gridState.currentYstep > 7) {
            gridState.currentYstep = 0;
            timePlayY = Date.now();
        }
    }
    if (gridState.enabledPoints[gridState.currentXstep][gridState.currentYstep].bool && (firstIterationOfThisStepX || firstIterationOfThisStepY)) {
        console.log(timeCurrent - timePlayX);
        console.log(timeCurrent - timePlayY);
        console.log("step: " + gridState.currentXstep + " " + gridState.currentYstep);
        firstIterationOfThisStep = false;
        // play note
    }
    if (firstIterationOfThisStepX || firstIterationOfThisStepY) console.table(gridState.enabledPoints);
}

// setInterval(stepHandler, 1);

// console.log(gridState)

var stepped = false;

function advanceXstep() {
    gridState.currentXstep++;
    if (gridState.currentXstep > 7) gridState.currentXstep = 0;
    stepped = true;
}

function advanceYstep() {
    gridState.currentYstep++;
    if (gridState.currentYstep > 7) gridState.currentYstep = 0;
    stepped = true;
}


let beatsPerSecond = gridState.tempo / 60.0;
let beatTime = 1 / beatsPerSecond * 1000;

// setInterval(advanceXstep,beatTime * gridState.XstepSize);
// setInterval(advanceYstep,beatTime * gridState.YstepSize);
// setInterval(() => {
//     if(stepped){
//         console.log("step: " + gridState.currentXstep + " " + gridState.currentYstep);
//         console.table(gridState.enabledPoints);
//         stepped = false;
//     }
// }, 1);


/* #region  debug and exit functions */
async function debug(s, lvl, comment) {
    if (!lvl) {
        lvl = 5;
    }
    if (lvl <= settings.debugLevel) {
        console.log("______________________");
        console.log("|    DEBUG OUTPUT    |");
        if (comment) {
            console.log(comment);
        }
        console.log("----------------------");
        console.log(s);
        console.log("______________________");
        console.log("**********************");
        console.log(" ");
        console.log(" ");
    }
}

function exit() {
    // fireMidiIn.closePort();
    // fireMidiOut.closePort();
    // if (settings.osType != "Windows_NT" && typeof virInput !== 'undefined') {
    //     virInput.closePort();
    //     virOutput.closePort();
    // }
    midiIn.closePort();
    midiOut.send([240, 0, 32, 41, 2, 13, 14, 0, 247]);
    midiOut.closePort();
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


const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
await delay(10000);
console.log("test");