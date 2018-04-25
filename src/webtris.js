import { gridForEach } from './helpers'
import Game from './game'
import {
  BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, BUFFER_ZONE_HEIGHT, 
  NEXT_SIZE, AUTO_REPEAT_DELAY, AUTO_REPEAT_FREQ, LEFT_MARGIN,
  RIGHT_MARGIN, LOCKDOWN_TIME, LOCKDOWN_MOVE_LIMIT,
  DIRECTION, STATE, KEY, COLOUR, MOVE
} from './constants'


//auto pause if the page is not visibile
document.addEventListener("visibilitychange", function() {
  if (state == STATE.PLAYING) {
    state = STATE.PAUSED
  }
})


//fix for the weird p5js thing where returning
//false for a key doesn't stop default behaviour
//if it's held down. Look into this
window.addEventListener("keydown", function(e) {
  // space and arrow keys
  if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
      e.preventDefault();
  }
}, false)

const XLARGE = 80
const LARGE = 65
const MEDIUM = 50
const SMALL = 35

let lastFallTime = 0
let lastFrameDrawTime = 0
let state = STATE.MENU
let displayScore = 0
let currentTime = 0
let game = null

const autoRepeats = []
let autoRepeatStartTime = 0
let lastAutoRepeatTime = 0

let lockdownTimer = 0
let lockdownCounter = 0
let lockdownStarted = false
let lockdownRow = 0

let font = null

//DEBUG
let lastMove = ""


function preload() {
  font = loadFont("./resources/CT ProLamina.ttf")
}


function setup() {
  const canvas = createCanvas(CELL_SIZE * BOARD_WIDTH + LEFT_MARGIN + RIGHT_MARGIN, 
                              CELL_SIZE * (BOARD_HEIGHT - BUFFER_ZONE_HEIGHT ))
  
  canvas.parent("game")

  textFont(font)
  strokeWeight(2)

  lastFallTime = millis()
  game = new Game()
}


function draw() {
  currentTime = Math.floor(millis())
  const frameTime = currentTime - lastFrameDrawTime

  lastFrameDrawTime += frameTime

  //update the displayed score
  if (displayScore < game.score) {
    displayScore += frameTime * game.level

    if (displayScore > game.score) {
      displayScore = game.score
    }
  }

  switch(state) {
    case STATE.MENU:
      drawMenu()
      break

    case STATE.PLAYING:
      autoRepeat(currentTime)
      //track the time passed
      const timeSinceLastFall = lastFrameDrawTime - lastFallTime
    
      //the amount of time until the fall. Should be 20x quicker
      //if game.softDropping
      let fallTime = game.fallTime * 1000 / (game.softDropping ? 20 : 1)

      if (lockdownStarted) {
        lockdownTimer += frameTime
        
        //disable lockdown if on the new lowest row
        if (!game.isPieceOnSurface() && game.activeTetro.pos.row > lockdownRow) {
          lockdownStarted = false
        }
      }

      if (game.gameOver) {
        state = STATE.GAME_OVER
      }
      else if (lockdownStarted) { //lockdown has higher priority than fall timer
        if (lockdownTimer >= LOCKDOWN_TIME || 
          lockdownCounter >= LOCKDOWN_MOVE_LIMIT) {
          handleMoveData(game.fall())
          lockdownStarted = false
          lastFallTime = lastFrameDrawTime
        }
      }
      else if (timeSinceLastFall >= fallTime) { //fall timer
        handleMoveData(game.fall())
        checkLockdown()
        lastFallTime = lastFrameDrawTime
      }

      drawGame()
      break

    case STATE.PAUSED:
      drawPauseMenu()
      break

    case STATE.GAME_OVER:
      drawEndScreen()
      break
  }
}


function keyPressed() {
  //array of keys to ignore default behaviour
  const annoyingKeys = [KEY.SPACE, UP_ARROW, DOWN_ARROW]
  //if returnval is false, browser ignores default behaviour like scrolling
  let returnVal = !annoyingKeys.includes(keyCode)
  
  //stop keys being logged twice
  if (state == STATE.PLAYING) {
    //for non-ascii keys
    switch(keyCode) { 
      case KEY.A:
      case LEFT_ARROW:
        game.move(DIRECTION.LEFT)

        autoRepeats.unshift(DIRECTION.LEFT)
        autoRepeatStartTime = currentTime
        checkLockdown()
        break
  
      case KEY.D:
      case RIGHT_ARROW:
        game.move(DIRECTION.RIGHT)

        autoRepeats.unshift(DIRECTION.RIGHT)
        autoRepeatStartTime = currentTime
        checkLockdown()
        break
  
      case KEY.S:
      case DOWN_ARROW:
        game.softDropping = true
        break

      case KEY.E:
      case KEY.W:
      case UP_ARROW:
        game.spin(DIRECTION.CLOCKWISE)
        checkLockdown()
        break
      
      case KEY.Q:
        game.spin(DIRECTION.ANTI_CLOCKWISE)
        checkLockdown()
        break
      
      case KEY.C:
        const holdWorked = game.holdTetro()
        
        if (holdWorked) {
          lastFallTime = currentTime
        }
        break
      
      case KEY.P:
        state = STATE.PAUSED
        break
      
      case KEY.SPACE:
        handleMoveData(game.hardDrop())
        lastFallTime = currentTime
        lockdownStarted = false
        break
    }
  }
  else if (state == STATE.MENU) {
    switch (keyCode) {
      case ENTER:
        state = STATE.PLAYING
        break
    }
  }
  else if (state == STATE.PAUSED) {
    switch (keyCode) {
      case KEY.P:
        state = STATE.PLAYING
        break

      case KEY.R:
        newGame()
        break
    }
  }
  else if (state == STATE.GAME_OVER) {
    switch(keyCode) {
      case KEY.R:
        newGame()
        break
    }
  }

  return returnVal
}


function keyReleased() {
  const autoRepeatKeys = [KEY.A, KEY.D, LEFT_ARROW, RIGHT_ARROW]

  switch(keyCode) {
    case KEY.A:
    case LEFT_ARROW:
      autoRepeatEnd(DIRECTION.LEFT)
      break

    case KEY.S:
    case DOWN_ARROW:
      game.softDropping = false
      break

    case KEY.D:
    case RIGHT_ARROW:
      autoRepeatEnd(DIRECTION.RIGHT)
      break
  }
}


function handleMoveData(moveData) {
  if (moveData) {
    //attempt to make the piece fall and record the move
    const {move, rows, backToBack} = moveData
    const moveName = ["", "T-Spin ", "T-Spin Mini "][move]
    const rowName = ["", "Single", "Double", "Triple", "Tetris"][rows]
    let string = `${backToBack ? "Back to Back" : ""} ${moveName}${rowName}`.trim()
  
    if (string != "") {
      lastMove = string
    }
  }
}


function checkLockdown() {
  if (lockdownStarted) {
    lockdownTimer = 0
    ++lockdownCounter
  }
  else if (game.isPieceOnSurface()) {
    lockdownStarted = true
    lockdownCounter = 0
    lockdownTimer = 0
    lockdownRow = game.activeTetro.pos.row
  }
}


function autoRepeat(time) {
  const direction = autoRepeats[0]
  //if a movement input should be repeated
  if (direction) {
    const timeSinceKeyHeld = time - autoRepeatStartTime

    if (timeSinceKeyHeld >= AUTO_REPEAT_DELAY) {
      const timeSinceLastRepeat = time - lastAutoRepeatTime

      if (timeSinceLastRepeat >= AUTO_REPEAT_FREQ) {
        lastAutoRepeatTime = time

        game.move(direction)
        checkLockdown()
      }
    }
  }
}


function autoRepeatEnd(direction) {
  autoRepeats.splice(autoRepeats.lastIndexOf(direction), 1)
  
  if (autoRepeats.length != 0) {
    game.move(autoRepeats[autoRepeats.length - 1])
  }

  autoRepeatStartTime = currentTime
} 


function newGame() {
  game = new Game()
  state = STATE.PLAYING
  displayScore = 0
}


function drawGame() {
  background("#222229")
  stroke(COLOUR.GRAY)
  strokeWeight(2)
  drawBoard()

  //ghost
  noFill()
  stroke(game.activeTetro.tetro.colour.concat(180))
  strokeWeight(3)
  drawTetroOnBoard(game.activeTetro.grid,
    game.activeTetro.pos.row + game.ghostOffset,
    game.activeTetro.pos.col)
    
  //active tetro
  fill(game.activeTetro.tetro.colour)
  stroke(COLOUR.GRAY)
  drawTetroOnBoard(game.activeTetro.grid,
    game.activeTetro.pos.row,
    game.activeTetro.pos.col)

  strokeWeight(0)
  textSize(LARGE)
  drawNext()
  drawHold()

  strokeWeight(0)
  drawGameInfo()
}


function drawBoard() {
  for(let rowNum = BUFFER_ZONE_HEIGHT; rowNum < BOARD_HEIGHT; ++rowNum) {
    const row = game.board[rowNum]

    row.forEach((cell, colNum) => {
      if (cell != 0) {
        fill(Object.values(COLOUR)[cell])
      }
      else {
        fill(COLOUR.NIGHT)
      }
      rect(LEFT_MARGIN + colNum * CELL_SIZE, (rowNum - BUFFER_ZONE_HEIGHT) * CELL_SIZE,
           CELL_SIZE, CELL_SIZE)
    })
  }
}


//draw a tetro on the game board giving the row and position of
//the tetromino
function drawTetroOnBoard(tetroGrid, rowPos, colPos) {
  drawTetro(tetroGrid, 
    LEFT_MARGIN + (colPos * CELL_SIZE),
    CELL_SIZE * (rowPos - BUFFER_ZONE_HEIGHT))
}


function drawTetro(grid, xPos, yPos, scale = 1.0) {
  const size = CELL_SIZE * scale

  gridForEach(grid, (cell, rowNum, colNum) => {
    if (cell) {
      rect(xPos + colNum * size, //x
           yPos + rowNum * size, //y
           size, size) //x, y size
    }
  })
}


function drawNext() {
  fill(COLOUR.LIGHT_GRAY)
  text("Next", 570, 40)
  strokeWeight(2)

  game.next.forEach((tetro, queuePos) => {
    const grid = tetro.rotations[0]
    const rowPos = 70 + (queuePos * 3) * CELL_SIZE

    fill(tetro.colour)
    drawTetro(grid, 570, rowPos)
  })

  strokeWeight(0)
}


function drawHold() {
  const hold = game.holdSlot

  fill(COLOUR.LIGHT_GRAY)
  text("Hold", 80, 40)

  if (hold) {
    strokeWeight(2)
    fill(hold.colour)
    drawTetro(hold.rotations[0], 80, 70)
  }
}

function drawMenu() {
  background(COLOUR.NIGHT)

  fill(COLOUR.LIGHT_GRAY)
  textSize(100)
  text("Webtris", 280, 100)

  textSize(50)
  text("Controls", 150, 220)

  textSize(32)
  text("Move tetro: A/D or LEFT/RIGHT arrows", 150, 260)
  text("Spin tetro: Q/E or UP arrow", 150, 285)
  text("Hold: C", 150, 310)
  text("Instant drop: SPACE", 150, 335)
  text("Pause/resume: P", 150, 360)

  textSize(35)
  text("Press ENTER to start", 270, 500)
}


function drawPauseMenu() {
  fill(COLOUR.LIGHT_GRAY)
  textSize(LARGE)
  text("Paused", 335, 150)

  textSize(MEDIUM)
  text("P: Unpause", 270, 200)
  text("R: Restart", 270, 230)
}


function drawEndScreen() {
  fill(COLOUR.LIGHT_GRAY)
  textSize(LARGE)
  text("Game Over", 305, 150)

  textSize(MEDIUM)
  text("Press R to restart", 300, 200)
}


function drawGameInfo() {
  const leftPos = 20
  let topPos = 160

  fill(COLOUR.LIGHT_GRAY)

  textSize(SMALL)
  text(`Score:`, leftPos, topPos)
  textSize(LARGE)
  text(`${displayScore}`, leftPos + 20, topPos + 40)
  textSize(SMALL)
  text(`Level: ${game.level}`, leftPos, topPos + 70)
  text(`Goal: ${game.goal - game.stats.rowsCleared}`, leftPos, topPos + 100)

  topPos += 130

  text(`Lines: ${game.stats.rowsCleared}`, leftPos, topPos + 30)
  text(`Tetrises: ${game.stats.tetrises}`, leftPos, topPos + 60)
  text(`T-Spin Minis: ${game.stats.tSpinMinis}`, leftPos, topPos + 90)
  text(`T-Spins: ${game.stats.tSpins}`, leftPos, topPos + 120)

  //DEBUG
  text(`: ${lastMove}`, leftPos - 15, topPos + 170)
}