// geminiHelper.js
const { generateContent } = require("./gemini");
const { getBestMove } = require("./aiHelper");

async function getAIMove(gameState, playerSign) {
  try {
    // First, try to get move from Gemini
    console.log("Attempting to get move from Gemini AI...");
    const geminiMove = await getGeminiMove(gameState, playerSign);

    if (geminiMove !== null && isValidMove(gameState, geminiMove)) {
      console.log("Gemini AI suggested move:", geminiMove);
      return {
        bestMove: geminiMove,
        source: "gemini",
      };
    }
  } catch (error) {
    console.error("Gemini failed, using fallback AI:", error.message);
  }

  // Fallback to local AI helper
  const fallbackMove = getBestMove(gameState, playerSign);
  console.log("Fallback AI suggested move:", fallbackMove);
  return {
    bestMove: fallbackMove,
    source: "fallback",
  };
}

async function getGeminiMove(gameState, playerSign) {
  // Convert 2D array to 1D for easier processing
  const flatBoard = gameState.flat();

  // Create a board representation for Gemini
  const boardVisual = gameState
    .map((row, rowIdx) =>
      row
        .map((cell, colIdx) => {
          const pos = rowIdx * 3 + colIdx;
          if (cell === "cross") return "X";
          if (cell === "circle") return "O";
          return pos.toString();
        })
        .join(" | ")
    )
    .join("\n---------\n");

  const playerSymbol = playerSign === "cross" ? "X" : "O";
  const opponentSymbol = playerSign === "cross" ? "O" : "X";

  const prompt = `You are an expert Tic Tac Toe player. You are playing as ${playerSymbol} (${playerSign}).

Current board state:
${boardVisual}

Empty positions are shown as numbers 0-8.

Your task: Choose the BEST move for ${playerSymbol}.

Strategy priority:
1. Win immediately if possible
2. Block opponent from winning
3. Take center (position 4) if empty
4. Take corners (0, 2, 6, 8)
5. Take edges (1, 3, 5, 7)

IMPORTANT: Respond with ONLY a single number (0-8) representing your move. Nothing else.`;

  try {
    // Set timeout for Gemini API call (3 seconds for game responsiveness)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await generateContent(prompt);
    clearTimeout(timeoutId);

    // Parse the response
    let move;
    try {
      // Handle both JSON array and plain text responses
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        move = parsed[0];
      } else {
        move = parseInt(parsed);
      }
    } catch {
      // If not JSON, try to extract number from text
      const match = response.match(/\d/);
      if (match) {
        move = parseInt(match[0]);
      }
    }

    if (!isNaN(move) && move >= 0 && move <= 8) {
      return move;
    }

    throw new Error("Invalid move from Gemini: " + response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Gemini timeout - took too long to respond");
    }
    throw error;
  }
}

function isValidMove(gameState, moveIndex) {
  const flatBoard = gameState.flat();
  return moveIndex >= 0 && moveIndex <= 8 && flatBoard[moveIndex] === null;
}

module.exports = {
  getAIMove,
  getGeminiMove,
  isValidMove,
};
