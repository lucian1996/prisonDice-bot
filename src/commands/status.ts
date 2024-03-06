import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Role } from "discord.js";
import { connectToDatabase } from "../utils/database";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Prints the current admin role and lists prisoners."),

  async execute(interaction: CommandInteraction) {
    try {
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply({
          content: "Error: Guild not found.",
          ephemeral: true,
        });
        return;
      }

      const db = await connectToDatabase();

      const adminRoleIdObject = await db
        .collection("config")
        .findOne({ _id: "admin_role" });
      const adminRoleId = adminRoleIdObject
        ? adminRoleIdObject.value
        : undefined;

      const prisonerRoleIdObject = await db
        .collection("config")
        .findOne({ _id: "prisoner_role" });
      const prisonerRoleId = prisonerRoleIdObject
        ? prisonerRoleIdObject.value
        : undefined;

      const prisonChannelObject = await db
        .collection("config")
        .findOne({ _id: "prison_channel" });
      const prisonChannelId = prisonChannelObject
        ? prisonChannelObject.value
        : undefined;

      const diceCooldownMinutesObject = await db
        .collection("config")
        .findOne({ _id: "dice_cooldown_minutes" });
      const diceCooldownMinutes = diceCooldownMinutesObject
        ? diceCooldownMinutesObject.value
        : undefined;

      const diceMinSuccessObject = await db
        .collection("config")
        .findOne({ _id: "dice_min_success" });
      const diceMinSuccess = diceMinSuccessObject
        ? diceMinSuccessObject.value
        : undefined;

      const diceMaxSuccessObject = await db
        .collection("config")
        .findOne({ _id: "dice_max_success" });
      const diceMaxSuccess = diceMaxSuccessObject
        ? diceMaxSuccessObject.value
        : undefined;

      const adminRole = guild.roles.cache.get(adminRoleId);
      const prisonerRole = guild.roles.cache.get(prisonerRoleId); // Moved the declaration here

      const prisonChannel = guild.channels.cache.get(prisonChannelId);

      if (adminRole) {
        let response = `Current Admin role is: ${adminRole}\n`;
        response += `Current Prisoner role is: ${prisonerRole}\n`;
        response += `Prison Channel is: ${prisonChannel}\n`;
        response += `Dice Cooldown Minutes is: ${diceCooldownMinutes}\n`;
        response += `Dice Min Success is: ${diceMinSuccess}\n`;
        response += `Dice Max Success is: ${diceMaxSuccess}\n`;

        const prisomerRole = guild.roles.cache.find(
          (role) => role.name === "prisoner"
        );

        if (prisomerRole) {
          const prisoners = guild.members.cache.filter((member) =>
            member.roles.cache.has(prisomerRole.id)
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
