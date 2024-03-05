// ./commands/prison.js

const { SlashCommandBuilder } = require("@discordjs/builders");

// Object to store user roles temporarily
const userRolesMap = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prison")
    .setDescription(
      "Removes all roles from a user and adds the 'prisoner' role."
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription('The user to add the "prisoner" role to')
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(user);

    // Store user roles
    userRolesMap.set(
      user.id,
      member.roles.cache.map((role) => role.id)
    );

    let prisonerRole = interaction.guild.roles.cache.find(
      (role) => role.name === "prisoner"
    );

    // If "prisoner" role doesn't exist, create it
    if (!prisonerRole) {
      prisonerRole = await interaction.guild.roles.create({
        name: "prisoner",
        permissions: [],
        reason: "Creating prisoner role for restricted permissions",
      });
    }

    // Remove all roles except @everyone
    const rolesToRemove = member.roles.cache
      .filter((role) => role.name !== "@everyone")
      .map((role) => role.id);
    await member.roles.remove(rolesToRemove);

    // Add the "prisoner" role
    await member.roles.add(prisonerRole);

    await interaction.reply(`Added the "prisoner" role to ${user}.`);
  },
};

// Exporting the userRolesMap for access in other commands
module.exports.userRolesMap = userRolesMap;
