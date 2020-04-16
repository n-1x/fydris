//run the some function on a grid
export function gridSome(grid, func) {
  return grid.some((row, rowNum) => {
    return row.some((cell, colNum) => {
      return func(cell, rowNum, colNum);
    });
  });
}

//run the for each function on a grid
export function gridForEach(grid, func) {
  grid.forEach((row, rowNum) => {
    row.forEach((cell, colNum) => {
      func(cell, rowNum, colNum);
    });
  });
}