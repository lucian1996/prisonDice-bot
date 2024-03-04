const Discord = require("discord.js");
const { token } = require("../config.json");
const { registerCommands, handleInteractions } = require("./utils/interaction");

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands(client);
});

client.on("interactionCreate", handleInteractions);

client.login(token);
