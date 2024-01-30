const keylights = ['keylight-left.office.localdomain', 'keylight-right.office.localdomain'];

import { windowManager } from 'node-window-manager';
import fetch from 'node-fetch';
import robot from "robotjs";

function getLightData(on, brightness = null, temperature = null)
{
    return {
        numberOfLights: 1, lights: [{on: on}]
    }
}

async function put(host, data)
{
    const postBody = JSON.stringify(data);
    const response = await fetch(
        `http://${host}:9123/elgato/lights`, 
        {
            method: 'PUT', 
            body: postBody, 
            headers: { 'Content-type': 'application/json' }
        });

    await response.text();
}

async function setLights(on, brightness = null, temperature = null)
{
    for (const keylight of keylights) {
        await put(keylight, getLightData(on, brightness, temperature));
    }
}


let isMeeting = false;
function zoomMeeting(isMeetingNew) {
    if (isMeetingNew !== isMeeting) {
        isMeeting = isMeetingNew;
        if (isMeeting) {
            console.log('Zoom Meeting window found --> Turning on lights');
            fixVideoAndCams();
            setLights(1);
        }   
        else {
            console.log('Meeting ended --> Turning off lights');
            setLights(0);
        }
    }
};

function fixVideoAndCams() {
    console.log('Fixing video and cams...');
    robot.keyTap('j', ['control', 'alt', 'shift']);
    robot.keyTap('l', ['control', 'alt', 'shift']);
    setTimeout(() => {
        robot.keyTap('j', ['control', 'alt', 'shift']);
        robot.keyTap('k', ['control', 'alt', 'shift']);
    }, 2000);
}

function startWindowCheck()
{
    console.log('Checking for zoom windows...');
    setInterval(() => {
        var zoomWindows = windowManager.getWindows().filter((window) => {
        return window.getTitle()?.indexOf('Zoom Meeting') !== -1;
        });
        if (zoomWindows.length > 0) {
            zoomMeeting(true);
        }
        else {
            zoomMeeting(false);
        }
    }, 2000);
}

const suspendCheckInterval = 2000;
const suspendCheckMargin = 1000;
let ts;
function startSuspendSleepCheck() {
    console.log('Checking for suspend/sleep/hibernate...');
    ts = new Date().getTime();
    suspendSleepCheckLoop(ts);
}

function suspendSleepCheckLoop(ts) {
    setTimeout(() => {
        let newTs = new Date().getTime();
        const tsDiff = newTs - ts;
        if (tsDiff > suspendCheckInterval + suspendCheckMargin) {
            console.log('System is waking up --> Turning on lights');
            setTimeout(fixVideoAndCams, 6000);
        }
        ts = newTs;
        suspendSleepCheckLoop();
    }, suspendCheckInterval);
    return ts;
}


startWindowCheck();
startSuspendSleepCheck();
//process.stdin.setRawMode( true );
//process.stdin.setEncoding( 'utf8' );
// on any data into stdin
process.stdin.on( 'data', function( key ){
  // ctrl-c ( end of text )
  if ( key === '\u0003' ) {
    process.exit();
  }
  // write the key to stdout all normal like
  process.stdout.write( key );
});
