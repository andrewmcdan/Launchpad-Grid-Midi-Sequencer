/* cSpell:disable*/
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
// NodeJS projet for monoprice grid controller project

var welcomeMessageEnable = false;

import os from 'os';
// var fs = require('fs');
import ipc from 'node-ipc';
import midi from 'midi';
// const {
//     v4: uuidv4
// } = require('uuid');
import rpio from 'rpio';
import SerialPort from 'serialport'

const port = new SerialPort('/dev/serial0', {
    baudRate: 1000000
}, function (err) {
    if (err) {
        return console.log('Error: ', err.message)
    }
})


// // let t0 = Date.now();
// port.write('main screen turn on', function (err) {
//     if (err) {
//         return console.log('Error on write: ', err.message)
//     }
//     // console.log('message written')
// })
// // let t1 = Date.now();
// // console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);

process.on('message', (mes) => {
    console.log("received message: ");
    console.log(mes);
})


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
    midiOutputDevicesHidden = [];

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
        if (midiOutputDevicesNames[step].includes("RtMidi Input Client") || midiOutputDevicesNames[step].includes("Midi Through:Midi Through Port") || midiOutputDevicesNames[step].includes("Launchpad Mini MK3:Launchpad Mini MK3 MIDI")) {
            midiOutputDevicesHidden[step] = true;
        } else {
            midiOutputDevicesHidden[step] = false;
        }
    }
}

// Put the Launchpad into programmer mode
launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 14, 1, 247]);
// Send a welcome message
if (welcomeMessageEnable) {
    launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 7, 0, 50, 1, 0, 127, 127].concat(getCharCodes("GRID MIDI")).concat(247));
    var frequency = .3;
    for (var i = 0; i < 32; ++i) {
        let red = (Math.sin(frequency * i + 0) * 63 + 64) | 0;
        let grn = (Math.sin(frequency * i + 2) * 63 + 64) | 0;
        let blu = (Math.sin(frequency * i + 4) * 63 + 64) | 0;
        console.log(red, grn, blu);
        launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 7, 0, 10, 1, red, grn, blu].concat(247));
        await delay(170);
    }
}

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

class gridPattern {
    // 
    constructor() {
        this.grid = [];
        this.xSize = 8;
        this.ySize = 8;
        this.xIndex = 0;
        this.yIndex = 0;
        // @note pattern outPort spec
        // outport will match the index of the midi device in "midiInputDevices"/"midiOuputDevices".
        // If outPort is > 1000, it is a CV output.
        // If outport is > 1100, it is a Gate output. gates are 1100-1107 and stored as midi notes 60-67
        // Using a large index for CV / gate allows many USB midi devices to be connected without fear of overlapping indexes.
        this.outPort = 0;
        for (let i = 0; i < settings.maxXsize; i++) {
            this.grid[i] = [];
            for (let u = 0; u < settings.maxYsize; u++) {
                this.grid[i][u] = {};
                this.grid[i][u].enabled = 0;
                this.grid[i][u].note = 60;
                this.grid[i][u].velocity = 100;
            }
        }
    }
    toggleButton(x, y) {
        console.log(`toggle ${x}, ${y}`)
        if ((x + this.xIndex) < this.xSize && (y + this.yIndex) < this.ySize) {
            if (this.grid[x + this.xIndex][y + this.yIndex].enabled == 1) {
                this.grid[x + this.xIndex][y + this.yIndex].enabled = 0;
            } else {
                this.grid[x + this.xIndex][y + this.yIndex].enabled = 1;
            }
            return true;
        }
        return false;
    }
    increaseX(amnt = 1) {
        if (this.xSize + amnt < settings.maxXsize) {
            this.xSize += amnt;
        }
    }
    decreaseX(amnt = 1) {
        if (this.xSize - amnt > 0) {
            this.xSize -= amnt;
        }
    }
    increaseY(amnt = 1) {
        if (this.ySize + amnt < settings.maxYsize) {
            this.ySize += amnt;
        }
    }
    decreaseY(amnt = 1) {
        if (this.ySize - amnt > 0) {
            this.ySize -= amnt;
        }
    }
}
var gridState = {};
gridState.currentSelectedPattern = 0;
gridState.patterns = [7];
for (let i = 0; i < 7; i++) {
    gridState.patterns[i] = new gridPattern();
}


// ... receive MIDI messages ...
launchpadMidiIn.on('message', (deltaTime, message) => {
    console.log(`m: ${message} d: ${deltaTime}`);
    // console.log(`m: ${message} d: ${deltaTime}`);
    // if (message[0] < 240 && message[2] == 127) {
    //     launchpadMidiOut.sendMessage([message[0], message[1], 87]);
    //     gridState.gridColor

    // }
    // if (message[0] == 144 && message[1] == 17 && message[2] == 127) {
    //     sendColors();
    // }
    if (message[0] == 144 && message[2] == 127) { // grid button
        let gridY = ((message[1] / 10) | 0) - 1;
        let gridX = (message[1] % 10) - 1;
        console.log(gridX, gridY);
        gridState.patterns[gridState.currentSelectedPattern].toggleButton(gridX, gridY);
        copyCurrentPatternGridEnabledToGridColor();
    }
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



function copyCurrentPatternGridEnabledToGridColor() {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            let currentPattern = gridState.patterns[gridState.currentSelectedPattern];
            // console.log(currentPattern.grid[x+currentPattern.xIndex])
            if (currentPattern.grid[x + currentPattern.xIndex][y + currentPattern.yIndex].enabled == 1) {
                gridState.gridColor[x][y].r = 0;
                gridState.gridColor[x][y].g = 0;
                gridState.gridColor[x][y].b = 127;
            } else {
                gridState.gridColor[x][y].r = 0;
                gridState.gridColor[x][y].g = 0;
                gridState.gridColor[x][y].b = 0;
            }
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

copyCurrentPatternGridEnabledToGridColor();

setInterval(() => {
    sendColors();
}, 30);

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
    launchpadMidiIn.closePort();

    // Take the launchpad out of programmer mode.
    launchpadMidiOut.send([240, 0, 32, 41, 2, 13, 14, 0, 247]);
    launchpadMidiOut.closePort();
    // rpio.spiEnd();
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