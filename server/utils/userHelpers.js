const User = require("../models/User");

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

module.exports = {
  findOrCreateUser,
  incrementUserWins,
};
