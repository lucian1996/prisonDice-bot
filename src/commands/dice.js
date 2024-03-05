const { SlashCommandBuilder } = require("@discordjs/builders");
const { userRolesMap } = require("./prison.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription(
      "Rolls a dice and allows users with the 'prisoner' role to attempt to roll out of 90/100."
    ),
  async execute(interaction) {
    const member = interaction.member;
    const prisonerRole = interaction.guild.roles.cache.find(
      (role) => role.name === "prisoner"
    );

    let response = ""; // Initialize response variable

    if (member.roles.cache.has(prisonerRole.id)) {
      response += "Must roll 10/100 to redeem privileges.\n";
      const roll1 = Math.floor(Math.random() * 50) + 1;
      const roll2 = Math.floor(Math.random() * 50) + 1;
      response += `Rolling... **${roll1}, ${roll2}**\n`;

      response += `You rolled a ${roll1 + roll2}\n`;

      const userRoles = userRolesMap.get(member.user.id);
      console.log("userRoles:", userRoles); // Debugging

      if (roll1 + roll2 > 10) {
        if (userRoles) {
          await member.roles.add(userRoles);
          userRolesMap.delete(member.user.id);
          await member.roles.remove(prisonerRole);
          response += "Hell yea. Your privileges are restored.\n";
        } else {
          response += "Error: Failed to retrieve user roles.\n";
        }
      } else {
        response += "Unlucky. Try again next time.\n";
      }

      // Check if any member in the server has the "prisoner" role after removing it from the current member
      const membersWithPrisonerRole = interaction.guild.members.cache.filter(
        (member) => member.roles.cache.has(prisonerRole.id)
      );

      // If no one else has the "prisoner" role, delete the role from the server
      if (
        membersWithPrisonerRole.size === 1 &&
        membersWithPrisonerRole.first().id === member.id
      ) {
        try {
          await prisonerRole.delete();
          console.log('Deleted "prisoner" role.');
        } catch (error) {
          console.error('Error deleting "prisoner" role:', error);
        }
      }
    } else {
      response += "You are not a prisoner.\n";
    }

    // Send all responses in one go
    await interaction.reply(response);
  },
};
