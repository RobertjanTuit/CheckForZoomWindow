const keylights = [
  'keylight-left.office.localdomain',
  'keylight-right.office.localdomain',
];

const powerInterval = 2000;

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
    lights: [{ on: on ? 1 : 0 }],
  };
}

async function put(host, data) {
  let responseGetData;
  const postBody = JSON.stringify(data);
  try {
    const responseGet = await fetch(`http://${host}:9123/elgato/lights`);
    responseGetData = await responseGet.json();
  } catch (error) {
    log(`Error: ^r${error}`);
  }

  try {
    const response = await fetch(`http://${host}:9123/elgato/lights`, {
      method: 'PUT',
      body: postBody,
      headers: { 'Content-type': 'application/json' },
    });

    await response.text();
  } catch (error) {
    log(`Error: ^r${error}`);
    log(`Error get: ^r${responseGetData}`);
    log(`Error set data: ^r${postBody}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setLights(on, brightness = null, temperature = null) {
  if (on) {
    await keyLightsPower(true);
    await sleep(powerInterval);
  }
  log('Setting lights: ' + (on ? 'ON' : 'OFF'));
  for (const keylight of keylights) {
    await put(keylight, getLightData(on, brightness, temperature));
  }
  log('Lights are: ' + (on ? 'ON' : 'OFF'));
  if (!on) {
    await sleep(powerInterval);
    await keyLightsPower(false);
  }
}

let isMeeting = false;
async function zoomMeeting(isMeetingNew) {
  if (isMeetingNew !== isMeeting) {
    isMeeting = isMeetingNew;
    if (isMeeting) {
      log('Zoom Meeting window found --> Turning on lights');
      fixVideoAndCams();
      await setLights(1);
    } else {
      log('Meeting ended --> Turning off lights');
      await setLights(0);
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

async function startWindowCheck() {
  log('Checking for zoom windows...');
  setInterval(async () => {
    var zoomWindows = windowManager.getWindows().filter((window) => {
      return (
        window.getTitle()?.indexOf('Zoom Meeting') !== -1 ||
        window.getTitle()?.indexOf('Meet - ') === 0
      );
    });
    if (zoomWindows.length > 0) {
      await zoomMeeting(true);
    } else {
      await zoomMeeting(false);
    }
  }, 2000);
}

async function keyLightsPower(on) {
  log('Turning key light power: ' + (on ? 'ON' : 'OFF'));
  var entity = { entity_id: 'switch.office_keylights_power_switch' };
  var body = JSON.stringify(entity);
  var response = await fetch(
    `http://homeassistant.local:8123/api/services/switch/${
      on ? 'turn_on' : 'turn_off'
    }`,
    {
      method: 'POST',
      headers: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIyZDYzMDE5NTliOGE0NjVhOTQwZThjNGMwODRiNDcxZiIsImlhdCI6MTczMDgzODY1NCwiZXhwIjoyMDQ2MTk4NjU0fQ.bIVMtBm-iRhApg116qkRNDRYlGJalTzKiXtOZo7-Jd4',
      },
      body: body,
    }
  );
  await response.text();
  log('Light power turned: ' + (on ? 'ON' : 'OFF'));
}

const suspendCheckInterval = 2000;
const suspendCheckMargin = 4000;
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
await setLights(1);
await setLights(0);
await startWindowCheck();
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
