import { CommandInteraction } from "discord.js";

export const respondAndExit = async (
  interaction: CommandInteraction,
  content: string
) => {
  await interaction.reply({ content, ephemeral: true });
};
