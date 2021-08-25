// NodeJS projet for monoprice grid controller project

// setup midi devices

// setup globals

gridState = {};
gridState.enabledPoints = [];
for (let i = 0; i < 8; i++) {
    gridState.enabledPoints[i] = [];
    for(let u = 0; u < 8; u++){
        gridState.enabledPoints[i][u] = {};
        gridState.enabledPoints[i][u].bool = true;
        gridState.enabledPoints[i][u].color = 0;
    }
}
gridState.currentXstep = 0;
gridState.currentYstep = 0;
gridState.tempo = 120; // beat per minute
gridState.XstepSize = 1; // steps per beat. 0.5 would be eigth notes. 1 is quarter notes.
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
    let beatTime = 1 / beatsPerSecond;
    let timeSincePlayX = timeCurrent - timePlayX;
    let timeSincePlayY = timeCurrent - timePlayY;
    // console.log("math: " + (beatTime * gridState.currentXstep * gridState.XstepSize * 1000));
    // console.log("X: " ,beatTime,gridState.currentXstep,gridState.XstepSize, timeSincePlayX);
    // console.log("Y: ", beatTime,gridState.currentYstep,gridState.XstepSize, timeSincePlayY)
    if (beatTime * gridState.currentXstep * gridState.XstepSize * 1000 < timeSincePlayX) {
        gridState.currentXstep++;
        firstIterationOfThisStepX = true;
        if(gridState.currentXstep>7){
            gridState.currentXstep=0;
            timePlayX = Date.now();
        }
    }
    if (beatTime * gridState.currentYstep * gridState.YstepSize  * 1000 < timeSincePlayY) {
        gridState.currentYstep++;
        firstIterationOfThisStepY = true;
        if(gridState.currentYstep>7){
            gridState.currentYstep=0;
            timePlayY = Date.now();
        }
    }
    if (gridState.enabledPoints[gridState.currentXstep][gridState.currentYstep].bool && (firstIterationOfThisStepX||firstIterationOfThisStepY)) {
        console.log(timeCurrent - timePlayX);
        console.log(timeCurrent - timePlayY);
        console.log("step: " + gridState.currentXstep + " " + gridState.currentYstep);
        firstIterationOfThisStep = false;
        // play note
    }
    if(firstIterationOfThisStepX||firstIterationOfThisStepY)console.table(gridState.enabledPoints);
}

setInterval(stepHandler, 1);

// console.log(gridState)


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