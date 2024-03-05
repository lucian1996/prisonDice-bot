// ./commands/dice.js

const { SlashCommandBuilder } = require("@discordjs/builders");

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

    // Check if the user has the 'prisoner' role
    if (member.roles.cache.has(prisonerRole.id)) {
      await interaction.reply("Must roll 90/100 to redeem privlages.");
      await interaction.followUp("Rolling...");

      // Simulate dice roll (1-100)
      const roll1 = Math.floor(Math.random() * 50) + 1;
      const roll2 = Math.floor(Math.random() * 50) + 1;

      // Display the roll outcome
      await interaction.followUp(`**${roll1}, ${roll2}**`);
      await interaction.followUp(`you rolled a ${roll1 + roll2}`);

      // Check if the roll is above 90
      if (roll1 + roll2 > 90) {
        // Remove the 'prisoner' role
        await member.roles.remove(prisonerRole);
        await interaction.followUp("hell yea.");
      } else {
        await interaction.followUp("unlucky.");
      }
    } else {
      await interaction.reply("You are not a prisoner.");
    }
  },
};
