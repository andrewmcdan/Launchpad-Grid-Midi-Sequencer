import os from 'os';
import midi from 'midi';
import spawn from 'child_process';
import path from 'path';
import kill from 'tree-kill';

var midiJsChild;
var timingJsChild;
var midiJs_isStarted = false;
var timingJs_isStarted = false;
var launchpadFound = false;

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
    }
    // if(!launchpadFound && timingJs_isStarted){
    //     process.stdout.write("main.mjs -> Launchpad not found. Killing timing.mjs.\r\n");
    //     kill(timingJsChild.pid);
    //     timingJs_isStarted = false;
    // }
},1000)