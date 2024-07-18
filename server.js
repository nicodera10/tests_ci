const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

// Charger les variables d'environnement seulement si nous ne sommes pas en production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: "./config.env" });
}

const app = require("./app");

// Utiliser DATABASE_LOCAL pour le développement local et DATABASE pour la production
const DB = process.env.NODE_ENV === 'production' ? process.env.DATABASE : process.env.DATABASE_LOCAL;

mongoose.connect(DB).then(() => console.log("DB connection successful!"));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});