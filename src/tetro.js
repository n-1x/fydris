import { BOARD_WIDTH, COLOUR, DIRECTION } from './constants.js'

class Tetro {
  constructor(colour, grid, srsObj) {
    this.rotations = [];
    this.colour = colour;
    
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

    this.rotations[0].points = srsObj.NORTH;
    this.rotations[1].points = srsObj.EAST;
    this.rotations[2].points = srsObj.SOUTH;
    this.rotations[3].points = srsObj.WEST;
  }
}


//defines a tetro that can be moved and spun by the player
export class ActiveTetro {
  constructor(tetro = TETRO.iShape) {
    this.tetro = tetro;
    this.pos = { row: 19, col: BOARD_WIDTH / 2 - 1 };
    this.orientation = 0;
    this.grid = this.tetro.rotations[this.orientation];

    //make sure that the l piece is centered
    if (this.tetro === TETRO.iShape) {
      this.pos.col = BOARD_WIDTH / 2 - 2;
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


export const TETRO = {
  iShape: new Tetro(COLOUR.LIGHT_BLUE, [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  { //Offsets for SRS Points
    NORTH: [
      [1, 0], //point 2
      [1, 3], //point 3
      [1, 0], //point 4
      [1, 3]  //point 5
    ],

    EAST: [
      [1, 2],
      [1, 2],
      [0, 2],
      [3, 2]
    ],

    SOUTH: [
      [1, 3],
      [1, 0],
      [2, 3],
      [2, 0]
    ],

    WEST: [
      [1, 1],
      [1, 1],
      [3, 1],
      [0, 1]
    ]
  }),

  jShape: new Tetro(COLOUR.BLUE, [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ], {
    NORTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    EAST: [
      [1, 2],
      [2, 2],
      [-1, 1],
      [-1, -2]
    ],

    SOUTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    WEST: [
      [0, 1],
      [2, 0],
      [-1, 1],
      [-1, 0]
    ]
  }),

  lShape: new Tetro(COLOUR.ORANGE, [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ], {
    NORTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    EAST: [
      [1, 2],
      [2, 2],
      [-1, 1],
      [-1, 2]
    ],

    SOUTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    WEST: [
      [1, 0],
      [2, 0],
      [-1, 1],
      [-1, 0]
    ]
  }),

  oShape: new Tetro(COLOUR.YELLOW, [
    [1, 1],
    [1, 1]
  ], {
    NORTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    EAST: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    SOUTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    WEST: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ]
  }),

  sShape: new Tetro(COLOUR.GREEN, [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ], {
    NORTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    EAST: [
      [1, 2],
      [2, 2],
      [-1, 1],
      [-1, 2]
    ],

    SOUTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    WEST: [
      [1, 0],
      [2, 0],
      [-1, 1],
      [-1, 0]
    ]
  }),

  tShape: new Tetro(COLOUR.PURPLE, [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ], {
    NORTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    EAST: [
      [1, 2],
      [2, 2],
      [-1, 1],
      [-1, 2]
    ],

    SOUTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    WEST: [
      [1, 0],
      [2, 0],
      [-1, 1],
      [-1, 0]
    ]
  }),

  zShape: new Tetro(COLOUR.RED, [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ], {
    NORTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    EAST: [
      [1, 2],
      [2, 2],
      [-1, 1],
      [-1, 2]
    ],

    SOUTH: [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1]
    ],

    WEST: [
      [1, 0],
      [2, 0],
      [-1, 1],
      [-1, 0]
    ]
  })
};