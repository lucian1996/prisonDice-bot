const { SlashCommandBuilder } = require("@discordjs/builders");
const { CommandInteraction } = require("discord.js");
const { connectToDatabase } = require("../utils/database");
const { checkPermission, respondAndExit } = require("../utils/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset configuration settings to default.")
    .addStringOption(
      (option: {
        setName: (arg0: string) => {
          (): any;
          new (): any;
          setDescription: {
            (arg0: string): {
              (): any;
              new (): any;
              setRequired: { (arg0: boolean): any; new (): any };
            };
            new (): any;
          };
        };
      }) =>
        option
          .setName("confirmation")
          .setDescription("Type 'confirm' to reset the configuration.")
          .setRequired(true)
    ),
  async execute(interaction: {
    member: any;
    reply: (arg0: { content: string; ephemeral: boolean }) => any;
    options: { getString: (arg0: string) => any };
  }) {
    try {
      const member = interaction.member;
      if (!member) {
        return interaction.reply({
          content: "Unable to retrieve member information.",
          ephemeral: true,
        });
      }

      const hasPermission = member.permissions.has("ADMINISTRATOR");
      if (!hasPermission) {
        await respondAndExit(
          interaction,
          "You don't have permission to reset the configuration.",
          true
        );
        return;
      }

      const confirmation = interaction.options.getString("confirmation");
      if (confirmation !== "confirm") {
        return interaction.reply({
          content: "Confirmation input was not 'confirm'. Operation cancelled.",
          ephemeral: true,
        });
      }

      // Reset configuration to default values
      const db = await connectToDatabase();
      await db.collection("config").deleteMany({});

      await interaction.reply({
        content: "Configuration successfully reset to default.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("An error occurred while resetting configuration:", error);
      await interaction.reply({
        content: "An error occurred while resetting the configuration.",
        ephemeral: true,
      });
    }
  },
};
