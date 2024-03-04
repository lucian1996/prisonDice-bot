// ./index.js

require("dotenv").config();
const Discord = require("discord.js");

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
  ],
});

client.on("ready", () => {
  console.log(`Here in as ${client.user.tag}!`);
});

// This line must be at the very end
client.login(process.env.CLIENT_TOKEN); // signs the bot in with token
