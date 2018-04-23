import { BOARD_WIDTH, BOARD_HEIGHT, COLOUR, DIRECTION } from './constants'

class Tetro {
  constructor(colour, grid) {
    this.rotations = []
    this.colour = colour
    
    //the given grid will be rotation[0] of the Tetro
    this.rotations[0] = grid

    //private function for generating the rotations of the tetro
    const rotateGrid = function(grid, direction) {
      const newGrid = [] //will hold all the new rows
      const oldWidth = grid[0].length
      const oldHeight = grid.length
        
      for (let y = 0; y < oldWidth; ++y) {
        const newRow = [] //first row of the new shape
  
        for (let x = 0; x < oldHeight; ++x) {
          if (direction == DIRECTION.CLOCKWISE) {
            newRow[x] = grid[oldHeight - x - 1][y]
          }
          else { //rotate anti-clockwise
            newRow[x] = grid[x][oldWidth - y - 1]
          }
        }
        //add the new row
        newGrid[y] = newRow
      }
  
      return newGrid
    }

    //generate the other 3 rotations
    for(let i = 0; i < 3; ++i) {
      this.rotations.push(rotateGrid(this.rotations[i], DIRECTION.CLOCKWISE))
    }
  }
}


//defines a tetro that can be moved and spun by the player
export class ActiveTetro {
  constructor(tetro = TETRO.iShape) {
    this.tetro = tetro
    this.pos = { row: 19, col: BOARD_WIDTH / 2 - 1 }
    this.orientation = 0
    this.grid = this.tetro.rotations[this.orientation]

    //make sure that the l piece is centered
    if (this.tetro == TETRO.iShape) {
      this.pos.col = BOARD_WIDTH / 2 - 2
    }
  }
}


export class TetroBag {
  constructor() {
    this.bag = []
    this.fillBag()
  }

  
  fillBag() {
    this.bag = Object.values(TETRO)

    //shuffle the bag
    for (let i = this.bag.length - 1; i > 0; --i) {
      const r = Math.floor(Math.random() * i);
      [this.bag[i], this.bag[r]] = [this.bag[r], this.bag[i]]
    }
  }


  take() {
    if (this.bag.length === 0) {
      this.fillBag()
    }

    return this.bag.shift()
  }
}


export const TETRO = {
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
}