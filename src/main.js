import { gridForEach } from './helpers.js';
import Game from './game.js';
import Notif from './notif.js';
import {
  BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, BUFFER_ZONE_HEIGHT, 
  NEXT_SIZE, AUTO_REPEAT_DELAY, AUTO_REPEAT_FREQ, LEFT_MARGIN,
  RIGHT_MARGIN, LOCKDOWN_TIME, LOCKDOWN_MOVE_LIMIT,
  DIRECTION, STATE, KEY, COLOUR, MOVE
} from './constants.js';


//auto pause if the focus moves from the game
window.onblur = () => {
  if (g_state == STATE.PLAYING) {
    g_state = STATE.PAUSED;
  }
};

//fix for the weird p5js thing where returning
//false for a key doesn't stop default behaviour
//if it's held down. Look into this
window.addEventListener("keydown", e => {
  // space and arrow keys
  if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
      e.preventDefault();
  }
}, false);

const VLARGE = 80;
const LARGE = 45;
const MEDIUM = 30;
const SMALL = 20;

const CENTER = "center";
const LEFT = "left";

const centerX = LEFT_MARGIN + 
  (BOARD_WIDTH * CELL_SIZE) / 2;

let g_lastFallTime = 0;
let g_lastFrameDrawTime = 0;
let g_state = STATE.MENU;
let g_displayScore = 0;
let g_currentTime = 0;
let g_frameTime = 0;
let g_game = null;

const g_autoRepeats = [];
let g_autoRepeatStartTime = 0;
let g_lastAutoRepeatTime = 0;

let g_startTime = 0;
let g_lockdownTimer = 0;
let g_lockdownCounter = 0;
let g_lockdownStarted = false;
let g_lockdownRow = 0;

const g_notifs = [];

let g_ctx = null;

function getTimeSinceStart() {
  return performance.now() - g_startTime;
}

//window.addEventListener("resize", windowResized, false);
window.addEventListener("DOMContentLoaded", setup, false);
window.addEventListener("keydown", keyPressed, false);
window.addEventListener("keyup", keyReleased, false);


async function setup() {
  const div = document.getElementById("game");
  const canvas = document.createElement("canvas");

  g_ctx = canvas.getContext("2d");

  g_ctx.canvas.width = CELL_SIZE * BOARD_WIDTH + LEFT_MARGIN + RIGHT_MARGIN;
  g_ctx.canvas.height = CELL_SIZE * (BOARD_HEIGHT - BUFFER_ZONE_HEIGHT);

  div.appendChild(canvas);

  g_ctx.textAlign = CENTER;
  drawGameText("Loading...", centerX, 200, LARGE);

  const fontFace = new FontFace("Unispace", 
    "url('../resources/unispace\ rg.ttf')");
  const loadedFont = await fontFace.load();
  document.fonts.add(loadedFont);
  
  g_startTime = performance.now();
  g_lastFallTime = getTimeSinceStart();
  g_game = new Game();

  window.requestAnimationFrame(draw);
}


function draw() {
  g_currentTime = Math.floor(getTimeSinceStart())
  g_frameTime = g_currentTime - g_lastFrameDrawTime

  g_lastFrameDrawTime += g_frameTime

  //update the displayed score
  if (g_displayScore < g_game.score) {
    g_displayScore += g_frameTime * g_game.level

    if (g_displayScore > g_game.score) {
      g_displayScore = g_game.score
    }
  }

  switch(g_state) {
    case STATE.MENU:
      drawMenu()
      break

    case STATE.PLAYING:
      //track the time passed
      const timeSinceLastFall = g_lastFrameDrawTime - g_lastFallTime
      
      //the amount of time until the fall. / by 20 if softDropping
      const fallTime = g_game.fallTime * 1000 / (g_game.softDropping ? 20 : 1)
      
      autoRepeat(g_currentTime)
    
      if (g_lockdownStarted) {
        g_lockdownTimer += g_frameTime
        
        //disable lockdown if on the new lowest row
        if (!g_game.isPieceOnSurface() && g_game.activeTetro.pos.row > g_lockdownRow) {
          g_lockdownStarted = false
        }
      }

      if (g_game.gameOver) {
        g_state = g_game.gameCompleted ? STATE.GAME_END : STATE.GAME_OVER
      }
      else if (g_lockdownStarted) { //lockdown has higher priority than fall timer
        if (g_lockdownTimer >= LOCKDOWN_TIME || 
          g_lockdownCounter >= LOCKDOWN_MOVE_LIMIT) {
          handleMoveData(g_game.fall())
          g_lockdownStarted = false
          g_lastFallTime = g_lastFrameDrawTime
        }
      }
      else if (timeSinceLastFall >= fallTime) { //fall timer
        handleMoveData(g_game.fall())
        checkLockdown()
        g_lastFallTime = g_lastFrameDrawTime
      }

      drawGame()
      break

    case STATE.PAUSED:
      drawPauseMenu()
      break

    case STATE.GAME_OVER:
      drawGameOverScreen()
      break

    case STATE.GAME_END:
      drawGameEndScreen()
      break
  }

  window.requestAnimationFrame(draw);
}


function keyPressed(event) {
  //array of keys to ignore default behaviour
  const annoyingKeys = [KEY.SPACE, KEY.UP_ARROW, KEY.DOWN_ARROW];

  //if returnval is false, browser ignores default behaviour like scrolling
  let returnVal = !annoyingKeys.includes(event.keyCode);
  
  //stop keys being logged twice
  if (g_state == STATE.PLAYING) {
    //for non-ascii keys
    switch(event.keyCode) { 
      case KEY.A:
      case KEY.LEFT_ARROW:
        moveAttempt(DIRECTION.LEFT);
        break;
  
      case KEY.D:
      case KEY.RIGHT_ARROW:
        moveAttempt(DIRECTION.RIGHT);
        break;
  
      case KEY.S:
      case KEY.DOWN_ARROW:
        g_game.softDropping = true;
        break;

      case KEY.E:
      case KEY.W:
      case KEY.UP_ARROW:
        g_game.spin(DIRECTION.CLOCKWISE);
        //sound.rotateC.play()
        checkLockdown();
        break;
      
      case KEY.Q:
        g_game.spin(DIRECTION.ANTI_CLOCKWISE);
        //sound.rotateA.play()
        checkLockdown();
        break;
      
      case KEY.C:
        const holdWorked = g_game.holdTetro();
        
        if (holdWorked) {
          //sound.hold.play()
          g_lockdownStarted = false;
          g_lastFallTime = g_currentTime;
        }
        break;
      
      case KEY.P:
        g_state = STATE.PAUSED;
        break;
      
      case KEY.SPACE:
        handleMoveData(g_game.hardDrop());
        g_lastFallTime = g_currentTime;
        g_lockdownStarted = false;
        break;
    }
  }
  else if (g_state == STATE.MENU) {
    switch (event.keyCode) {
      case KEY.ENTER:
        g_state = STATE.PLAYING;
        break;
    }
  }
  else if (g_state == STATE.PAUSED) {
    switch (event.keyCode) {
      case KEY.P:
        g_state = STATE.PLAYING;
        break;

      case KEY.R:
        newGame();
        break;
    }
  }
  else if (g_state == STATE.GAME_OVER) {
    switch(event.keyCode) {
      case KEY.R:
        newGame();
        break;
    }
  }
  else if (g_state == STATE.GAME_END) {
    switch(event.keyCode) {
      case KEY.R:
        newGame();
        break;
    }
  }

  return returnVal;
}


function keyReleased(event) {
  switch(event.keyCode) {
    case KEY.A:
    case KEY.LEFT_ARROW:
      autoRepeatEnd(DIRECTION.LEFT);
      break;

    case KEY.S:
    case KEY.DOWN_ARROW:
      g_game.softDropping = false;
      break;

    case KEY.D:
    case KEY.RIGHT_ARROW:
      autoRepeatEnd(DIRECTION.RIGHT);
      break;
  }
}


function moveAttempt(direction) {
  //only update lockdown if the move was successful, otherwise
  //this will tick down the lockdownCounter even when the piece
  //isn't moving, resulting in an unexpected place
  if (g_game.move(direction)) {
    checkLockdown();
  }

  //sound.move.play()

  if (!g_autoRepeats.includes(direction)) {
    g_autoRepeats.unshift(direction);
    g_autoRepeatStartTime = g_currentTime;
  }
  else {
    g_lastAutoRepeatTime = g_currentTime;
  }
}


function handleMoveData(moveData) {
  if (moveData) {
    //attempt to make the piece fall and record the move
    const {move, rows, backToBack} = moveData;
    const moveName = ["", "T-Spin ", "T-Spin Mini "][move];
    const rowName = ["", "Single", "Double", "Triple", "Tetris"][rows];
    let string = `${backToBack ? "Back to Back\n" : ""} ${moveName}${rowName}`.trim();
  
    // if (move === 0) {
    //   if (rows === 4) {
    //     (backToBack ? sound.tetris : sound.tetrisBTB).play()
    //   }
    //   else if (rows > 0){
    //     [sound.single, sound.double, sound.triple][rows - 1].play()
    //   }
    // } else {
    //   (backToBack ? sound.tSpin : sound.tSpinBTB).play()
    // }

    if (string != "") {
      g_notifs.push(new Notif(string, LARGE));
    }
  }
}


function checkLockdown() {
  if (g_lockdownStarted) {
    g_lockdownTimer = 0;
    ++g_lockdownCounter;
  }
  else if (g_game.isPieceOnSurface()) {
    g_lockdownStarted = true;
    g_lockdownCounter = 0;
    g_lockdownTimer = 0;
    g_lockdownRow = g_game.activeTetro.pos.row;
  }
}


function autoRepeat(time) {
  const direction = g_autoRepeats[0];
  //if a movement input should be repeated
  if (direction) {
    const timeSinceKeyHeld = time - g_autoRepeatStartTime;

    if (timeSinceKeyHeld >= AUTO_REPEAT_DELAY) {
      const timeSinceLastRepeat = time - g_lastAutoRepeatTime;

      if (timeSinceLastRepeat >= AUTO_REPEAT_FREQ) {
        moveAttempt(direction);
      }
    }
  }
}


function autoRepeatEnd(direction) {
  g_autoRepeats.splice(g_autoRepeats.lastIndexOf(direction), 1);
  
  if (g_autoRepeats.length != 0) {
    g_game.move(g_autoRepeats[g_autoRepeats.length - 1]);
  }

  g_autoRepeatStartTime = g_currentTime;
} 


function newGame() {
  g_game = new Game();
  g_state = STATE.PLAYING;
  g_displayScore = 0;
}


function setFillStyle(colour) {
  g_ctx.fillStyle = `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;
}


function setStrokeStyle(colour) {
  g_ctx.strokeStyle = `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;
}


function fillBG(colour) {
  const tempCol = g_ctx.fillStyle;
  setFillStyle(colour);
  g_ctx.fillRect(0, 0, g_ctx.canvas.width, g_ctx.canvas.height);
  g_ctx.fillStyle = tempCol;
}


function drawGameText(t, x, y, size = MEDIUM) {
  setFillStyle(COLOUR.ALMOST_WHITE);
  setStrokeStyle(COLOUR.ALMOST_BLACK);
  g_ctx.lineWidth = 8;
  g_ctx.font = `${size}px Unispace`;
  g_ctx.strokeText(t, x, y);
  g_ctx.fillText(t, x, y);
}


function drawGame() {
  fillBG(COLOUR.BACKGROUND);

  drawBoard();
    
  //active tetro, use tetro colour with dark stroke
  drawTetroOnBoard(g_game.activeTetro.grid,
    g_game.activeTetro.pos.row,
    g_game.activeTetro.pos.col, 
    g_game.activeTetro.tetro.colour, COLOUR.NIGHT
  );

  //ghost, just stroke with tetro colour
  drawTetroOnBoard(g_game.activeTetro.grid,
    g_game.activeTetro.pos.row + g_game.ghostOffset,
    g_game.activeTetro.pos.col, 
    null, g_game.activeTetro.tetro.colour
  );

  drawHold();
  drawNext();
  drawGameInfo();
  updateAndDrawNotif();
}


function drawBoard() {
  for(let rowNum = BUFFER_ZONE_HEIGHT; rowNum < BOARD_HEIGHT; ++rowNum) {
    const row = g_game.board[rowNum]

    row.forEach((cell, colNum) => {
      if (cell != 0) {
        setFillStyle(Object.values(COLOUR)[cell]);
      }
      else {
        setFillStyle(COLOUR.NIGHT);
      }

      g_ctx.fillRect(LEFT_MARGIN + colNum * CELL_SIZE, 
        (rowNum - BUFFER_ZONE_HEIGHT) * CELL_SIZE,
        CELL_SIZE, CELL_SIZE
      );

      g_ctx.lineWidth = 2;
      setStrokeStyle(COLOUR.DARK_GRAY);
      g_ctx.strokeRect(LEFT_MARGIN + colNum * CELL_SIZE, 
        (rowNum - BUFFER_ZONE_HEIGHT) * CELL_SIZE,
        CELL_SIZE, CELL_SIZE
      );
    });
  }
}


//draw a tetro on the game board giving the row and position of
//the tetromino
function drawTetroOnBoard(tetroGrid, rowPos, colPos,
  fillColour, strokeColour) {
  
  g_ctx.lineWidth = 2;

  drawTetro(tetroGrid, 
    LEFT_MARGIN + (colPos * CELL_SIZE),
    CELL_SIZE * (rowPos - BUFFER_ZONE_HEIGHT), 1.0, 
    fillColour, strokeColour
  );
}


//draw a tetro anywhere on canvas, for example 
function drawTetro(grid, xPos, yPos, scale = 1.0,
  fillColour, strokeColour = COLOUR.ALMOST_BLACK) {
  const size = CELL_SIZE * scale;

  gridForEach(grid, (cell, rowNum, colNum) => {
    if (cell) {
      if (fillColour) {
        setFillStyle(fillColour);
        g_ctx.fillRect(xPos + colNum * size,
          yPos + rowNum * size,
          size, size);
      }

      if (strokeColour) {
        g_ctx.lineWidth = 3;
        setStrokeStyle(strokeColour);
        g_ctx.strokeRect(xPos + colNum * size,
          yPos + rowNum * size,
          size, size);
      }
    }
  });
}


function updateAndDrawNotif() {
  if (g_notifs[0]) {
    g_notifs[0].update(g_frameTime);

    if (g_notifs[0].finished) {
      g_notifs.shift();
    }
    else {
      g_notifs[0].text.split('\n').forEach((line, index) => {
        g_ctx.textAlign = CENTER;
        drawGameText(line, centerX, 100 + index * 60, g_notifs[0].size)
      });
    }
  }
}


function drawNext() {
  const leftPos = 600;
  drawGameText("Next", leftPos, 40, MEDIUM);

  g_game.next.forEach((tetro, queuePos) => {
    const rowPos = 70 + (queuePos * 3) * CELL_SIZE;
    drawTetro(tetro.rotations[0], leftPos, rowPos, 1.0, tetro.colour);
  });
}


function drawHold() {
  const hold = g_game.holdSlot;

  drawGameText("Hold", 80, 40, MEDIUM);

  if (hold) {
    drawTetro(hold.rotations[0], 80, 80, 1.0, hold.colour);
  }
}


function drawMenu() {
  fillBG(COLOUR.BACKGROUND);

  setFillStyle(COLOUR.LIGHT_GRAY);
  g_ctx.textAlign = CENTER;
  drawGameText("Fydris", centerX, 120, VLARGE);
  drawGameText("Press ENTER to start", centerX, 500, LARGE);

  g_ctx.textAlign = LEFT;
  drawGameText("Controls", 150, 220, MEDIUM);
  drawGameText("Move tetro: A/D or LEFT/RIGHT arrows", 150, 260, SMALL);
  drawGameText("Spin tetro: Q/E or UP arrow", 150, 285, SMALL);
  drawGameText("Hold: C", 150, 310, SMALL);
  drawGameText("Instant drop: SPACE", 150, 335, SMALL);
  drawGameText("Pause/resume: P", 150, 360, SMALL);
}


function drawPauseMenu() {
  g_ctx.textAlign = CENTER;

  drawGameText("Paused", centerX, 150, LARGE);

  g_ctx.textAlign = LEFT;
  drawGameText("P: Unpause", 270, 200, MEDIUM);
  drawGameText("R: Restart", 270, 240, MEDIUM);
}


function drawGameOverScreen() {
  g_ctx.textAlign = CENTER;
  setFillStyle(COLOUR.ALMOST_WHITE)
  drawGameText("Game Over", centerX, 150, LARGE)
  drawGameText("Press R to restart", centerX, 200, MEDIUM)
}


function drawGameEndScreen() {
  textAlign(CENTER)
  drawGameText("Contratulations!", centerX, 150, LARGE);
  drawGameText("Press R to restart", centerX, 200, MEDIUM);
}


function drawGameInfo() {
  const leftPos = 20;
  let topPos = 200;

  g_ctx.textAlign = LEFT;
  drawGameText(`Score:`, leftPos, topPos, SMALL);
  topPos += 50;
  drawGameText(`${g_displayScore}`, leftPos + 20, topPos, LARGE);
  topPos += 60;
  drawGameText(`Level: ${g_game.level}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`Goal: ${g_game.goal - g_game.stats.rowsCleared}`, leftPos, topPos, SMALL);

  topPos += 60;

  drawGameText(`Lines: ${g_game.stats.rowsCleared}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`Tetrises: ${g_game.stats.tetrises}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`T-Spin Minis: ${g_game.stats.tSpinMinis}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`T-Spins: ${g_game.stats.tSpins}`, leftPos, topPos, SMALL);
}