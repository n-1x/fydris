import { TETRO, TetroBag, ActiveTetro } from './tetro'
import { 
  BOARD_HEIGHT, BOARD_WIDTH, NEXT_SIZE,
  MAX_LEVEL, FIXED_GOAL, DIRECTION, COLOUR, MOVE } from './constants'
import { gridForEach, gridSome } from './helpers'

//return the 4 tSpin points based on the orientation
//given. Only needs to be called when precomputing the points
function getTPoints(orientation) {
  let p = [ //MAYBE CHANGE THIS TO CONST!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    [0, 0], //A
    [0, 2], //B
    [2, 2], //C
    [2, 0]  //D
  ]

  //because the tspin points are the corners of a grid
  //rotating them is just the same as cycling their position
  for (let i = 0; i < orientation; ++i) {
    [p[0], p[1], p[2], p[3]] = [p[1], p[2], p[3], p[0]]
  }

  return p
}

//precompute all tSpin Points. This should be
//indexed by the t piece's orientation to
//get the points in the right order
const TPOINTS = [
  getTPoints(0),
  getTPoints(1),
  getTPoints(2),
  getTPoints(3)
]


function checkTPoints(board, pos, orientation) {
  const tPoints = TPOINTS[orientation]
  const freePoints = []

  TPOINTS[orientation].forEach((tPoint, index) => {
    const row = pos.row + tPoint[0]
    const col = pos.col + tPoint[1]

    freePoints[index] = !board[row] || board[row][col] != 0
  })

  return freePoints
}


class Game {
  constructor() {
    this.gameOver = false
    this.ghostOffset = 0
    this.tetroBag = new TetroBag()
    this.next = []
    this.holdSlot = null
    this.score = 0
    this.moveType = {
      move: MOVE.NONE,
      rows: 0,
      backToBack: false
    }
    this.level = 1
    this.goal = 5
    this.fallTime = 1 //seconds per line
    this.softDropping = false

    this.stats = {
      rowsCleared: 0,
      tetrises: 0,
      tSpins: 0,
      tSpinMinis: 0
    }

    this.initBoard()
    this.initNext()
    this.nextTetro()
  }
  
  
  initBoard() {
    this.board = []
    
    //fill the board with height arrays of length width
    //all filled with zeroes
    for(let y = 0; y < BOARD_HEIGHT; ++y) {
      const row = []
      
      for(let x = 0; x < BOARD_WIDTH; ++x) {
        row.push(0)
      }
      
      this.board.push(row)
    }
  }
  

  initNext() {
    for(let i = 0; i < NEXT_SIZE; ++i) {
      this.next.push(this.tetroBag.take())
    }
  }


  fall() {
    if (!this.move(DIRECTION.DOWN)) {
      this.finishTurn()
    }

    let newObject = {}
    Object.assign(newObject, this.moveType)

    //reset the move for the next turn
    this.moveType.move = MOVE.NONE
    this.moveType.rows = 0

    return newObject
  }


  calculateFallSpeed() {
    //algorithm from the tetris guideline
    this.fallTime = Math.pow((0.8 - ((this.level - 1) * 0.007)), this.level - 1)
  }


  isPieceOnSurface() {
    return this.ghostOffset == 0
  }


  finishTurn() {
    this.placeTetro()
    
    const rowsCleared = this.clearFullRows()
    this.moveType.rows = rowsCleared
    let moveScore = 0

    //tracks whether the move contributes to a back to back bonus
    let backToBackMove = false

    //nonBreakingMoves can't start a back to back chain
    //and don't give the bonus, but they also don't break it
    let nonBreakingMove = false

    switch (this.moveType.move) {
      case MOVE.NONE:
        switch(rowsCleared) {
          case 1:
            moveScore = 100;
            break

          case 2:
            moveScore = 300;
            break

          case 3:
            moveScore = 500;
            break

          case 4:
            backToBackMove = true
            ++this.stats.tetrises
            moveScore = 800;
            break
        }
        break

      case MOVE.TSPIN_MINI:
        backToBackMove = true
        ++this.stats.tSpinMinis

        switch(rowsCleared) {
          case 0:
            nonBreakingMove = true
            moveScore = 100
            break

          case 1:
            moveScore = 200
            break
        }
        break

      case MOVE.TSPIN:
        ++this.stats.tSpins
        backToBackMove = true

        switch(rowsCleared) {
          case 0:
            nonBreakingMove = true
            moveScore = 400
            break

          case 1:
            moveScore = 800
            break

          case 2:
            moveScore = 1200
            break

          case 3:
            moveScore = 1600
            break
        }
        break
    }

    //use the move score to calculate the number of line clears to award
    //needs to be done when score is the value for level 1
    let rowClears = Math.floor(moveScore / 100)

    //scale the score for the level
    moveScore *= this.level

    //apply back to back bonuses
    if (this.moveType.backToBack && backToBackMove && !nonBreakingMove) {
      rowClears = Math.floor(rowClears * 1.5)
      moveScore = Math.floor(moveScore * 1.5)
    }

    console.log(`Awarding ${rowClears} row clears`)

    //set the value of backtoback to be used for the next finishTurn()
    this.moveType.backToBack = this.moveType.backToBack || 
     (backToBackMove && !nonBreakingMove)

    //add the score to the current level
    this.score += moveScore

    //add the row clears
    this.stats.rowsCleared += rowClears

    //needs to be after the rows are cleared so 
    //ghost offset is correct
    this.nextTetro()

    //currenly uses the fixed goal system
    if (this.stats.rowsCleared >= this.goal) {
      //cap the score at MAX_LEVEL
      ++this.level
      this.goal += this.level * 5
      this.calculateFallSpeed()

      //end of game in marathon mode
      if (this.level > MAX_LEVEL) {
        this.level = maxLevel
        this.gameOver = true
      }
    }
  }


  tetroFitsOnBoard(tetroGrid, rowPos, colPos) {
    //return !someCell is full
    return !gridSome(tetroGrid, (cell, r, c) => {
      let cellFree = true
      //if the cell of tetroGrid is not empty
      if (cell) {
        const row = this.board[r + rowPos]
        
        //if row is undefined then the cell won't be checked
        cellFree = row && row[c + colPos] === 0
      }
  
      return !cellFree
    })
  }


  calculateGhostOffset() {
    const pos = this.activeTetro.pos
    this.ghostOffset = 0
    
    while (this.tetroFitsOnBoard(
            this.activeTetro.grid,
            pos.row + this.ghostOffset + 1,
            pos.col)) {
      ++this.ghostOffset
    }
  }


  clearRow(rowNum) {
    //from the row upwards, copy from the cell above
    for(let r = rowNum; r >= 0; --r) {
      const row = this.board[r]
      
      row.forEach((cell, cellNum) => {
        let newVal = 0 //empty cell
        
        //if not top row
        if (r != 0) {
          newVal = this.board[r - 1][cellNum]
        }
        
        this.board[r][cellNum] = newVal
      })
    }
  }


  clearFullRows() {
    let rowsCleared = 0

    this.board.forEach((row, rowNum) => {
      const emptyFound = row.some(cell => cell == 0)

      if (!emptyFound) {
        this.clearRow(rowNum)        
        ++rowsCleared
      }
    })

    return rowsCleared
  }


  nextTetro() {
    const newTetro = new ActiveTetro(this.next.shift())
    this.next.push(this.tetroBag.take())

    if (this.tetroFitsOnBoard(newTetro.tetro.rotations[0],
                              newTetro.pos.row,
                              newTetro.pos.col)) {
      this.activeTetro = newTetro
    } else {
      this.gameOver = true
    }

    this.calculateGhostOffset()
    this.canHold = true
  }


  holdTetro() {
    const success = this.canHold

    if (this.canHold) {
      if (this.holdSlot) {
        [this.holdSlot, this.activeTetro] = [this.activeTetro.tetro, 
                                             new ActiveTetro(this.holdSlot)]

        this.calculateGhostOffset()
      } else {
        this.holdSlot = this.activeTetro.tetro
        this.nextTetro()
      }
      
      this.canHold = false
    }

    return success
  }


  spin(direction) {
    const thisTetro = this.activeTetro
    const pos = thisTetro.pos
    let spinPossible = false
    let newOrientation = thisTetro.orientation

    if (direction === DIRECTION.CLOCKWISE) {
      newOrientation = (newOrientation + 1) % 4
    }
    else if (direction === DIRECTION.ANTI_CLOCKWISE) {
      newOrientation = (newOrientation - 1) % 4
    }
    
    const spunGrid = this.activeTetro.tetro.rotations[newOrientation]
    const oldPoints = thisTetro.tetro.rotations[thisTetro.orientation].points
    const newPoints = thisTetro.tetro.rotations[newOrientation].points
    let rowTranslate = 0
    let colTranslate = 0
    let pointCounter = 0 //index 0 is point 2

    //attempt normal spin by checking if new grid fits on board
    spinPossible = this.tetroFitsOnBoard(spunGrid, pos.row, pos.col)
    
    //for each of the rotation points, until a fit is found
    while (!spinPossible && pointCounter < 4) {
      const oldPoint = oldPoints[pointCounter]
      const newPoint = newPoints[pointCounter]

      rowTranslate = oldPoint[0] - newPoint[0]
      colTranslate = oldPoint[1] - newPoint[1]

      spinPossible = this.tetroFitsOnBoard(spunGrid, pos.row + rowTranslate, 
                                                  pos.col + colTranslate)
      ++pointCounter
    }
    

    //if a valid spin was found apply it
    if (spinPossible) {
      //apply the translation
      thisTetro.pos.row += rowTranslate
      thisTetro.pos.col += colTranslate

      //switch to the spunGrid
      thisTetro.orientation = newOrientation
      thisTetro.grid = spunGrid
      
      //check for tspin
      if (this.activeTetro.tetro == TETRO.tShape) {
          //these hold a boolean stating whether point a, b, c or d is full
          const [A, B, C, D] = checkTPoints(this.board, thisTetro.pos, newOrientation)

          if (pointCounter == 3 || ((A && B) && (C || D))) {
            this.moveType.move = MOVE.TSPIN
          }
          else if ((C && D) && (A || B)) {
            this.moveType.move = MOVE.TSPIN_MINI
          }
      }

    }

    this.calculateGhostOffset()

    return spinPossible
  }


  move(direction) {
    let rowNum = this.activeTetro.pos.row
    let colNum = this.activeTetro.pos.col
    let success = false

    switch(direction) {
      case DIRECTION.LEFT:
        --colNum
        break

      case DIRECTION.RIGHT:
        ++colNum
        break

      case DIRECTION.DOWN:
        if (this.softDropping) {
          ++this.score
        }
        ++rowNum
        break
    }

    //when moving down, always successful unless the piece is in
    //the same place as its ghost
    if (direction != DIRECTION.DOWN) {
      success = this.tetroFitsOnBoard(this.activeTetro.grid, rowNum, colNum)
    }
    else {
      if (this.ghostOffset != 0) {
        success = true

        //when moving down, the ghost offset just needs to decrease by 1
        --this.ghostOffset
      }
    }
    
    //actually move the piece if the move is allowed
    if (success) {
      this.activeTetro.pos.row = rowNum
      this.activeTetro.pos.col = colNum
      this.calculateGhostOffset()
    }

    return success
  }


  placeTetro() {
    gridForEach(this.activeTetro.grid, (cell, r, c) => {
      if(cell) {
        const rowPos = r + this.activeTetro.pos.row
        const colPos = c + this.activeTetro.pos.col
        const colour = this.activeTetro.tetro.colour
        const colourIndex = Object.values(COLOUR).indexOf(colour)

        this.board[rowPos][colPos] = colourIndex
      }
    })
  }


  hardDrop() {
    this.score += 2 * this.ghostOffset
    //move the tetro to its ghost
    this.activeTetro.pos.row += this.ghostOffset
    this.finishTurn()
  }
}

export default Game