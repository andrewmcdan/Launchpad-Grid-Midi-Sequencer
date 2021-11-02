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

console.log(midiOutputDevicesNames)

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
        this.outPort = {};
        this.outPort.portIndex = 3;
        this.outPort.channel = 0;
        for (let i = 0; i < settings.maxXsize; i++) {
            this.grid[i] = [];
            for (let u = 0; u < settings.maxYsize; u++) {
                this.grid[i][u] = {};
                this.grid[i][u].enabled = 0;
                this.grid[i][u].note = 60;
                this.grid[i][u].velocity = 100;
                this.grid[i][u].noteLength = 250;
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
    setVelocity(x,y,val = 0){
        if(val < 128){
            this.grid[x + this.xIndex][y + this.yIndex].velocity = val;
        }else{
            this.grid[x + this.xIndex][y + this.yIndex].velocity = 127;
        }
    }
    getVelocity(x,y){
        return this.grid[x + this.xIndex][y + this.yIndex].velocity;
    }
    setNote(x,y,val = 0){
        if(val < 128){
            this.grid[x + this.xIndex][y + this.yIndex].note = val;
        }else{
            this.grid[x + this.xIndex][y + this.yIndex].note = 127;
        }
    }
    getNote(x,y){
        return this.grid[x + this.xIndex][y + this.yIndex].note;
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
}
var gridState = {};
gridState.gridMode = "normal";
gridState.currentSelectedPattern = 0;
gridState.patterns = [7];
for (let i = 0; i < 7; i++) {
    gridState.patterns[i] = new gridPattern();
}


// ... receive MIDI messages ...
let gridButtonDownTime = new Array(64);
let gridButtonUpTime = new Array(64);
let gridButtonsPressed = [0,0,0,0,0,0,0,0,0,0];
let lastPressedGridButton = [0,0];
let tempVelocity = 0;
let tempNote = 0;
let tempOctave = 5;
let tempnoteLength = 1;
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
                    console.log({timePressed});
                    //check for long press
                    if(timePressed>1000){
                        //enter gridNote options mode
                        gridState.gridMode = "gridNoteOpts";
                        clearGrid();
                        drawGridNoteOpts();
                        tempVelocity = gridState.patterns[gridState.currentSelectedPattern].getVelocity(gridX, gridY);
                        tempNote = gridState.patterns[gridState.currentSelectedPattern].getNote(gridX, gridY);
                    }
                }
            }
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
                    clearGrid();
                    copyCurrentPatternGridEnabledToGridColor();
                }
            }
            // console.log({tempVelocity})

            if(message[0] == 144 && message[2] == 127){
                // note-on message
                // check for note buttons on grid
                if(gridY == 1){
                    // @todo play note
                    let naturalNoteOffsets = [0,2,4,5,7,9,11,12];
                    tempNote = naturalNoteOffsets[gridX] + (tempOctave * 12);
                    // console.log({tempNote})
                    playNote(gridState.patterns[gridState.currentSelectedPattern].getOutPort().portIndex,gridState.patterns[gridState.currentSelectedPattern].getOutPort().channel,tempNote,tempVelocity);
                }else if(gridY == 2){
                    let sharpFlatNoteOffsets = [0,1,3,3,6,8,10,12];
                    tempNote = sharpFlatNoteOffsets[gridX] + (tempOctave * 12);
                    playNote(gridState.patterns[gridState.currentSelectedPattern].getOutPort().portIndex,gridState.patterns[gridState.currentSelectedPattern].getOutPort().channel,tempNote,tempVelocity);
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


function clearGrid(){
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {            
            gridState.gridColor[x][y].r = 0;
            gridState.gridColor[x][y].g = 0;
            gridState.gridColor[x][y].b = 0;
        }
    }
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
function playNote(deviceIndex,channel,note,velocity,length = -1){
    // check that this should be sent to midi device
    if(deviceIndex < 1000){
        // check that the midi device is enabled
        if(midiOutputDevicesEnabled[deviceIndex]){
            if(velocity>0){
                // send the note to the midi device
                midiOutputDevices[deviceIndex].sendMessage([0b10010000 | channel,note,velocity]);
                // check for -1 which means that the note gets turned off manually
                if(length != -1){
                    setTimeout(() => {
                        midiOutputDevices[deviceIndex].sendMessage([0b10100000 | channel,note,0]);
                    }, length);
                }
            }else{
                // if velocity is 0, the note should turned off, send note-off
                midiOutputDevices[deviceIndex].sendMessage([0b10100000 | channel,note,0]);
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


function calculateNoteLength(noteLengthIndex,bpm){
    let noteLengthArray = [
        [1/24,  2/24,   3/24,   4/24,   5/24,   6/24,   7/24,   8/24], // sixteenth triplets
        [1/16,  2/16,   3/16,   4/16,   5/16,   6/16,   7/16,   8/16], // sixteenths
        [1/12,  2/12,   3/12,   4/12,   5/12,   6/12,   7/12,   8/12], // triplets
        [1/8,   2/8,    3/8,    4/8,    5/8,    6/8,    7/8,    8/8], // eigths
        [1/6,   2/6,    3/6,    4/6,    5/6,    6/6,    7/6,    8/6], // quater triplets
        [1/4,   2/4,    3/4,    4/4,    5/4,    6/4,    7/4,    8/4], // qarters
        [1/3,   2/3,    3/3,    4/3,    5/3,    6/3,    7/3,    8/3], // half note triplets
        [1/2,   2/2,    3/2,    4/2,    5/2,    6/2,    7/2,    8/2], // half notes
    ];
    let secondsPerMeasure = 60 / ( bpm / 4);
    let noteTime = secondsPerMeasure * noteLengthArray[noteLengthIndex[0],noteLengthIndex[1]];
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