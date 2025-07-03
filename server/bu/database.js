const { Sequelize } = require("sequelize");

// Create a new Sequelize instance
// Using SQLite for simplicity - no need to install MySQL/PostgreSQL
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite", // This will create a file in your project
  logging: false, // Turn off SQL query logging
});

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

module.exports = sequelize;
