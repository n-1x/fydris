import { gridForEach } from './helpers'
import Game from './game'
import {
  BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, BUFFER_ZONE_HEIGHT, 
  NEXT_SIZE, AUTO_REPEAT_DELAY, AUTO_REPEAT_FREQ, 
  LEFT_MARGIN, RIGHT_MARGIN, DIRECTION, STATE, KEY, COLOUR
} from './constants'

//auto pause if the page is not visibile
document.addEventListener("visibilitychange", function() {
  if (document.hidden && state == STATE.PLAYING) {
    state = STATE.PAUSED
  }
});

let timeOfLastDrop = 0
let lastFrameDrawTime = 0
let state = STATE.MENU
let autoRepeatDirection = DIRECTION.NONE
let autoRepeatStartTime = 0
let lastAutoRepeatTime = 0
let displayScore = 0
let time = 0
let game = null


function setup() {
  const canvas = createCanvas(CELL_SIZE * BOARD_WIDTH + LEFT_MARGIN + RIGHT_MARGIN, 
                              CELL_SIZE * (BOARD_HEIGHT - BUFFER_ZONE_HEIGHT ))
  
  canvas.parent("game")
  timeOfLastDrop = millis()

  game = new Game()
}


function draw() {
  time = Math.floor(millis())
  const frameTime = time - lastFrameDrawTime

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
        autoRepeat(time)
        //track the time passed
        const timeSinceLastUpdate = lastFrameDrawTime - timeOfLastDrop
      
        //update the game when updateTime has passed since
        //the last update
        let fallTime = game.fallTime * 1000
  
        //fall speed should be 20x faster when soft dropping
        if (game.softDropping) {
          fallTime /= 20
        }
  
        if (game.gameOver) {
          state = STATE.GAME_OVER
        } else if (timeSinceLastUpdate >= fallTime) {
          game.fall()

          timeOfLastDrop = lastFrameDrawTime
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
  const annoyingKeys = [KEY.SPACE, DOWN_ARROW]
  //if returnval is false, browser ignores default behaviour
  let returnVal = !annoyingKeys.includes(keyCode)
  
  //stop keys being logged twice
  if (state == STATE.PLAYING) {
    //for non-ascii keys
    switch(keyCode) { 
      case KEY.A:
      case LEFT_ARROW:
        game.move(DIRECTION.LEFT)
        autoRepeatDirection = DIRECTION.LEFT
        autoRepeatStartTime = time
        break
  
      case KEY.D:
      case RIGHT_ARROW:
        game.move(DIRECTION.RIGHT)
        autoRepeatDirection = DIRECTION.RIGHT
        autoRepeatStartTime = time
        break
  
      case KEY.S:
      case DOWN_ARROW:
        game.softDropping = true
        break

      case KEY.E:
      case UP_ARROW:
        game.spin(DIRECTION.CLOCKWISE)
        break
      
      case KEY.Q:
        game.spin(DIRECTION.ANTI_CLOCKWISE)
        break
      
      case KEY.C:
        game.holdTetro()
        timeOfLastDrop = time
        break
      
      case KEY.P:
        state = STATE.PAUSED
        break
      
      case KEY.SPACE:
        game.hardDrop()
        timeOfLastDrop = time
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

  if (autoRepeatKeys.includes(keyCode)) {
    autoRepeatDirection = DIRECTION.NONE
  }

  switch(keyCode) {
    case KEY.S:
    case DOWN_ARROW:
      game.softDropping = false
      break
  }
}


function autoRepeat(time) {
  //if a movement input should be repeated
  if (autoRepeatDirection != DIRECTION.NONE) {
    const timeSinceKeyHeld = time - autoRepeatStartTime

    if (timeSinceKeyHeld >= AUTO_REPEAT_DELAY) {
      const timeSinceLastRepeat = time - lastAutoRepeatTime

      if (timeSinceLastRepeat >= AUTO_REPEAT_FREQ) {
        lastAutoRepeatTime = time

        game.move(autoRepeatDirection)
      }
    }
  }
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

  text(`Lines: ${game.stats.rowsCleared}`, leftPos, 350)
  text(`Level: ${game.level}`, leftPos, 380)
  text(`Tetrises: ${game.stats.tetrises}`, leftPos, 450)
}