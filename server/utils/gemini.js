// gemini.js - Updated for Tic Tac Toe
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const { GOOGLE_API_KEY } = process.env;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

async function generateContent(prompt) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-8b",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.NUMBER,
          },
        },
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// Specific function for Tic Tac Toe moves
async function generateTicTacToeMove(prompt) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-8b",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more deterministic moves
        maxOutputTokens: 10, // We only need a single number
        responseMimeType: "text/plain", // Simple text response for single number
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    return text;
  } catch (error) {
    console.error("Gemini TicTacToe Error:", error);
    throw error;
  }
}

module.exports = {
  generateContent,
  generateTicTacToeMove,
};
