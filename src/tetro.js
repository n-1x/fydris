import { COLOUR, DIRECTION } from './constants.js'

class Tetro {
  constructor(colour, grid, srsObj) {
    this.rotations = [];
    this.colour = colour;
    this.srs = srsObj;
    
    //the given grid will be rotation[0] of the Tetro
    this.rotations[0] = grid;

    //private function for generating the rotations of the tetro
    //around srs point 1
    const rotateGrid = function(grid, direction) {
      const newGrid = []; //will hold all the new rows
      const oldWidth = grid[0].length;
      const oldHeight = grid.length;
        
      for (let y = 0; y < oldWidth; ++y) {
        const newRow = []; //first row of the new shape
  
        for (let x = 0; x < oldHeight; ++x) {
          if (direction === DIRECTION.CLOCKWISE) {
            newRow[x] = grid[oldHeight - x - 1][y];
          }
          else { //rotate anti-clockwise
            newRow[x] = grid[x][oldWidth - y - 1];
          }
        }
        //add the new row
        newGrid[y] = newRow;
      }
  
      return newGrid;
    }

    //generate the other 3 rotations
    for(let i = 0; i < 3; ++i) {
      this.rotations.push(rotateGrid(this.rotations[i], DIRECTION.CLOCKWISE));
    }
  }
}


//defines a tetro that can be moved and spun by the player
export class ActiveTetro {
  constructor(tetro = TETRO.iShape) {
    this.tetro = tetro;
    this.pos = { row: 0, col: 3 };
    this.orientation = 0;
    this.grid = this.tetro.rotations[this.orientation];

    //make sure that the o piece is centered
    if (this.tetro === TETRO.oShape) {
      ++this.pos.col;
    }
  }
}


export class TetroBag {
  constructor() {
    this.bag = [];
    this.fillBag();
  }

  
  fillBag() {
    this.bag = Object.values(TETRO);

    //shuffle the bag
    for (let i = 0; i < this.bag.length; ++i) {
      const r = i + Math.floor(Math.random() * this.bag.length - i);
      [this.bag[i], this.bag[r]] = [this.bag[r], this.bag[i]];
    }
  }


  take() {
    if (this.bag.length === 0) {
      this.fillBag();
    }

    return this.bag.shift();
  }
}

const SRS_I = [ //SRS Points
  [ //NORTH
    [0, 1],
    [3, 1],
    [0, 1],
    [3, 1]
  ],
  [ //EAST
    [2, 1],
    [2, 1],
    [2, 0],
    [2, 3]
  ],
  [ //SOUTH
    [3, 1],
    [0, 1],
    [3, 2],
    [0, 2]
  ],
  [ //WEST
    [1, 1],
    [1, 1],
    [1, 3],
    [1, 0]
  ]
];

const SRS_T = [
  [ //NORTH
    [1, 1],
    [1, 1],
    [1, 1],
    [1, 1]
  ],
  [ //EAST
    [2, 1],
    [2, 2],
    [1, -1],
    [2, -1]
  ],
  [ //SOUTH
    [1, 1],
    [1, 1],
    [1, 1],
    [1, 1]
  ],
  [ //WEST
    [0, 1],
    [0, 2],
    [1, -1],
    [0, -1]
  ]
];

const SRS_JL = [
  [ //NORTH
    [1, 1],
    [1, 1],
    [1, 1],
    [1, 1]
  ],
  [ //EAST
    [2, 1],
    [2, 2],
    [1, -1],
    [2, -1]
  ],
  [ //SOUTH
    [1, 1],
    [1, 1],
    [1, 1],
    [1, 1]
  ],
  [ //WEST
    [0, 1],
    [0, 2],
    [1, -1],
    [0, -1]
  ]
];

const SRS_SZ = [
  [ //NORTH
    [1, 1],
    [1, 1],
    [1, 1],
    [1, 1]
  ],
  [ //EAST
    [2, 1],
    [2, 2],
    [1, -1],
    [2, -1]
  ],
  [ //SOUTH
    [1, 1],
    [1, 1],
    [1, 1],
    [1, 1]
  ],
  [ //WEST
    [0, 1],
    [0, 2],
    [1, -1],
    [0, -1]
  ]
];

export const TETRO = {
  iShape: new Tetro(COLOUR.LIGHT_BLUE, [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ], SRS_I),

  tShape: new Tetro(COLOUR.PURPLE, [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ], SRS_T),

  lShape: new Tetro(COLOUR.ORANGE, [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ], SRS_JL),

  jShape: new Tetro(COLOUR.BLUE, [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ], SRS_JL),

  oShape: new Tetro(COLOUR.YELLOW, [
    [1, 1],
    [1, 1]
  ], []), //doesn't change when rotated so no SRS

  sShape: new Tetro(COLOUR.GREEN, [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ], SRS_SZ),

  zShape: new Tetro(COLOUR.RED, [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ], SRS_SZ)
};