// ./commands/wave.js

const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wave")
    .setDescription("Waves at a user.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to wave at")
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    await interaction.reply(`👋 Hello, ${user}!`);
  },
};
