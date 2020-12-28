import { gridForEach } from './helpers.js';
import Game from './game.js';
import Notif from './notif.js';
import {
  BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, BUFFER_ZONE_HEIGHT, 
  BOARD_TOP_Y, AUTO_REPEAT_DELAY, AUTO_REPEAT_FREQ, LEFT_MARGIN,
  RIGHT_MARGIN, LOCKDOWN_TIME, LOCKDOWN_MOVE_LIMIT,
  DIRECTION, STATE, KEY, COLOUR, PEEK_HEIGHT
} from './constants.js';


//auto pause if the focus moves from the game
window.onblur = () => {
  if (g_state === STATE.PLAYING) {
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

const VLARGE = 60;
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

let g_lockdownTimer = 0;
let g_lockdownCounter = 0;
let g_lockdownStarted = false;
let g_lockdownRow = 0;

let highScores = null;
let g_ctx = null;

const g_notifs = [];

window.addEventListener("DOMContentLoaded", setup, false);


async function setup() {
  const gameDiv = document.getElementById("game");
  const usernameDiv = document.createElement("div");
  const canvas = document.createElement("canvas");
  const uname = document.createElement("input");
  const unameLabel = document.createElement("label");
  const storedUname = localStorage.getItem("username");

  unameLabel.innerText = "Username (for high scores): ";
  uname.value = storedUname ? storedUname : "Player";
  uname.id = "username";
  uname.maxLength = 8;
  uname.tabIndex = 1;
  uname.onchange = () => {
    localStorage.setItem("username", uname.value);
  };

  usernameDiv.classList.add("usernameForm");
  usernameDiv.appendChild(unameLabel);
  usernameDiv.appendChild(uname);

  g_ctx = canvas.getContext("2d");
  g_ctx.canvas.width = CELL_SIZE * BOARD_WIDTH + LEFT_MARGIN + RIGHT_MARGIN;
  g_ctx.canvas.height = CELL_SIZE * (BUFFER_ZONE_HEIGHT - 1) + (CELL_SIZE - PEEK_HEIGHT);

  canvas.tabIndex = 2;
  canvas.addEventListener("keydown", keyPressed, false);
  canvas.addEventListener("keyup", keyReleased, false);
  
  gameDiv.appendChild(usernameDiv);
  gameDiv.appendChild(canvas);

  g_ctx.textAlign = CENTER;

  const fontFace = new FontFace("Unispace", 
    "url('fydris/resources/unispace\ rg.ttf')");
  const loadedFont = await fontFace.load();
  document.fonts.add(loadedFont);

  highScores = null;
  
  newGame();
  g_state = STATE.MENU;

  window.requestAnimationFrame(draw);
}


function draw() {
  g_currentTime = performance.now();
  g_frameTime = g_currentTime - g_lastFrameDrawTime;

  g_lastFrameDrawTime += g_frameTime;

  //update the displayed score
  if (g_displayScore < g_game.score) {
    g_displayScore += g_frameTime * g_game.level;

    if (g_displayScore > g_game.score) {
      g_displayScore = g_game.score;
    }
  }

  switch(g_state) {
    case STATE.MENU:
      drawMenu();
      break;

    case STATE.PLAYING:
      //track the time passed
      const timeSinceLastFall = g_lastFrameDrawTime - g_lastFallTime;
      
      //the amount of time until the fall. / by 20 if softDropping
      const fallTime = g_game.fallTime * 1000 / (g_game.softDropping ? 20 : 1);
      
      autoRepeat();
    
      if (g_lockdownStarted) {
        g_lockdownTimer += g_frameTime;
        
        //disable lockdown if on the new lowest row
        if (!g_game.isPieceOnSurface() && g_game.activeTetro.pos.row > g_lockdownRow) {
          g_lockdownStarted = false;
          g_locdownTimer = 0;
        }
      }

      if (g_game.gameOver) {
        g_state = STATE.GAME_OVER;
        let name = document.getElementById("username").value;

        if (name.length < 2)
        {
          name = "Player";
        }
        else if (name.length > 8)
        {
          name = name.substring(0, 8);
        }

        fetch("https://beautiful-mica-sundial.glitch.me/", {
          method: "PUT",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            name: document.getElementById("username").value,
            score: g_game.score
          })
        })
          .then(res => {
            return res.json();
          })
          .then(data => {
            highScores = data;
          });          
      }
      else if (g_lockdownStarted) { //lockdown has higher priority than fall timer
        if (g_lockdownTimer >= LOCKDOWN_TIME || 
          g_lockdownCounter >= LOCKDOWN_MOVE_LIMIT) {
          handleMoveData(g_game.fall())
          g_lockdownStarted = false;
          g_lastFallTime = g_lastFrameDrawTime;
        }
      }
      else if (timeSinceLastFall >= fallTime) { //fall timer
        handleMoveData(g_game.fall());
        updateLockdown();
        g_lastFallTime = g_lastFrameDrawTime;
      }

      drawGame();
      break;

    case STATE.PAUSED:
      drawPauseMenu();
      break;

    case STATE.GAME_OVER:
      drawGameOverScreen(g_game.gameCompleted);
      break;
  }

  window.requestAnimationFrame(draw);
}


function keyPressed(event) {
  //array of keys to ignore default behaviour
  const annoyingKeys = [KEY.SPACE, KEY.UP_ARROW, KEY.DOWN_ARROW];

  //if returnval is false, browser ignores default behaviour like scrolling
  let returnVal = !annoyingKeys.includes(event.keyCode);
  
  //stop keys being logged twice
  if (g_state === STATE.PLAYING) {
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
        updateLockdown();
        g_lockdownTimer = 0;
        break;
      
      case KEY.Q:
        g_game.spin(DIRECTION.ANTI_CLOCKWISE);
        //sound.rotateA.play()
        updateLockdown();
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
  else if (g_state === STATE.MENU) {
    switch (event.keyCode) {
      case KEY.ENTER:
        g_state = STATE.PLAYING;
        break;
    }
  }
  else if (g_state === STATE.PAUSED) {
    switch (event.keyCode) {
      case KEY.P:
        g_state = STATE.PLAYING;
        break;

      case KEY.R:
        newGame();
        break;
    }
  }
  else if (g_state === STATE.GAME_OVER) {
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
    updateLockdown();
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

    if (string !== "") {
      g_notifs.push(new Notif(string, LARGE));
    }
  }
}


function updateLockdown() {
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


function autoRepeat() {
  const direction = g_autoRepeats[0];
  //if a movement input should be repeated
  if (direction) {
    const timeSinceKeyHeld = g_currentTime - g_autoRepeatStartTime;

    if (timeSinceKeyHeld >= AUTO_REPEAT_DELAY) {
      const timeSinceLastRepeat = g_currentTime - g_lastAutoRepeatTime;

      if (timeSinceLastRepeat >= AUTO_REPEAT_FREQ) {
        moveAttempt(direction);
      }
    }
  }
}


function autoRepeatEnd(direction) {
  g_autoRepeats.splice(g_autoRepeats.lastIndexOf(direction), 1);
  
  if (g_autoRepeats.length !== 0) {
    g_game.move(g_autoRepeats[g_autoRepeats.length - 1]);
  }

  g_autoRepeatStartTime = g_currentTime;
} 


function newGame() {
  g_game = new Game();
  g_state = STATE.PLAYING;
  g_displayScore = 0;
  g_lastFallTime = performance.now();
  g_lastFrameDrawTime = g_lastFallTime;
  g_lockdownTimer = 0;
  g_lockdownStarted = false;
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
  g_ctx.clearRect(0, 0, g_ctx.canvas.width, g_ctx.canvas.height);
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
  //start at 1 so don't draw 22nd (top) row
  for(let rowNum = 1; rowNum < BOARD_HEIGHT; ++rowNum) {
    const row = g_game.board[rowNum];
    const y = BOARD_TOP_Y + rowNum * CELL_SIZE;
    
    row.forEach((cell, colNum) => {
      const x = LEFT_MARGIN + colNum * CELL_SIZE;

      if (cell !== 0) {
        setFillStyle(Object.values(COLOUR)[cell]);
      }
      else {
        setFillStyle(COLOUR.NIGHT);
      }
      g_ctx.lineWidth = 2;
      setStrokeStyle(COLOUR.DARK_GRAY);

      g_ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      g_ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    });
  }
}


//draw a tetro on the game board giving the row and position of
//the tetromino
function drawTetroOnBoard(tetroGrid, rowPos, colPos,
  fillColour, strokeColour) {
  
  drawTetro(tetroGrid, 
    LEFT_MARGIN + (colPos * CELL_SIZE),
    BOARD_TOP_Y + CELL_SIZE * rowPos, 1.0, 
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


function drawGameOverScreen(gameCompleted) {
  //redraw the game so the end screen can be updates
  //over the top of it
  drawGame();

  setFillStyle(COLOUR.ALMOST_WHITE);
  g_ctx.textAlign = CENTER;

  const topY = 80;

  if (gameCompleted)
  {
    drawGameText("Contratulations!", centerX, topY, LARGE);
  }
  else
  {
    drawGameText("Game Over", centerX, topY, LARGE);
  }

  if (highScores === null)
  {
    drawGameText("Loading high scores...", centerX, topY + 100, MEDIUM);
  } 
  else
  {
    drawGameText("High Scores", centerX, topY + 100, MEDIUM);
    let rowNum = 0;

    g_ctx.textAlign = LEFT;
    for (const [name, score] of highScores)
    {
      ++rowNum;
      drawGameText(`${name}: ${score}`, centerX - 150, 200 + rowNum * 40, SMALL);
    }
  }

  g_ctx.textAlign = CENTER;
  drawGameText("Press R to restart", centerX, 500, MEDIUM);
}

function drawGameInfo() {
  const leftPos = 20;
  let topPos = 200;
  //goal could be negative if game finished
  const goal = g_game.goal - g_game.stats.rowsCleared;

  g_ctx.textAlign = LEFT;
  drawGameText(`Score:`, leftPos, topPos, SMALL);
  topPos += 50;
  drawGameText(`${Math.floor(g_displayScore)}`, leftPos + 20, topPos, LARGE);
  topPos += 60;
  drawGameText(`Level: ${g_game.level}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`Goal: ${g_game.gameCompleted ? "Done" : goal}`, leftPos, topPos, SMALL);

  topPos += 60;

  drawGameText(`Lines: ${g_game.stats.rowsCleared}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`Tetrises: ${g_game.stats.tetrises}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`T-Spin Minis: ${g_game.stats.tSpinMinis}`, leftPos, topPos, SMALL);
  topPos += 30;
  drawGameText(`T-Spins: ${g_game.stats.tSpins}`, leftPos, topPos, SMALL);
}