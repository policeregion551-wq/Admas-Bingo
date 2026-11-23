import { BingoCell, BingoWinResult } from '../types';

export const BINGO_LETTERS: Array<'B' | 'I' | 'N' | 'G' | 'O'> = ['B', 'I', 'N', 'G', 'O'];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getLetterForNumber(num: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

export function generateBingoCard(): BingoCell[][] {
  const columns: number[][] = [];
  for (let col = 0; col < 5; col++) {
    const min = col * 15 + 1;
    const pool = Array.from({ length: 15 }, (_, idx) => min + idx);
    columns.push(shuffleArray(pool).slice(0, 5));
  }

  const grid: BingoCell[][] = [];
  for (let row = 0; row < 5; row++) {
    const rowCells: BingoCell[] = [];
    for (let col = 0; col < 5; col++) {
      const isCenter = row === 2 && col === 2;
      rowCells.push({
        row,
        col,
        letter: BINGO_LETTERS[col],
        value: isCenter ? 'FREE' : columns[col][row],
        daubed: isCenter,
      });
    }
    grid.push(rowCells);
  }
  return grid;
}

export function createShuffledDeck(): number[] {
  const allBalls = Array.from({ length: 75 }, (_, i) => i + 1);
  return shuffleArray(allBalls);
}

export function evaluateBingoCard(
  grid: BingoCell[][],
  calledNumbers: Set<number>
): BingoWinResult {
  const isValidDaub = (cell: BingoCell) =>
    cell.value === 'FREE' || (cell.daubed && calledNumbers.has(cell.value));

  // Check 5 rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(isValidDaub)) {
      return {
        hasWin: true,
        pattern: 'row',
        winningCoords: grid[r].map((c) => `${c.row}-${c.col}`),
      };
    }
  }

  // Check 5 columns
  for (let c = 0; c < 5; c++) {
    const colCells = [grid[0][c], grid[1][c], grid[2][c], grid[3][c], grid[4][c]];
    if (colCells.every(isValidDaub)) {
      return {
        hasWin: true,
        pattern: 'column',
        winningCoords: colCells.map((cell) => `${cell.row}-${cell.col}`),
      };
    }
  }

  // Main diagonal
  const diag1 = [grid[0][0], grid[1][1], grid[2][2], grid[3][3], grid[4][4]];
  if (diag1.every(isValidDaub)) {
    return {
      hasWin: true,
      pattern: 'diagonal',
      winningCoords: diag1.map((cell) => `${cell.row}-${cell.col}`),
    };
  }

  // Anti-diagonal
  const diag2 = [grid[0][4], grid[1][3], grid[2][2], grid[3][1], grid[4][0]];
  if (diag2.every(isValidDaub)) {
    return {
      hasWin: true,
      pattern: 'diagonal',
      winningCoords: diag2.map((cell) => `${cell.row}-${cell.col}`),
    };
  }

  // Four corners
  const corners = [grid[0][0], grid[0][4], grid[4][0], grid[4][4]];
  if (corners.every(isValidDaub)) {
    return {
      hasWin: true,
      pattern: 'four_corners',
      winningCoords: corners.map((cell) => `${cell.row}-${cell.col}`),
    };
  }

  return {
    hasWin: false,
    pattern: 'none',
    winningCoords: [],
  };
}

export function getMultiplierForBallCount(ballsDrawnCount: number): number {
  if (ballsDrawnCount <= 18) return 10;
  if (ballsDrawnCount <= 28) return 5;
  if (ballsDrawnCount <= 40) return 3;
  return 1.5;
}
