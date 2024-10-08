const keylights = [
  'keylight-left.office.localdomain',
  'keylight-right.office.localdomain',
];

import { windowManager } from 'node-window-manager';
import fetch from 'node-fetch';
import robot from 'robotjs';
import lockYourWindows from 'lock-your-windows';
import stringKit from 'string-kit';
import moment from 'moment/moment.js';

function log(msg, category = '') {
  let log = `^gCFZW^w | ^y${moment().format('HH:mm:ss.SSS')}^w | `;
  if (typeof msg === 'object') {
    msg = JSON.stringify(msg);
  }
  if (category != '') {
    log += ` ^b${category}^w | `;
  }

  log += msg;

  console.log(stringKit.format(log));
}

function getLightData(on, brightness = null, temperature = null) {
  return {
    numberOfLights: 1,
    lights: [{ on: on }],
  };
}

async function put(host, data) {
  try {
    const postBody = JSON.stringify(data);
    const response = await fetch(`http://${host}:9123/elgato/lights`, {
      method: 'PUT',
      body: postBody,
      headers: { 'Content-type': 'application/json' },
    });

    await response.text();
  } catch (error) {
    log(`Error: ^r${error}`);
  }
}

async function setLights(on, brightness = null, temperature = null) {
  for (const keylight of keylights) {
    put(keylight, getLightData(on, brightness, temperature));
  }
  log('Lights: ' + (on ? 'ON' : 'OFF'));
}

let isMeeting = false;
function zoomMeeting(isMeetingNew) {
  if (isMeetingNew !== isMeeting) {
    isMeeting = isMeetingNew;
    if (isMeeting) {
      log('Zoom Meeting window found --> Turning on lights');
      fixVideoAndCams();
      setLights(1);
    } else {
      log('Meeting ended --> Turning off lights');
      setLights(0);
    }
  }
}

let fixVideoAndCamsTimeout;
function fixVideoAndCams() {
  clearTimeout(fixVideoAndCamsTimeout);
  if (lockYourWindows.isLocked()) {
    fixVideoAndCamsTimeout = setTimeout(fixVideoAndCams, 1000);
    log(
      'System is locked --> not fixing cams and video yet, checking again in 1s.'
    );
    return;
  }
  log('Fixing video and cams...');
  robot.keyTap('l', ['control', 'shift']); // configured in obs to hide cam and layer
  robot.keyTap('f1', ['control']); // vociemeter engine restart
  setTimeout(() => {
    robot.keyTap('k', ['control', 'shift']); // configured in obs to show cam and switch to video layer.
  }, 2000);
}

function startWindowCheck() {
  log('Checking for zoom windows...');
  setInterval(() => {
    var zoomWindows = windowManager.getWindows().filter((window) => {
      return (
        window.getTitle()?.indexOf('Zoom Meeting') !== -1 ||
        window.getTitle()?.indexOf('Meet - ') === 0
      );
    });
    if (zoomWindows.length > 0) {
      zoomMeeting(true);
    } else {
      zoomMeeting(false);
    }
  }, 2000);
}

const suspendCheckInterval = 2000;
const suspendCheckMargin = 1000;
let ts;
function startSuspendSleepCheck() {
  log('Checking for resume from suspend/sleep/hibernate...');
  ts = new Date().getTime();
  suspendSleepCheckLoop();
}

let locked = false;
let systemWake = 0;
function suspendSleepCheckLoop() {
  setTimeout(() => {
    if (lockYourWindows.isLocked() != locked) {
      locked = lockYourWindows.isLocked();
      fixVideoAndCams();
    }
    let newTs = new Date().getTime();
    const tsDiff = newTs - ts;
    if (
      tsDiff > suspendCheckInterval + suspendCheckMargin &&
      newTs - systemWake > 30000
    ) {
      systemWake = newTs;
      log('System is waking up...');
      fixVideoAndCams();
    }
    ts = newTs;
    suspendSleepCheckLoop();
  }, suspendCheckInterval);
  return ts;
}

log('--------------------------------------');
log('| Starting CFZW v1.0 ');
log('--------------------------------------');
await setLights(0);
startWindowCheck();
startSuspendSleepCheck();
robot.keyTap('k', ['control']); // vociemeter engine restart
// process.stdin.setRawMode( true );
// process.stdin.setEncoding( 'utf8' );
// on any data into stdin
process.stdin.on('data', function (key) {
  // ctrl-c ( end of text )
  if (key === '\u0003') {
    process.exit();
  }
  process.stdout.write(key);
});
