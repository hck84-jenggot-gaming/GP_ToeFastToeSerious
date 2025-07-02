// Simple AI logic for Tic Tac Toe
// This uses a priority-based approach, not minimax (keeping it simple)

function getBestMove(gameState, playerSign) {
  // Convert 2D array to 1D for easier processing
  const flatBoard = gameState.flat();

  // Get available moves - FIXED: check for null instead of number
  const availableMoves = [];
  for (let i = 0; i < flatBoard.length; i++) {
    if (flatBoard[i] === null) {
      availableMoves.push(i);
    }
  }

  if (availableMoves.length === 0) return null;

  // Opponent sign
  const opponentSign = playerSign === "cross" ? "circle" : "cross";

  // Priority 1: Check if AI can win
  for (const move of availableMoves) {
    const testBoard = [...flatBoard];
    testBoard[move] = playerSign;
    if (checkWin(testBoard, playerSign)) {
      return move;
    }
  }

  // Priority 2: Block opponent from winning
  for (const move of availableMoves) {
    const testBoard = [...flatBoard];
    testBoard[move] = opponentSign;
    if (checkWin(testBoard, opponentSign)) {
      return move;
    }
  }

  // Priority 3: Take center if available
  if (availableMoves.includes(4)) {
    return 4;
  }

  // Priority 4: Take corners
  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter((corner) =>
    availableMoves.includes(corner)
  );
  if (availableCorners.length > 0) {
    return availableCorners[
      Math.floor(Math.random() * availableCorners.length)
    ];
  }

  // Priority 5: Take any available edge
  const edges = [1, 3, 5, 7];
  const availableEdges = edges.filter((edge) => availableMoves.includes(edge));
  if (availableEdges.length > 0) {
    return availableEdges[Math.floor(Math.random() * availableEdges.length)];
  }

  // Fallback: Return first available move
  return availableMoves[0];
}

function checkWin(board, player) {
  // All possible winning combinations
  const winPatterns = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal top-left to bottom-right
    [2, 4, 6], // Diagonal top-right to bottom-left
  ];

  return winPatterns.some((pattern) => {
    return pattern.every((index) => board[index] === player);
  });
}

module.exports = {
  getBestMove,
};
