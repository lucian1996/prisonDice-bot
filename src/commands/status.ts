import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { connectToDatabase } from "../utils/database";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Prints the current admin role and lists prisoners."),
  async execute(interaction: CommandInteraction) {
    try {
      // Retrieve the admin role ID from the module
      const guild = interaction.guild;

      if (!guild) {
        await interaction.reply({
          content: "Error: Guild not found.",
          ephemeral: true,
        });
        return;
      }

      const db = await connectToDatabase();
      const config = await db
        .collection("config")
        .findOne({ _id: "admin_role" });
      const adminRoleId = config?.value;

      // Find the admin role based on the ID
      const adminRole = guild.roles.cache.get(adminRoleId);

      // Check if the admin role exists
      if (adminRole) {
        let response = `Current admin role is: ${adminRole.name}\n`;

        // Find the prisoner role
        const prisonerRole = guild.roles.cache.find(
          (role) => role.name === "prisoner"
        );

        if (prisonerRole) {
          const prisoners = guild.members.cache.filter((member) =>
            member.roles.cache.has(prisonerRole.id)
          );

          if (prisoners.size > 0) {
            response += "Users with the prisoner role:\n";
            prisoners.forEach((member) => {
              response += `- ${member.user.username}\n`;
            });
          }
        } else {
          response += "There are no prisoners in this server.\n";
        }

        await interaction.reply({
          content: response,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Admin role has not been set.",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error retrieving admin role:", error);
      await interaction.reply({
        content: "An error occurred while retrieving the admin role.",
        ephemeral: true,
      });
    }
  },
};
