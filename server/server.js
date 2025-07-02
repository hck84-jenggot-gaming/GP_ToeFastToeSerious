const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { sequelize, User } = require("./models"); // Changed this line
const leaderboardRoutes = require("./routes/leaderboard");
const { getAIMove } = require("./utils/geminiHelper");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/leaderboard", leaderboardRoutes);

// Helper functions for user management
const findOrCreateUser = async (username) => {
  try {
    const [user, created] = await User.findOrCreate({
      where: { username },
      defaults: { totalWins: 0 },
    });
    return user;
  } catch (error) {
    console.error("Error in findOrCreateUser:", error);
    throw error;
  }
};

const incrementUserWins = async (username) => {
  try {
    const user = await User.findOne({ where: { username } });
    if (user) {
      await user.increment("totalWins", { by: 1 });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error in incrementUserWins:", error);
    throw error;
  }
};

// Game state
const allUsers = {};
const allRooms = [];

io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    online: true,
  };

  socket.on("playerMoveFromClient", (data) => {
    const currentUser = allUsers[socket.id];
    if (!currentUser || !currentUser.roomId) return;

    const room = allRooms.find((r) => r.roomId === currentUser.roomId);
    if (!room) return;

    // Determine opponent
    const opponent =
      room.player1.socket.id === socket.id ? room.player2 : room.player1;

    // Update turn and emit to opponent
    room.currentTurn = data.state.sign === "circle" ? "cross" : "circle";
    opponent.socket.emit("playerMoveFromServer", data);
  });

  socket.on("gameEnded", async (data) => {
    const { winner, roomId } = data;
    const currentUser = allUsers[socket.id];

    if (!currentUser || !roomId) return;

    const room = allRooms.find((r) => r.roomId === roomId);
    if (!room) return;

    try {
      // Determine which player won
      let winnerName;

      if (winner === "cross") {
        // Player 1 won (cross)
        winnerName =
          room.player1.socket.id === socket.id
            ? currentUser.playerName
            : room.player1.playerName;
      } else if (winner === "circle") {
        // Player 2 won (circle)
        winnerName =
          room.player2.socket.id === socket.id
            ? currentUser.playerName
            : room.player2.playerName;
      }

      if (winnerName) {
        // Update the winner's totalWins in the database
        await incrementUserWins(winnerName);
        console.log(`Updated wins for player: ${winnerName}`);
      }
    } catch (error) {
      console.error("Error updating winner stats:", error);
    }
  });

  socket.on("resetGame", (data) => {
    const roomIndex = allRooms.findIndex((r) => r.roomId === data.roomId);
    if (roomIndex !== -1) {
      const room = allRooms[roomIndex];

      // Clean up the room
      room.player1.playing = false;
      room.player2.playing = false;
      room.player1.roomId = null;
      room.player2.roomId = null;

      // Remove the room
      allRooms.splice(roomIndex, 1);
    }
  });

  socket.on("request_to_play", async (data) => {
    const currentUser = allUsers[socket.id];
    currentUser.playerName = data.playerName;

    // Create or find user in database
    try {
      await findOrCreateUser(data.playerName);
    } catch (error) {
      console.error("Error creating/finding user:", error);
    }

    let opponentPlayer;

    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && socket.id !== key) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      const roomId = `${socket.id}-${opponentPlayer.socket.id}`;
      const room = {
        roomId: roomId,
        player1: opponentPlayer,
        player2: currentUser,
        aiUsed: false,
        currentTurn: "cross",
        gameState: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ], // Add game state to room
      };

      allRooms.push(room);

      currentUser.playing = true;
      opponentPlayer.playing = true;
      currentUser.roomId = roomId;
      opponentPlayer.roomId = roomId;

      currentUser.socket.emit("OpponentFound", {
        opponentName: opponentPlayer.playerName,
        playingAs: "circle",
        roomId: roomId,
      });

      opponentPlayer.socket.emit("OpponentFound", {
        opponentName: currentUser.playerName,
        playingAs: "cross",
        roomId: roomId,
      });

      // Don't add event listeners here - they're already added above
    } else {
      currentUser.socket.emit("OpponentNotFound");
    }
  });

  socket.on("disconnect", async function () {
    const currentUser = allUsers[socket.id];
    if (currentUser) {
      currentUser.online = false;
      currentUser.playing = false;

      // Find and clean up the room
      for (let index = 0; index < allRooms.length; index++) {
        const { player1, player2 } = allRooms[index];

        if (player1.socket.id === socket.id) {
          player2.socket.emit("opponentLeftMatch");

          // Player 2 wins by forfeit
          try {
            await incrementUserWins(player2.playerName);
            console.log(`${player2.playerName} wins by forfeit`);
          } catch (error) {
            console.error("Error updating forfeit win:", error);
          }

          allRooms.splice(index, 1);
          break;
        }

        if (player2.socket.id === socket.id) {
          player1.socket.emit("opponentLeftMatch");

          // Player 1 wins by forfeit
          try {
            await incrementUserWins(player1.playerName);
            console.log(`${player1.playerName} wins by forfeit`);
          } catch (error) {
            console.error("Error updating forfeit win:", error);
          }

          allRooms.splice(index, 1);
          break;
        }
      }

      delete allUsers[socket.id];
    }
  });

  socket.on("requestAIHelp", async (data) => {
    const { gameState, roomId } = data;
    const currentUser = allUsers[socket.id];

    if (!currentUser || !roomId) {
      socket.emit("aiError", { message: "Invalid session" });
      return;
    }

    const room = allRooms.find((r) => r.roomId === roomId);
    if (!room) {
      socket.emit("aiError", { message: "Room not found" });
      return;
    }

    // Check if AI has already been used in this room
    if (room.aiUsed) {
      socket.emit("aiError", { message: "AI help already used in this game" });
      return;
    }

    try {
      // Get AI move suggestion
      const aiResult = await getAIMove(gameState, "cross"); // Player 1 is always cross

      // Mark that AI was used
      room.aiUsed = true;

      // Send suggestion to the requesting player only
      socket.emit("aiSuggestion", {
        bestMove: aiResult.bestMove,
        aiUsed: true,
        source: aiResult.source, // "gemini" or "fallback"
      });

      console.log(
        `AI suggestion sent to ${currentUser.playerName}: move ${aiResult.bestMove} (${aiResult.source})`
      );
    } catch (error) {
      console.error("AI move error:", error);
      socket.emit("aiError", {
        message: "AI temporarily unavailable",
        error: error.message,
      });
    }
  });

  // Also update your resetGame handler to reset AI usage
  socket.on("resetGame", (data) => {
    const roomIndex = allRooms.findIndex((r) => r.roomId === data.roomId);
    if (roomIndex !== -1) {
      const room = allRooms[roomIndex];

      // Clean up the room
      room.player1.playing = false;
      room.player2.playing = false;
      room.player1.roomId = null;
      room.player2.roomId = null;
      room.aiUsed = false; // Reset AI usage flag

      // Remove the room
      allRooms.splice(roomIndex, 1);
    }
  });
});

// Database sync and server start
const PORT = process.env.PORT || 3000;

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database synced");
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to sync database:", err);
  });
