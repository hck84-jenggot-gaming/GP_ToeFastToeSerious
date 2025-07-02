const express = require("express");
const router = express.Router();
const { User } = require("../models");

// Get top 10 players
router.get("/", async (req, res) => {
  try {
    const topPlayers = await User.findAll({
      order: [["totalWins", "DESC"]],
      limit: 10,
      attributes: ["username", "totalWins"],
    });

    res.json({
      success: true,
      data: topPlayers,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard",
    });
  }
});

// Get a specific player's stats
router.get("/player/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const player = await User.findOne({
      where: { username },
      attributes: ["username", "totalWins"],
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        error: "Player not found",
      });
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    console.error("Error fetching player stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch player stats",
    });
  }
});

module.exports = router;
