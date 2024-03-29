const { MongoClient } = require("mongodb");
const { databasePassword } = require("../../config.json");

export async function connectToDatabase() {
  const uri = `mongodb+srv://islandinthesun:${databasePassword}@cluster0.qvl3yx7.mongodb.net/`; // Replace with your MongoDB connection URI
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    return client.db("discord_bot"); // Replace 'discord_bot' with your database name
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// Call this function to connect to the database
