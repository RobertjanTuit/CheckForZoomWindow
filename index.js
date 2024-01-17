const keylights = ['keylight-left.office.localdomain', 'keylight-right.office.localdomain'];

import { windowManager } from 'node-window-manager';
import fetch from 'node-fetch';

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
            setLights(1);
        }   
        else {
            console.log('Meeting ended --> Turning off lights');
            setLights(0);
        }
    }
};

function startWindowCheck()
{
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

startWindowCheck();
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