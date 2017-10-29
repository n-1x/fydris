//sketch.js
//Author: Nicholas J D Dean
//Date created: 2017-06-28
//Notes: 
//EVERYTHING related to the grid should be
//accessed by [row][column], not [x][y]

//firstly disable the keys from scrolling the page
window.addEventListener("keydown", function(e) {
    // each arrow key and space
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

const NUM_ROWS = 20
const NUM_COLUMNS = 10
const IMG_SCALE = .5 //.3125
const SQUARE_SIZE = (64 * IMG_SCALE)
const WIDTH = SQUARE_SIZE * NUM_COLUMNS
const HEIGHT = SQUARE_SIZE * NUM_ROWS

//simple queue implementation for the shape queue
function Queue() {
  //
  this.QueueElement = function(d, n) {
    this.data = d
    this.next = n
  }

  this.top = null
  this.back = null
  this.size = 0

  this.moveQueue = function() {
    var value = this.top.data

    if (this.size > 0) {
      this.top = this.top.next
      --this.size
    }
    return value
  }

  this.addElement = function(newData) {
    var newElement = new this.QueueElement(newData, null)

    if (this.size === 0) {
      this.top = newElement
      this.back = newElement
    }
    else {
      this.back.next = newElement
      this.back = newElement
    }
    ++this.size
  }

  this.getNthElement = function(n) {
    var pointer = this.top
    var value = undefined

    if (this.size > n) {
      for (var y = 0; y <= n; y++) {
        value = pointer.data
        pointer = pointer.next
      }
    }

    return value
  }
}



//The data structure representing a tetris piece
function Tetromino(startColour, startGrid) {
  this.colour = startColour
  this.grid = startGrid
  //the bounds are the coordinates of the top left
  //and the bottom right points of the grid that are used.
  //these are needed for calculating whether the tetromino
  //is in bounds or not. They should be recalculated
  //everytime the grid changes
  this.recalculateBounds()
}



//rotate the piece, clockwise if parameter is true
Tetromino.prototype.rotate = function(clockwise) {
  var oldGrid = this.grid
  var newGrid = [] //will hold all the new rows
  var oldWidth = oldGrid[0].length
  var oldHeight = oldGrid.length
    
  for (var y = 0; y < oldWidth; y++) {
    var newRow = [] //first row of the new shape

    for (var x = 0; x < oldHeight; x++) {

      if (clockwise) { //rotate clockwise
        newRow[x] = oldGrid[oldHeight - x - 1][y]
      }
      else { //rotate anticlockwise
        newRow[x] = oldGrid[x][oldWidth - y - 1]
      }
    }
    //add the new row
    newGrid[y] = newRow
  }

  //replace the old grid with the rotated one
  this.grid = newGrid

  //update the new boundaries for the tetromino
  this.recalculateBounds()
}



//returns 2 coordinates in an array
//[[topY, leftX], [bottomY, rightX]] of the top left
//and bottom right parts of the shape in 
//the grid respectively
Tetromino.prototype.recalculateBounds = function() {
  //start at top left and read like a book
  //first non zero piece is the top left
  var pointFound = false

  var bottomY = 0,
      topY = 0,
      rightX = 0,
      leftX = 0

  this.bounds = []
  var overallCounter = 0

  //find the left, right, top, and bottom
  //most parts of the grid that aren't 0
  for (var y = 0; y < this.grid.length; y++) {
    for (var x = 0; x < this.grid[0].length; x++) {

       if (this.grid[y][x] != 0) {
         if (!pointFound) { //first point found
           pointFound = true

           bottomY = y
           topY = y
           leftX = x
           rightX = x
         }
         else {
           //don't need to check for top
           //here because the firs point 
           //found will always be the one with
           //the lowest y value
           if (x < leftX) {
             leftX = x
           }
           if (x > rightX) {
             rightX = x
           }
           if (y > bottomY) {
             bottomY = y
           }
         }
       }
       ++overallCounter
    }
  }
  this.bounds[0] = [topY, leftX]
  this.bounds[1] = [bottomY, rightX]
}



//debug function for printing the 
//representation of the shape to the console
Tetromino.prototype.logShape = function() {
  var shapeWidth = this.grid[0].length
  var shapeHeight = this.grid.length

  var output = ''
  for(var y = 0; y < shapeHeight; y++) {

    for(var x = 0; x < shapeWidth; x++) {
      output += this.grid[y][x] + ' '
    }

    output += '\n'
  }
  console.log(output)
}



Tetromino.prototype.logBounds = function() {
  console.log("Tetromino bounds:")
  console.log("\t[" + this.bounds[0][0] + ", " + this.bounds[0][1] + "]")
  console.log("\t[" + this.bounds[1][0] + ", " + this.bounds[1][1] + "]")
}



//define preset tetros colour and shape
//MUST be square because of recalculateBounds
//relying on this to check for the boundaries
//of each shape within its defined square
Tetromino.presets = {
  jShape: new Tetromino(
    5,
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0]
    ]
),

  lShape: new Tetromino(
    2,
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1]
    ]
  ),

  leftStairShape: new Tetromino(
    1,
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ]
  ),

  rightStairShape: new Tetromino(
    4,
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  ),

  squareShape: new Tetromino(
    3,
    [
      [1, 1],
      [1, 1]
    ]
  ),

  tShape: new Tetromino(
    6,
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0]
    ]
  ),

  iShape: new Tetromino(
    7,
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0]
    ]
  )
}



function Piece(initialTetro, xPos, yPos) {
  this.x = xPos
  this.y = yPos
  this.tetro = initialTetro
}



//checks if the given piece will go outside
//of the board's boundaries
Game.prototype.pieceOutOfBounds = function(aPiece) {
  var result = false
  var bounds = aPiece.tetro.bounds
  var top = bounds[0][0]
  var left = bounds[0][1]
  var bottom = bounds[1][0]
  var right = bounds[1][1]

  //convert the shape boundaries to board positions
  //by adding the shape's board coordinates
  top += aPiece.y
  left += aPiece.x
  bottom += aPiece.y
  right += aPiece.x
  
  if (
    (!inBoardBoundaries(top, left)) || //top left of shape
    (!inBoardBoundaries(bottom, right))    //bottom right of shape
  ) {
    result = true
  }
  
  return result
}



//checks if the piece overlaps
//pieces already on the given board. Make sure
//that this piece isn't active on the board when
//using this because that piece will count
//for collision as well. a PIECE should be passed
//NOT a SHAPE
//returns true if given piece can be placed on the board
//without overlap, false if not
Game.prototype.pieceWouldOverlap = function(aPiece) {
  var result = false
  var xPos = aPiece.x
  var yPos = aPiece.y
  var shapeGrid = aPiece.tetro.grid

  for (var y = 0; y < shapeGrid.length; y++) {
    for (var x = 0; x < shapeGrid[0].length; x++) {
      //if the space in shapegrid is used
      if (shapeGrid[y][x] != 0) {
        //check that it's not out of bounds on the 
        //level before checking if that space is taken

        if (inBoardBoundaries(yPos + y, xPos + x)) {
          if (this.board[yPos + y][xPos + x] != 0) {
            result = true
          }
        }

      }

    }
  }
  return result
}



//returns a random property 
//from Tetromino.presets
Tetromino.getRandomPreset = function() {
  var possibleShapes = Object.keys(Tetromino.presets)
  var randomIndex = Math.floor(random(0, possibleShapes.length))

  return Tetromino.presets[possibleShapes[randomIndex]]
}



const directions = {
  //shapes don't move up
  NONE: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
}



function Game() {
  this.timeSinceLastUpdate = 0
  this.timeOfLastUpdate = 0
  this.board = []      //the state of all squares in this game

  this.activePiece = new Piece(
    Tetromino.presets.jShape,
    4,
    2
  )

  this.lastUpdateFailed = false //2 updates need to fail for the next
                               //piece to be spawned

  //the TETRO in the hold slot
  //a tetro is held, not a piece, as it 
  //does not keep the location data
  this.heldTetro = undefined

  this.queueSize = 3
  this.tetroQueue = new Queue()

  //this.pieceQueue

  this.gameOver = false
  this.canHold = true  //determines whether the player
                       //can use hold or not

  this.softDropping = false
}



Game.prototype.init = function() {
  for (var y = 0; y < NUM_ROWS; y++) {
    this.board[y] = []
    
    for (var x = 0; x < NUM_COLUMNS; x++) {
      this.board[y][x] = 0
    }
  }

  //fill the queue with random pieces
  for (var i = 0; i < this.queueSize; ++i) {
    this.tetroQueue.addElement(Tetromino.getRandomPreset())
  }

  this.spawnPiece()
}



Game.prototype.update = function() {

  if(!this.gameOver) {
    var couldMove = this.move(directions.DOWN)

    //when the player can't move, check for filled lines
    //then spawn a new piece
    if (!couldMove) {
      if (this.lastUpdateFailed) {
        //make sure to do this stuff
        //like clearFullLines() before spawnPiece()
        this.canHold = true
        this.lastUpdateFailed = false
        this.clearFullLines()

        //try spawning new piece, if it fails, game over
        if (!this.spawnPiece()) {
          this.gameOver = true
        }
        //stop soft dropping carrying across pieces
        this.softDropping = false

      }
      else {
        if (this.softDropping) {
          this.softDropping = false
        }
        this.lastUpdateFailed = true
      }


    }

    // if (!couldMove) {
    //   this.clearFullLines()
    //   if(!this.spawnPiece()) {
    //     this.gameOver = true
    //   }
    // }

  }
}



//performs a check on the line given
//in 'lineIndex' based on 'checkToDo'
Game.prototype.lineCheck = function(lineIndex, checkToDo) {
  var result = true

  switch (checkToDo) {
      case "full":
        for (var x = 0; x < NUM_COLUMNS; x++) {
          if (this.board[lineIndex][x] == 0) {
            result = false
          }
        }
        break

      case "empty":
        for (var x = 0; x < NUM_COLUMNS; x++) {
          if (this.board[lineIndex][x] != 0) {
            result = false
          }
        }
        break

      default:
        console.log("invalid lineCheck requested:" + checkToDo)
        break
  }
  return result
}



//copy the line above the given
//line, to the given line. Function
//that will run whenever a full line is
//detected
Game.prototype.clearLine = function (lineIndex) {
  for (var y = lineIndex; y > 0; y--) {
    for (var x = 0; x < NUM_COLUMNS; x++) {
        this.board[y][x] = this.board[y - 1][x] 
    }
  }
}



//checks for full lines and clears them
//properly. Returns the number of lines 
//cleared.
Game.prototype.clearFullLines = function() {
  var currentLine = NUM_ROWS - 1 //start at bottom
  var linesCleared = 0 //track the number of cleared lines
  
  //can stop if the current line is empty
  while ((currentLine >= 0) && (!this.lineCheck(currentLine, "empty"))) {
    if (this.lineCheck(currentLine, "full")) {
      this.clearLine(currentLine)
      linesCleared++
    }
    else { 
      //if a line was cleared, we need to recheck the
      //same line because it now contains the contents 
      //of the line that was above it. So only decrement
      //on a non-full line
      currentLine--
    }
  }
  return linesCleared
}



//creates a new piece, sets it to be the active
//piece and places it on the board
//returns false if there was something in the way
//of the spawn location
Game.prototype.spawnPiece = function() {
  //create a piece at the starting location
  //with a random shape
  var nextPiece = new Piece(
    this.tetroQueue.moveQueue(), //next shape in queue
    4, //xloc
    2  //yloc
  )
  //add another piece to the back of the queue
  this.tetroQueue.addElement(Tetromino.getRandomPreset())

  var success = true

  //if the piece DOES overlap, try moving it up
  //by 1. Only do this twice max
  var counter = 0
  const maxMove = 2
  
  success = !this.pieceWouldOverlap(nextPiece)
  while ((!success) && (counter < maxMove)) {
    --nextPiece.y
    ++counter

    //check if piece now in bounds
    success = !this.pieceWouldOverlap(nextPiece)
  }

  if (success) {
    this.activePiece = nextPiece

    //place it on the board
    this.setActivePieceOnBoard(true)
  }
  return success
}



//move the active piece if possible
Game.prototype.move = function(direction) {
  var result = true

  //currently identical to activePiece
  //but needs to create a new one so we
  //don't affect the active
  var nextPiece = new Piece(
    this.activePiece.tetro,
    this.activePiece.x,
    this.activePiece.y
  )

  switch (direction) {
    case directions.DOWN:
      nextPiece.y++
      break

    case directions.LEFT:
      nextPiece.x--
      break

    case directions.RIGHT:
      nextPiece.x++
      break

    case directions.NONE:
      break

    default:
      console.log("checkMove called with invalid direction")
      break
  }

  //remove active piece from board so
  //it doesn't check for collision with its
  //self
  this.setActivePieceOnBoard(false)

  //check if the next piece can be placed
  if (
    this.pieceOutOfBounds(nextPiece) ||
    this.pieceWouldOverlap(nextPiece)
  ) {
    //if either of those are true, can't move
    result = false
  }
  
  if (result) {
    //set the active piece to be the
    //moved one before readding it to
    //the board 
    this.activePiece = nextPiece
  }

  //re add the current piece to the board
  this.setActivePieceOnBoard(true)
  return result
}



Game.prototype.hold = function() {
  if(this.canHold)
  {
    this.setActivePieceOnBoard(false)

    this.activePiece.x = 4
    this.activePiece.y = 2

    if (this.heldTetro == undefined) { //first hold of game
      //store current shape
      this.heldTetro = this.activePiece.tetro
      //create new shape
      this.spawnPiece()
    }
    else { 
      //swap held shape with active
      var tempPiece = this.heldTetro

      this.heldTetro = this.activePiece.tetro
      this.activePiece.tetro = tempPiece
    }
    this.setActivePieceOnBoard(true)

    this.canHold = false
  }
}



//keeps moving the piece down until 
//it can't be moved anymore
Game.prototype.instantPlace = function() {
  //move() returns false when it
  //can't move, so just loop
  //until it stops returning true
  while (this.move(directions.DOWN)) {}
  this.lastUpdateFailed = true
  this.update()
}



//the action to be performed when the player
//tries to spin the active piece. Checks if the new
//piece will fit in the level and not overlap
Game.prototype.spin = function(clockwise) {
  var success = false

  this.setActivePieceOnBoard(false)

  var rotatedPiece = new Piece(
    new Tetromino(
      this.activePiece.tetro.colour,
      this.activePiece.tetro.grid
    ),
    this.activePiece.x,
    this.activePiece.y
  )
  rotatedPiece.tetro.rotate(clockwise)

  //try moving left to avoid the boundary
  var counter = 0
  const maxMove = 2
  var originalX = rotatedPiece.x //reset to this if first test fails

  success = !this.pieceOutOfBounds(rotatedPiece) && 
            !this.pieceWouldOverlap(rotatedPiece)
  
  //move left until success or moved maxMove
  while (!success && counter < maxMove) {
    ++counter
    --rotatedPiece.x
    success = !this.pieceOutOfBounds(rotatedPiece) && 
              !this.pieceWouldOverlap(rotatedPiece)
  }

  //try moving right if that didn't work
  if (!success) {
    rotatedPiece.x = originalX //reset after trying left
    counter = 0 //reset counter
  }
  //move right until success or moved maxMove
  while (!success && counter < maxMove) {
    ++counter
    ++rotatedPiece.x
    success = !this.pieceOutOfBounds(rotatedPiece) && 
              !this.pieceWouldOverlap(rotatedPiece)
  }

  if (success) { //succeeded
    //replace the active shape with the spun one
    this.activePiece = rotatedPiece
  }

  //place the piece on the board whether it was
  //rotated or not
  this.setActivePieceOnBoard(true)
  return success
}



//sets whether the active piece is on the board
//or not. If the input is true, remove the active 
//piece from the board. Else, add it. 
Game.prototype.setActivePieceOnBoard = function(willAdd) {
  var thePiece = this.activePiece
  var grid = thePiece.tetro.grid

  for (var y = 0; y < grid.length; y++) {
    for (var x = 0; x < grid[0].length; x++) {
      if (grid[y][x] != 0) {
        var newValue = 0

        if (willAdd) {
          newValue = this.activePiece.tetro.colour
        }
        var yPos = thePiece.y + y
        var xPos = thePiece.x + x

        if (inBoardBoundaries(yPos, xPos)) {
          this.board[thePiece.y + y][thePiece.x + x] = newValue
        }
        else {
          console.log("tried to add active piece out of board")
        }
      }
    }
  }
}



//********************************************************************\\
//********************************************************************\\
//********************************************************************\\



var colours = [
    '#fff',    //white
    '#fa2400', //red
    '#fa7900', //orange
    '#fade00', //yellow
    '#00fa00', //green
    '#0069fa', //blue
    '#c600fa', //purple
    '#00defa', //lightblue
    '#ff00ff'  //magenta
  ]

var images = []


var aGame = new Game() //the main game object
var fastUpdateFreq = 40
var slowUpdateFreq = 750

//vars for key holding. not needed for holding down
//because that just changes to the fast update freq
var keyRepeatFreq = 105                //frequency to move when a move key is held
var heldKeyDirection = directions.NONE //the direction that the held key moves activePiece
var leftKeyHeld = false        
var rightKeyHeld = false
var timeOfKeyHold = 0
var timeSinceKeyHold = 0

function setup() {
  theCanvas = createCanvas(WIDTH + 50 + (3 * SQUARE_SIZE), HEIGHT)
  
  theCanvas.parent("p5parent")
  background(65)

  aGame.init()


  //load images for squares
  images[0] = loadImage('projects/webtris/resources/squares/red.png')
  images[1] = loadImage('projects/webtris/resources/squares/orange.png')
  images[2] = loadImage('projects/webtris/resources/squares/yellow.png')
  images[3] = loadImage('projects/webtris/resources/squares/green.png')
  images[4] = loadImage('projects/webtris/resources/squares/blue.png')
  images[5] = loadImage('projects/webtris/resources/squares/purple.png')
  images[6] = loadImage('projects/webtris/resources/squares/cyan.png')

  gameTime = millis()

  //probably move this
  textSize(50)
}



function draw() {
  if (!aGame.gameOver) {
    var updateFreq = slowUpdateFreq

    aGame.timeSinceLastUpdate = millis() - aGame.timeOfLastUpdate

    if (aGame.softDropping) {
      updateFreq = fastUpdateFreq
    }

    //update needed
    if (aGame.timeSinceLastUpdate >= updateFreq) {
      aGame.timeOfLastUpdate = millis()
      aGame.update()
    }

    //key repeating
    if (leftKeyHeld || rightKeyHeld) {
      timeSinceKeyHold = millis() - timeOfKeyHold
    }
    if (timeSinceKeyHold >= keyRepeatFreq) {
      aGame.move(heldKeyDirection)
      timeOfKeyHold = millis()
    }

    drawBoard(aGame.board)
    drawGuideLines(aGame.board)
    drawHoldSlot(aGame.heldTetro)
    drawQueue(aGame.tetroQueue)
  }
  else {
    //draw end game screen
    fill(255)
    textSize(50)
    text("Game Over", (width / 2) - 200, height / 2)
  }
}



//handle key events
function keyPressed() {
  switch (keyCode) {
    case 81: //q OR
    case 90: //z
      aGame.spin(false)
      break;

    case 69: //e OR
    case 88: //x
      aGame.spin(true)
      break

    case 38: //up arrow
      aGame.spin(true)
      break

    case 40: //down arrow OR
    case 83: //s
      aGame.softDropping = true
      break

    case 65: //a OR
    case 37: //left arrow
      aGame.move(directions.LEFT)

      leftKeyHeld = true
      heldKeyDirection = directions.LEFT
      timeOfKeyHold = millis()
      break

    case 68: //d OR
    case 39: //right arrow
      aGame.move(directions.RIGHT)

      rightKeyHeld = true
      heldKeyDirection = directions.RIGHT
      timeOfKeyHold = millis()
      break

    case 67: //c
      aGame.hold()
      break

    case 32: //space
      aGame.instantPlace()
      break

    //debug keys
    case 89: //y
      aGame.setActivePieceOnBoard(false)
      break

    case 85: //u
      aGame.setActivePieceOnBoard(true)
      break

    case 77: //m
      aGame.move(directions.DOWN)
      break

    case 73:
      aGame.setActivePieceOnBoard(false)
      aGame.activePiece.tetro = Tetromino.presets.iShape
      aGame.setActivePieceOnBoard(true)
      break

  }
}



function keyReleased() {
  switch (keyCode) {
    case 65: //a OR
    case 37: //left arrow OR
      leftKeyHeld = false
      
      //check if should revert to other
      //direction or stop moving
      if (rightKeyHeld) {
        heldKeyDirection = directions.RIGHT
      }
      else {
        heldKeyDirection = directions.NONE
      }
      break

    case 68: //d OR
    case 39: //right arrow
      rightKeyHeld = false
      
      //check if should revert to other
      //direction or stop moving
      if (leftKeyHeld) {
        heldKeyDirection = directions.LEFT
      }
      else {
        heldKeyDirection = directions.NONE
      }
      break

    case 40: //down arrow OR
    case 83: //s
      //go back to normal update frequency
      aGame.softDropping = false

      //make it so there won't be another update
      //instantly after letting go
      aGame.timeOfLastUpdate = millis()
      break
  }
}



//checks if given x and y coordinates
//are in the board, includes all 
//edges
function inBoardBoundaries(yPos, xPos) {
  return (xPos >= 0) &&
         (yPos >= 0) &&
         (xPos < NUM_COLUMNS) &&
         (yPos < NUM_ROWS)
}



function drawBoard(aBoard) {
  //draw the background
  strokeWeight(1)
  for (var y = SQUARE_SIZE * 2; y < HEIGHT; y += 3) {
    stroke('#111')
    line(0, y, WIDTH - 1, y)
    stroke('#222')
    line(0, y + 1, WIDTH - 1, y + 1)
    line(0, y + 2, WIDTH - 1, y + 2)
  }

  // //DEBUG: draw the active piece's whole grid
  // var thePiece = aGame.activePiece
  // var theGrid = thePiece.tetro.grid
  // for (var y = 0; y < theGrid.length; y++) {
  //   for (var x = 0; x < theGrid[0].length; x++) {
  //     var xLoc = thePiece.x + x
  //     var yLoc = thePiece.y + y

  //     xLoc *= SQUARE_SIZE
  //     yLoc *= SQUARE_SIZE

  //     fill('#ff00ff')
  //     rect(xLoc, yLoc, SQUARE_SIZE, SQUARE_SIZE)
  //   }
  // }

  //draw all non-empty squares
  stroke(0, 0, 0) //black
  for (var y = 2; y < NUM_ROWS; y++) {
    for (var x = 0; x < NUM_COLUMNS; x++) {
      var square = aBoard[y][x]

      //don't draw if the value is zero,
      //that's an empty space
      if (square != 0) {
        fill(colours[square])
        //use this to draw rects instead of images
        //rect(SQUARE_SIZE * x, SQUARE_SIZE * y, SQUARE_SIZE, SQUARE_SIZE) 
        var squareImage = images[square - 1] //-1 because 0 is used for blank
        image(
          squareImage, 
          x * SQUARE_SIZE, 
          y * SQUARE_SIZE, 
          squareImage.width * IMG_SCALE, 
          squareImage.height * IMG_SCALE)
      }
    }
  }

}



//draw the guidelines either side of
//the active piece
function drawGuideLines(theGame) {
  //draw guide lines
  stroke(75, 75, 75) //lightgray
  var bounds = aGame.activePiece.tetro.bounds
  
  var leftX = (aGame.activePiece.x + bounds[0][1]) * SQUARE_SIZE
  var rightX = (aGame.activePiece.x + bounds[1][1] + 1) * SQUARE_SIZE
  line(leftX, SQUARE_SIZE * 2, leftX, height)
  line(rightX, SQUARE_SIZE * 2, rightX, height)
}



function drawHoldSlot(shapeInSlot) {
  fill(255)
  textSize(20)
  text("Hold", SQUARE_SIZE * 11, 12.5 * SQUARE_SIZE)

  fill('#555')
  var scale = 0.6

  rect(
    SQUARE_SIZE * 11,
    SQUARE_SIZE * 13,
    SQUARE_SIZE * 4 * scale,
    SQUARE_SIZE * 4 * scale
  )
  //only if there is a shape in hold
  if (shapeInSlot != undefined) {
    drawShape(
      shapeInSlot,
      scale,
      SQUARE_SIZE * 11,
      SQUARE_SIZE * 13
  )
  }
}



//NOT for drawing the active shape, that should be drawn
//as part of the grid. This just draws a picture of a shape
//at a given location and scale
function drawShape(shape, scale, xPos, yPos) {
  for (var y = 0; y < shape.grid.length; ++y) {
    for (var x = 0; x < shape.grid[0].length; ++x) {
      
      if (shape.grid[y][x] != 0) {
        var squareImage = images[shape.colour - 1]

        image(
              squareImage, 
              xPos + (x * SQUARE_SIZE * scale), 
              yPos + (y * SQUARE_SIZE * scale), 
              SQUARE_SIZE * scale, 
              SQUARE_SIZE * scale
        )
      }
    }
  }
}



function drawQueue(aQueue) {
  var scale = 0.6

  fill(255)
  textSize(20)
  text("Queue", SQUARE_SIZE * 11, 2.5 * SQUARE_SIZE)
  //fill the first one in a lighter colour
  fill ('#aaa')
  for (var i = 0; i < aGame.queueSize; ++i) {
    var xPos = (SQUARE_SIZE * 11),
        yPos = (3 * SQUARE_SIZE) + (i*SQUARE_SIZE * 3)
    //draw background
    rect(
      xPos,
      yPos,
      SQUARE_SIZE * 4 * scale,
      SQUARE_SIZE * 4 * scale
    )
    drawShape(
      aQueue.getNthElement(i),
      0.6,
      xPos,
      yPos
    )
    fill('#555')
  }

  //drawShape(Tetromino.presets.leftStairShape, 0.7, 100, 100)
}



//debug function for drawing dots at board coordinates
function drawDotAtPos(xPos, yPos) {
  fill('#ff00ff')
  ellipse(xPos * SQUARE_SIZE, yPos * SQUARE_SIZE, 5, 5)
}