const { REST, Routes } = require("discord.js");
const { token } = require("../../config.json");
const fs = require("fs");
const path = require("path");

// Function to register commands
const registerCommands = async (client) => {
  const commands = [];
  const commandsPath = path.join(__dirname, "..", "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
  try {
    const rest = new REST().setToken(token);
    const data = await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log(
      `Successfully registered ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
};

const handleInteractions = async (interaction) => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName;

  try {
    const command = require(`../commands/${commandName}.js`);
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await interaction.reply({
      content: "There was an error executing this command.",
      ephemeral: true,
    });
  }
};

// Exporting the handleInteractions function
module.exports = { registerCommands, handleInteractions };
