import robot from 'robotjs';

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

robot.moveMouse(-2523, 284);
robot.mouseClick();
robot.moveMouse(-1248, 284);
robot.mouseClick();
await sleep(15000);
robot.moveMouse(2336, 907);
robot.mouseClick();
robot.moveMouse(-2523, 210);
robot.mouseClick();
robot.moveMouse(-1248, 210);
robot.mouseClick();
await sleep(20000);
robot.moveMouse(2336, 907);
robot.mouseClick();
