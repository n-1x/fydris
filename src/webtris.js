import { gridForEach } from './helpers'
import Game from './game'
import {
  BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, BUFFER_ZONE_HEIGHT, 
  NEXT_SIZE, AUTO_REPEAT_DELAY, AUTO_REPEAT_FREQ, LEFT_MARGIN,
  RIGHT_MARGIN, LOCKDOWN_TIME, LOCKDOWN_MOVE_LIMIT,
  DIRECTION, STATE, KEY, COLOUR
} from './constants'

//auto pause if the page is not visibile
document.addEventListener("visibilitychange", function() {
  if (document.hidden && state == STATE.PLAYING) {
    state = STATE.PAUSED
  }
});

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


function setup() {
  const canvas = createCanvas(CELL_SIZE * BOARD_WIDTH + LEFT_MARGIN + RIGHT_MARGIN, 
                              CELL_SIZE * (BOARD_HEIGHT - BUFFER_ZONE_HEIGHT ))
  
  canvas.parent("game")
  lastFallTime = millis()

  game = new Game()
}


function draw() {
  currentTime = Math.floor(millis())
  const frameTime = currentTime - lastFrameDrawTime

  lastFrameDrawTime += frameTime

  //update the displayed score
  if (displayScore < game.score) {
    displayScore += frameTime

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
        
        if (!game.pieceTouchingSurface()) {
          lockdownStarted = false
        }
      }

      if (game.gameOver) {
        state = STATE.GAME_OVER
      }
      else if (lockdownStarted) { //lockdown has higher priority than fall timer
        if (lockdownTimer >= LOCKDOWN_TIME || 
            lockdownCounter >= LOCKDOWN_MOVE_LIMIT) {
          game.fall()
          lockdownStarted = false
          lastFallTime = lastFrameDrawTime
        }
      }
      else if (timeSinceLastFall >= fallTime) { //fall timer
        game.fall()

        if (game.pieceTouchingSurface()) {
          lockdownStarted = true
          lockdownCounter = 0
          lockdownTimer = 0
        }

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

        autoRepeats.push(DIRECTION.LEFT)
        autoRepeatStartTime = currentTime

        lockdownTimer = 0
        ++lockdownCounter
        break
  
      case KEY.D:
      case RIGHT_ARROW:
        game.move(DIRECTION.RIGHT)

        autoRepeats.push(DIRECTION.RIGHT)
        autoRepeatStartTime = currentTime

        lockdownTimer = 0
        ++lockdownCounter
        break
  
      case KEY.S:
      case DOWN_ARROW:
        game.softDropping = true
        break

      case KEY.E:
      case UP_ARROW:
        game.spin(DIRECTION.CLOCKWISE)

        lockdownTimer = 0
        ++lockdownCounter
        break
      
      case KEY.Q:
        game.spin(DIRECTION.ANTI_CLOCKWISE)

        lockdownTimer = 0
        ++lockdownCounter
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
        game.hardDrop()
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


function autoRepeat(time) {
  const direction = autoRepeats[autoRepeats.length - 1]
  //if a movement input should be repeated
  if (direction) {
    const timeSinceKeyHeld = time - autoRepeatStartTime

    if (timeSinceKeyHeld >= AUTO_REPEAT_DELAY) {
      const timeSinceLastRepeat = time - lastAutoRepeatTime

      if (timeSinceLastRepeat >= AUTO_REPEAT_FREQ) {
        lastAutoRepeatTime = time

        game.move(direction)
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
  drawBoard()
  drawTetroOnBoard(game.activeTetro.grid,
            game.activeTetro.tetro.colour,
            game.activeTetro.pos.row,
            game.activeTetro.pos.col)
  drawGhostPiece()

  drawNext()
  drawHoldSlot()
  drawGameInfo()
}


function drawBoard() {
  background("#bbb")

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


function drawTetroOnBoard(grid, colour, rowPos, colPos) {
  fill(colour)

  gridForEach(grid, (cell, rowNum, colNum) => {
    if(cell) {
      rect(LEFT_MARGIN + (colPos + colNum) * CELL_SIZE, //x
            (rowPos + rowNum - BUFFER_ZONE_HEIGHT) * CELL_SIZE, //y
            CELL_SIZE, CELL_SIZE) //size
    }
  })
}


function drawTetro(grid, colour, xPos, yPos) {
  fill(colour)

  gridForEach(grid, (cell, rowNum, colNum) => {
    if (cell) {
      rect(xPos + colNum * CELL_SIZE, yPos + rowNum * CELL_SIZE,
           CELL_SIZE, CELL_SIZE)
    }
  })
}


function drawNext() {
  textSize(32)
  fill(0)
  text("Next", 570, 50)

  game.next.forEach((tetro, queuePos) => {
    const grid = tetro.rotations[0]
    const rowPos = 70 + (queuePos * 3) * CELL_SIZE
    drawTetro(grid, tetro.colour, 570, rowPos)
  })
}


function drawHoldSlot() {
  const hold = game.holdSlot

  textSize(32)
  fill(0)
  text("Hold", 80, 50)

  if (hold) {
    drawTetro(hold.rotations[0], hold.colour,
              80, 70)
  }
}


function drawGhostPiece() {
  const pos = game.activeTetro.pos
  //concat the alpha value to the colour
  const colour = game.activeTetro.tetro.colour.concat(40)

  drawTetroOnBoard(game.activeTetro.grid, colour, 
                   game.activeTetro.pos.row + game.ghostOffset,
                   game.activeTetro.pos.col)
}


function drawMenu() {
  background(COLOUR.NIGHT)

  fill("#bbb")
  textSize(64)
  text("Webtris", 280, 100)

  textSize(32)
  text("Controls", 150, 220)

  textSize(18)
  text("Move tetro: A/D or LEFT/RIGHT arrows", 150, 260)
  text("Spin tetro: Q/E or UP arrow", 150, 285)
  text("Hold: C", 150, 310)
  text("Instant drop: SPACE", 150, 335)
  text("Pause/resume: P", 150, 360)

  textSize(24)
  text("Press ENTER to start", 270, 500)
}


function drawPauseMenu() {
  fill(COLOUR.ORANGE)
  rect(LEFT_MARGIN + CELL_SIZE, 3 * CELL_SIZE, 
       (BOARD_WIDTH - 2) * CELL_SIZE, 5 * CELL_SIZE)

  fill("#bbb")
  textSize(32)
  text("Paused", 335, 150)

  textSize(24)
  text("Press R to restart", 300, 200)
}


function drawEndScreen() {
  fill(COLOUR.RED)
  rect(LEFT_MARGIN + CELL_SIZE, 3 * CELL_SIZE, 
       (BOARD_WIDTH - 2) * CELL_SIZE, 5 * CELL_SIZE)

  fill("#bbb")
  textSize(32)
  text("Game Over", 305, 150)

  textSize(24)
  text("Press R to restart", 300, 200)
}


function drawGameInfo() {
  const leftPos = 80
  fill(0)
  textSize(24)
  text(`Score:\n   ${displayScore}`, leftPos, 200)
  text(`Level: ${game.level}`, leftPos, 260)
  text(`Goal: ${10 - game.stats.rowsCleared % 10}`, leftPos, 290)

  text(`Lines: ${game.stats.rowsCleared}`, leftPos, 400)
  text(`Tetrises: ${game.stats.tetrises}`, leftPos, 430)
}