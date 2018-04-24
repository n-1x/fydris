import { TetroBag, ActiveTetro } from './tetro'
import { 
  BOARD_HEIGHT, BOARD_WIDTH, NEXT_SIZE,
  MAX_LEVEL, FIXED_GOAL, DIRECTION, COLOUR } from './constants'
import { gridForEach, gridSome } from './helpers'

class Game {
  constructor() {
    this.gameOver = false
    this.ghostOffset = 0
    this.tetroBag = new TetroBag()
    this.next = []
    this.holdSlot = null
    this.score = 0
    this.level = 1
    this.fallTime = 1 //seconds per line
    this.softDropping = false

    this.stats = {
      rowsCleared: 0,
      tetrises: 0
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
    
    this.stats.rowsCleared += rowsCleared

    //update the score
    switch(rowsCleared) {
      case 1:
      this.score += 100 * this.level
      break
      
      case 2:
      this.score += 200 * this.level
      break
      
      case 3:
      this.score += 500 * this.level
      break
      
      case 4:
      this.score += 800 * this.level
      ++this.stats.tetrises
      break
    }
    //needs to be after the rows are cleared so 
    //ghost offset is correct
    this.nextTetro()

    //currenly uses the fixed goal system
    if (this.stats.rowsCleared >= this.level * FIXED_GOAL) {
      //cap the score at MAX_LEVEL
      ++this.level

      this.calculateFallSpeed()

      //end of game in marathon mode
      if (this.level > MAX_LEVEL) {
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
        let newVal = 0
        
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
    const pos = this.activeTetro.pos
    let spinPossible = true
    let newOrientation = this.activeTetro.orientation

    if (direction === DIRECTION.CLOCKWISE) {
      ++newOrientation
    }
    else if (direction === DIRECTION.ANTI_CLOCKWISE) {
      --newOrientation
    }

    //make it circular
    if (newOrientation < 0) {
      newOrientation = 3
    }
    else if (newOrientation> 3) {
      newOrientation = 0
    }

    const spunGrid = this.activeTetro.tetro.rotations[newOrientation]

    spinPossible = this.tetroFitsOnBoard(spunGrid, pos.row, pos.col)

    if (spinPossible) {
      this.activeTetro.orientation = newOrientation
      this.activeTetro.grid = spunGrid
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

export { DIRECTION }
export default Game