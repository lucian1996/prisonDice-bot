import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { connectToDatabase } from "../utils/database";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Prints the current admin role and lists prisoners."),
  async execute(interaction: CommandInteraction) {
    try {
      const guild = interaction.guild;
      if (!guild) {
        return await interaction.reply({
          content: "Error: Guild not found.",
          ephemeral: true,
        });
      }

      const db = await connectToDatabase();
      const configValues: { id: string; value: string | undefined }[] = await db
        .collection("config")
        .find({})
        .toArray();

      const configMap = new Map(
        configValues.map(({ id, value }) => [id, value])
      );

      const adminRoleId = configMap.get("admin_role");
      const prisonerRoleId = configMap.get("prisoner_role");
      const prisonChannelId = configMap.get("prison_channel");
      const diceCooldownMinutes = configMap.get("dice_cooldown_minutes");
      const diceMinSuccess = configMap.get("dice_min_success");
      console.log(diceMinSuccess);
      const diceMaxSuccess = configMap.get("dice_max_success");

      const adminRole = guild.roles.cache.get(adminRoleId as string);
      const prisonerRole = guild.roles.cache.get(prisonerRoleId as string);
      const prisonChannel = guild.channels.cache.get(prisonChannelId as string);

      let response = `Current Admin role is: ${adminRole || "Not set"}\n`;
      response += `Current Prisoner role is: ${prisonerRole || "Not set"}\n`;
      response += `Prison Channel is: ${prisonChannel || "Not set"}\n`;
      response += `Dice Cooldown Minutes is: ${
        diceCooldownMinutes || "Not set"
      }\n`;
      response += `Dice Min Success is: ${diceMinSuccess || "Not set"}\n`;
      response += `Dice Max Success is: ${diceMaxSuccess || "Not set"}\n`;

      const prisonerRoleName = "prisoner";
      const prisoners = guild.members.cache.filter((member) =>
        member.roles.cache.some((role) => role.name === prisonerRoleName)
      );

      if (prisoners.size > 0) {
        response += "Users with the prisoner role:\n";
        prisoners.forEach((member) => {
          response += `- ${member.user.username}\n`;
        });
      } else {
        response += "There are no prisoners in this server.\n";
      }

      await interaction.reply({
        content: response,
        ephemeral: true,
      });
    } catch (error) {
      console.error("An error occurred while retrieving status:", error);
      await interaction.reply({
        content: "An error occurred while retrieving the status.",
        ephemeral: true,
      });
    }
  },
};
