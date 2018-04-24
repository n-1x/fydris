//run the some function on a grid
function gridSome(grid, func) {
  return grid.some((row, rowNum) => {
    return row.some((cell, colNum) => {
      return func(cell, rowNum, colNum)
    })
  })
}

//run the for each function on a grid
function gridForEach(grid, func) {
  grid.forEach((row, rowNum) => {
    row.forEach((cell, colNum) => {
      func(cell, rowNum, colNum);
    });
  });
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 40;
const BUFFER_ZONE_HEIGHT = 20; //tetris guideline
//pixels per cell
const CELL_SIZE = 30;
//amount of tetros you can see in advance, tetris guideline
const NEXT_SIZE = 6;
const MAX_LEVEL = 15; //tetris guideline
const FIXED_GOAL = 10; //lines per level
const AUTO_REPEAT_FREQ = 50; //tetris guideline
const AUTO_REPEAT_DELAY = 300; //tetris guideline

const LOCKDOWN_TIME = 500; //tetris guideline for ext. lockdown
const LOCKDOWN_MOVE_LIMIT = 15; //tetris guideline for ext. lockdown

const LEFT_MARGIN = 8 * CELL_SIZE;
const RIGHT_MARGIN = 8 * CELL_SIZE;

const DIRECTION = {
  NONE: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
  DOWN: 4,
  CLOCKWISE: 5,
  ANTI_CLOCKWISE: 6
};

const COLOUR = {
  WHITE: [255, 255, 255],
  RED: [209, 41, 0],
  ORANGE: [209, 121, 0],
  YELLOW: [209, 205, 0],
  GREEN: [0, 209, 66],
  LIGHT_BLUE: [0, 209, 209],
  BLUE: [0, 62, 209],
  PURPLE: [128, 0, 209],
  MAGENTA: [255, 0, 255],
  NIGHT: [42, 41, 45]
};

const KEY = {
  S: ('S').charCodeAt(0),
  A: ('A').charCodeAt(0),
  D: ('D').charCodeAt(0),
  Q: ('Q').charCodeAt(0),
  E: ('E').charCodeAt(0),
  R: ('R').charCodeAt(0),
  C: ('C').charCodeAt(0),
  P: ('P').charCodeAt(0),
  SPACE: (' ').charCodeAt(0)
};

const STATE = {
  NONE: 0,
  MENU: 1,
  PAUSED: 2,
  PLAYING: 3,
  GAME_OVER: 4
};

class Tetro {
  constructor(colour, grid) {
    this.rotations = [];
    this.colour = colour;
    
    //the given grid will be rotation[0] of the Tetro
    this.rotations[0] = grid;

    //private function for generating the rotations of the tetro
    const rotateGrid = function(grid, direction) {
      const newGrid = []; //will hold all the new rows
      const oldWidth = grid[0].length;
      const oldHeight = grid.length;
        
      for (let y = 0; y < oldWidth; ++y) {
        const newRow = []; //first row of the new shape
  
        for (let x = 0; x < oldHeight; ++x) {
          if (direction == DIRECTION.CLOCKWISE) {
            newRow[x] = grid[oldHeight - x - 1][y];
          }
          else { //rotate anti-clockwise
            newRow[x] = grid[x][oldWidth - y - 1];
          }
        }
        //add the new row
        newGrid[y] = newRow;
      }
  
      return newGrid
    };

    //generate the other 3 rotations
    for(let i = 0; i < 3; ++i) {
      this.rotations.push(rotateGrid(this.rotations[i], DIRECTION.CLOCKWISE));
    }
  }
}


//defines a tetro that can be moved and spun by the player
class ActiveTetro {
  constructor(tetro = TETRO.iShape) {
    this.tetro = tetro;
    this.pos = { row: 19, col: BOARD_WIDTH / 2 - 1 };
    this.orientation = 0;
    this.grid = this.tetro.rotations[this.orientation];

    //make sure that the l piece is centered
    if (this.tetro == TETRO.iShape) {
      this.pos.col = BOARD_WIDTH / 2 - 2;
    }
  }
}


class TetroBag {
  constructor() {
    this.bag = [];
    this.fillBag();
  }

  
  fillBag() {
    this.bag = Object.values(TETRO);

    //shuffle the bag
    for (let i = this.bag.length - 1; i > 0; --i) {
      const r = Math.floor(Math.random() * i);
      [this.bag[i], this.bag[r]] = [this.bag[r], this.bag[i]];
    }
  }


  take() {
    if (this.bag.length === 0) {
      this.fillBag();
    }

    return this.bag.shift()
  }
}


const TETRO = {
  iShape: new Tetro(COLOUR.LIGHT_BLUE, [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]),

  jShape: new Tetro(COLOUR.BLUE, [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ]),

  lShape: new Tetro(COLOUR.ORANGE, [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]),

  oShape: new Tetro(COLOUR.YELLOW, [
    [1, 1],
    [1, 1]
  ]),

  sShape: new Tetro(COLOUR.GREEN, [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ]),

  tShape: new Tetro(COLOUR.PURPLE, [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ]),

  zShape: new Tetro(COLOUR.RED, [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ])
};

class Game {
  constructor() {
    this.gameOver = false;
    this.ghostOffset = 0;
    this.tetroBag = new TetroBag();
    this.next = [];
    this.holdSlot = null;
    this.score = 0;
    this.level = 1;
    this.fallTime = 1; //seconds per line
    this.softDropping = false;

    this.stats = {
      rowsCleared: 0,
      tetrises: 0
    };

    this.initBoard();
    this.initNext();
    this.nextTetro();
  }
  
  
  initBoard() {
    this.board = [];
    
    //fill the board with height arrays of length width
    //all filled with zeroes
    for(let y = 0; y < BOARD_HEIGHT; ++y) {
      const row = [];
      
      for(let x = 0; x < BOARD_WIDTH; ++x) {
        row.push(0);
      }
      
      this.board.push(row);
    }
  }
  

  initNext() {
    for(let i = 0; i < NEXT_SIZE; ++i) {
      this.next.push(this.tetroBag.take());
    }
  }
  
  
  fall() {
    if (!this.move(DIRECTION.DOWN)) {
      this.finishTurn();
    }
  }


  calculateFallSpeed() {
    //algorithm from the tetris guideline
    this.fallTime = Math.pow((0.8 - ((this.level - 1) * 0.007)), this.level - 1);
  }


  pieceTouchingSurface() {
    return this.ghostOffset == 0
  }


  finishTurn() {
    this.placeTetro();
    
    const rowsCleared = this.clearFullRows();
    
    this.stats.rowsCleared += rowsCleared;

    //update the score
    switch(rowsCleared) {
      case 1:
      this.score += 100 * this.level;
      break
      
      case 2:
      this.score += 200 * this.level;
      break
      
      case 3:
      this.score += 500 * this.level;
      break
      
      case 4:
      this.score += 800 * this.level;
      ++this.stats.tetrises;
      break
    }
    //needs to be after the rows are cleared so 
    //ghost offset is correct
    this.nextTetro();

    //currenly uses the fixed goal system
    if (this.stats.rowsCleared >= this.level * FIXED_GOAL) {
      //cap the score at MAX_LEVEL
      ++this.level;

      this.calculateFallSpeed();

      //end of game in marathon mode
      if (this.level > MAX_LEVEL) {
        this.gameOver = true;
      }
    }    
  }


  tetroFitsOnBoard(tetroGrid, rowPos, colPos) {
    //return !someCell is full
    return !gridSome(tetroGrid, (cell, r, c) => {
      let cellFree = true;
      //if the cell of tetroGrid is not empty
      if (cell) {
        const row = this.board[r + rowPos];
        
        //if row is undefined then the cell won't be checked
        cellFree = row && row[c + colPos] === 0;
      }
  
      return !cellFree
    })
  }


  calculateGhostOffset() {
    const pos = this.activeTetro.pos;
    this.ghostOffset = 0;
    
    while (this.tetroFitsOnBoard(
            this.activeTetro.grid,
            pos.row + this.ghostOffset + 1,
            pos.col)) {
      ++this.ghostOffset;
    }
  }


  clearRow(rowNum) {
    //from the row upwards, copy from the cell above
    for(let r = rowNum; r >= 0; --r) {
      const row = this.board[r];
      
      row.forEach((cell, cellNum) => {
        let newVal = 0;
        
        //if not top row
        if (r != 0) {
          newVal = this.board[r - 1][cellNum];
        }
        
        this.board[r][cellNum] = newVal;
      });
    }
  }


  clearFullRows() {
    let rowsCleared = 0;

    this.board.forEach((row, rowNum) => {
      const emptyFound = row.some(cell => cell == 0);

      if (!emptyFound) {
        this.clearRow(rowNum);        
        ++rowsCleared;
      }
    });

    return rowsCleared
  }


  nextTetro() {
    const newTetro = new ActiveTetro(this.next.shift());
    this.next.push(this.tetroBag.take());

    if (this.tetroFitsOnBoard(newTetro.tetro.rotations[0],
                              newTetro.pos.row,
                              newTetro.pos.col)) {
      this.activeTetro = newTetro;
    } else {
      this.gameOver = true;
    }

    this.calculateGhostOffset();
    this.canHold = true;
  }


  holdTetro() {
    const success = this.canHold;

    if (this.canHold) {
      if (this.holdSlot) {
        [this.holdSlot, this.activeTetro] = [this.activeTetro.tetro, 
                                             new ActiveTetro(this.holdSlot)];

        this.calculateGhostOffset();
      } else {
        this.holdSlot = this.activeTetro.tetro;
        this.nextTetro();
      }
      
      this.canHold = false;
    }

    return success
  }


  spin(direction) {
    const pos = this.activeTetro.pos;
    let spinPossible = true;
    let newOrientation = this.activeTetro.orientation;

    if (direction === DIRECTION.CLOCKWISE) {
      ++newOrientation;
    }
    else if (direction === DIRECTION.ANTI_CLOCKWISE) {
      --newOrientation;
    }

    //make it circular
    if (newOrientation < 0) {
      newOrientation = 3;
    }
    else if (newOrientation> 3) {
      newOrientation = 0;
    }

    const spunGrid = this.activeTetro.tetro.rotations[newOrientation];

    spinPossible = this.tetroFitsOnBoard(spunGrid, pos.row, pos.col);

    if (spinPossible) {
      this.activeTetro.orientation = newOrientation;
      this.activeTetro.grid = spunGrid;
    }

    this.calculateGhostOffset();

    return spinPossible
  }


  move(direction) {
    let rowNum = this.activeTetro.pos.row;
    let colNum = this.activeTetro.pos.col;
    let success = false;

    switch(direction) {
      case DIRECTION.LEFT:
        --colNum;
        break

      case DIRECTION.RIGHT:
        ++colNum;
        break

      case DIRECTION.DOWN:
        if (this.softDropping) {
          ++this.score;
        }
        ++rowNum;
        break
    }

    //when moving down, always successful unless the piece is in
    //the same place as its ghost
    if (direction != DIRECTION.DOWN) {
      success = this.tetroFitsOnBoard(this.activeTetro.grid, rowNum, colNum);
    }
    else {
      if (this.ghostOffset != 0) {
        success = true;

        //when moving down, the ghost offset just needs to decrease by 1
        --this.ghostOffset;
      }
    }
    
    //actually move the piece if the move is allowed
    if (success) {
      this.activeTetro.pos.row = rowNum;
      this.activeTetro.pos.col = colNum;
      this.calculateGhostOffset();
    }

    return success
  }


  placeTetro() {
    gridForEach(this.activeTetro.grid, (cell, r, c) => {
      if(cell) {
        const rowPos = r + this.activeTetro.pos.row;
        const colPos = c + this.activeTetro.pos.col;
        const colour = this.activeTetro.tetro.colour;
        const colourIndex = Object.values(COLOUR).indexOf(colour);

        this.board[rowPos][colPos] = colourIndex;
      }
    });
  }


  hardDrop() {
    this.score += 2 * this.ghostOffset;
    //move the tetro to its ghost
    this.activeTetro.pos.row += this.ghostOffset;
    this.finishTurn();
  }
}

//auto pause if the page is not visibile
document.addEventListener("visibilitychange", function() {
  if (document.hidden && state == STATE.PLAYING) {
    state = STATE.PAUSED;
  }
});

let lastFallTime = 0;
let lastFrameDrawTime = 0;
let state = STATE.MENU;
let displayScore = 0;
let currentTime = 0;
let game = null;

const autoRepeats = [];
let autoRepeatStartTime = 0;
let lastAutoRepeatTime = 0;

let lockdownTimer = 0;
let lockdownCounter = 0;
let lockdownStarted = false;


function setup() {
  const canvas = createCanvas(CELL_SIZE * BOARD_WIDTH + LEFT_MARGIN + RIGHT_MARGIN, 
                              CELL_SIZE * (BOARD_HEIGHT - BUFFER_ZONE_HEIGHT ));
  
  canvas.parent("game");
  lastFallTime = millis();

  game = new Game();
}


function draw() {
  currentTime = Math.floor(millis());
  const frameTime = currentTime - lastFrameDrawTime;

  lastFrameDrawTime += frameTime;

  //update the displayed score
  if (displayScore < game.score) {
    displayScore += frameTime;

    if (displayScore > game.score) {
      displayScore = game.score;
    } 
  }

  switch(state) {
    case STATE.MENU:
      drawMenu();
      break

    case STATE.PLAYING:
      autoRepeat(currentTime);
      //track the time passed
      const timeSinceLastFall = lastFrameDrawTime - lastFallTime;
    
      //the amount of time until the fall. Should be 20x quicker
      //if game.softDropping
      let fallTime = game.fallTime * 1000 / (game.softDropping ? 20 : 1); 

      if (lockdownStarted) {
        lockdownTimer += frameTime;
        
        if (!game.pieceTouchingSurface()) {
          lockdownStarted = false;
        }
      }

      if (game.gameOver) {
        state = STATE.GAME_OVER;
      }
      else if (lockdownStarted) { //lockdown has higher priority than fall timer
        if (lockdownTimer >= LOCKDOWN_TIME || 
            lockdownCounter >= LOCKDOWN_MOVE_LIMIT) {
          game.fall();
          lockdownStarted = false;
          lastFallTime = lastFrameDrawTime;
        }
      }
      else if (timeSinceLastFall >= fallTime) { //fall timer
        game.fall();

        if (game.pieceTouchingSurface()) {
          lockdownStarted = true;
          lockdownCounter = 0;
          lockdownTimer = 0;
        }

        lastFallTime = lastFrameDrawTime;
      }

      drawGame();
      break

    case STATE.PAUSED:
      drawPauseMenu();
      break

    case STATE.GAME_OVER:
      drawEndScreen();
      break
  }
}


function keyPressed() {
  //array of keys to ignore default behaviour
  const annoyingKeys = [KEY.SPACE, UP_ARROW, DOWN_ARROW];
  //if returnval is false, browser ignores default behaviour like scrolling
  let returnVal = !annoyingKeys.includes(keyCode);
  
  //stop keys being logged twice
  if (state == STATE.PLAYING) {
    //for non-ascii keys
    switch(keyCode) { 
      case KEY.A:
      case LEFT_ARROW:
        game.move(DIRECTION.LEFT);

        autoRepeats.push(DIRECTION.LEFT);
        autoRepeatStartTime = currentTime;

        lockdownTimer = 0;
        ++lockdownCounter;
        break
  
      case KEY.D:
      case RIGHT_ARROW:
        game.move(DIRECTION.RIGHT);

        autoRepeats.push(DIRECTION.RIGHT);
        autoRepeatStartTime = currentTime;

        lockdownTimer = 0;
        ++lockdownCounter;
        break
  
      case KEY.S:
      case DOWN_ARROW:
        game.softDropping = true;
        break

      case KEY.E:
      case UP_ARROW:
        game.spin(DIRECTION.CLOCKWISE);

        lockdownTimer = 0;
        ++lockdownCounter;
        break
      
      case KEY.Q:
        game.spin(DIRECTION.ANTI_CLOCKWISE);

        lockdownTimer = 0;
        ++lockdownCounter;
        break
      
      case KEY.C:
        const holdWorked = game.holdTetro();
        
        if (holdWorked) {
          lastFallTime = currentTime;
        }
        break
      
      case KEY.P:
        state = STATE.PAUSED;
        break
      
      case KEY.SPACE:
        game.hardDrop();
        lastFallTime = currentTime;
        lockdownStarted = false;
        break
    }
  }
  else if (state == STATE.MENU) {
    switch (keyCode) {
      case ENTER:
        state = STATE.PLAYING;
        break
    }
  }
  else if (state == STATE.PAUSED) {
    switch (keyCode) {
      case KEY.P:
        state = STATE.PLAYING;
        break

      case KEY.R:
        newGame();
        break
    }
  }
  else if (state == STATE.GAME_OVER) {
    switch(keyCode) {
      case KEY.R:
        newGame();
        break
    }
  }

  return returnVal
}


function keyReleased() {
  const autoRepeatKeys = [KEY.A, KEY.D, LEFT_ARROW, RIGHT_ARROW];

  switch(keyCode) {
    case KEY.A:
    case LEFT_ARROW:
      autoRepeatEnd(DIRECTION.LEFT);
      break

    case KEY.S:
    case DOWN_ARROW:
      game.softDropping = false;
      break

    case KEY.D:
    case RIGHT_ARROW:
      autoRepeatEnd(DIRECTION.RIGHT);
      break
  }
}


function autoRepeat(time) {
  const direction = autoRepeats[autoRepeats.length - 1];
  //if a movement input should be repeated
  if (direction) {
    const timeSinceKeyHeld = time - autoRepeatStartTime;

    if (timeSinceKeyHeld >= AUTO_REPEAT_DELAY) {
      const timeSinceLastRepeat = time - lastAutoRepeatTime;

      if (timeSinceLastRepeat >= AUTO_REPEAT_FREQ) {
        lastAutoRepeatTime = time;

        game.move(direction);
      }
    }
  }
}


function autoRepeatEnd(direction) {
  autoRepeats.splice(autoRepeats.lastIndexOf(direction), 1);
  
  if (autoRepeats.length != 0) {
    game.move(autoRepeats[autoRepeats.length - 1]);
  }

  autoRepeatStartTime = currentTime;
} 


function newGame() {
  game = new Game();
  state = STATE.PLAYING;
  displayScore = 0;
}


function drawGame() {
  drawBoard();
  drawTetroOnBoard(game.activeTetro.grid,
            game.activeTetro.tetro.colour,
            game.activeTetro.pos.row,
            game.activeTetro.pos.col);
  drawGhostPiece();

  drawNext();
  drawHoldSlot();
  drawGameInfo();
}


function drawBoard() {
  background("#bbb");

  for(let rowNum = BUFFER_ZONE_HEIGHT; rowNum < BOARD_HEIGHT; ++rowNum) {
    const row = game.board[rowNum];

    row.forEach((cell, colNum) => {
      if (cell != 0) {
        fill(Object.values(COLOUR)[cell]);
      }
      else {
        fill(COLOUR.NIGHT);
      }
      rect(LEFT_MARGIN + colNum * CELL_SIZE, (rowNum - BUFFER_ZONE_HEIGHT) * CELL_SIZE,
           CELL_SIZE, CELL_SIZE);
    });
  }
}


function drawTetroOnBoard(grid, colour, rowPos, colPos) {
  fill(colour);

  gridForEach(grid, (cell, rowNum, colNum) => {
    if(cell) {
      rect(LEFT_MARGIN + (colPos + colNum) * CELL_SIZE, //x
            (rowPos + rowNum - BUFFER_ZONE_HEIGHT) * CELL_SIZE, //y
            CELL_SIZE, CELL_SIZE); //size
    }
  });
}


function drawTetro(grid, colour, xPos, yPos) {
  fill(colour);

  gridForEach(grid, (cell, rowNum, colNum) => {
    if (cell) {
      rect(xPos + colNum * CELL_SIZE, yPos + rowNum * CELL_SIZE,
           CELL_SIZE, CELL_SIZE);
    }
  });
}


function drawNext() {
  textSize(32);
  fill(0);
  text("Next", 570, 50);

  game.next.forEach((tetro, queuePos) => {
    const grid = tetro.rotations[0];
    const rowPos = 70 + (queuePos * 3) * CELL_SIZE;
    drawTetro(grid, tetro.colour, 570, rowPos);
  });
}


function drawHoldSlot() {
  const hold = game.holdSlot;

  textSize(32);
  fill(0);
  text("Hold", 80, 50);

  if (hold) {
    drawTetro(hold.rotations[0], hold.colour,
              80, 70);
  }
}


function drawGhostPiece() {
  const pos = game.activeTetro.pos;
  //concat the alpha value to the colour
  const colour = game.activeTetro.tetro.colour.concat(40);

  drawTetroOnBoard(game.activeTetro.grid, colour, 
                   game.activeTetro.pos.row + game.ghostOffset,
                   game.activeTetro.pos.col);
}


function drawMenu() {
  background(COLOUR.NIGHT);

  fill("#bbb");
  textSize(64);
  text("Webtris", 280, 100);

  textSize(32);
  text("Controls", 150, 220);

  textSize(18);
  text("Move tetro: A/D or LEFT/RIGHT arrows", 150, 260);
  text("Spin tetro: Q/E or UP arrow", 150, 285);
  text("Hold: C", 150, 310);
  text("Instant drop: SPACE", 150, 335);
  text("Pause/resume: P", 150, 360);

  textSize(24);
  text("Press ENTER to start", 270, 500);
}


function drawPauseMenu() {
  fill(COLOUR.ORANGE);
  rect(LEFT_MARGIN + CELL_SIZE, 3 * CELL_SIZE, 
       (BOARD_WIDTH - 2) * CELL_SIZE, 5 * CELL_SIZE);

  fill("#bbb");
  textSize(32);
  text("Paused", 335, 150);

  textSize(24);
  text("Press R to restart", 300, 200);
}


function drawEndScreen() {
  fill(COLOUR.RED);
  rect(LEFT_MARGIN + CELL_SIZE, 3 * CELL_SIZE, 
       (BOARD_WIDTH - 2) * CELL_SIZE, 5 * CELL_SIZE);

  fill("#bbb");
  textSize(32);
  text("Game Over", 305, 150);

  textSize(24);
  text("Press R to restart", 300, 200);
}


function drawGameInfo() {
  const leftPos = 80;
  fill(0);
  textSize(24);
  text(`Score:\n   ${displayScore}`, leftPos, 200);
  text(`Level: ${game.level}`, leftPos, 260);
  text(`Goal: ${10 - game.stats.rowsCleared % 10}`, leftPos, 290);

  text(`Lines: ${game.stats.rowsCleared}`, leftPos, 400);
  text(`Tetrises: ${game.stats.tetrises}`, leftPos, 430);
}
