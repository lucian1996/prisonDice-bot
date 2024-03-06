import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { connectToDatabase } from "../utils/database";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure settings for the bot.")
    .addRoleOption((option) =>
      option
        .setName("admin_role")
        .setDescription("This role grants access to administrative commands.")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("prisoner_role")
        .setDescription("This role should have restricted permissions.")
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("prison_channel")
        .setDescription("Set the designated prison channel.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("dice_cooldown_minutes")
        .setDescription("Set a designated cooldown for dice rolls in minutes.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("dice_min_success")
        .setDescription("Set the minimum success dice roll out of 100.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("dice_max_success")
        .setDescription("Set the maximum success dice roll out of 100.")
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction) {
    try {
      const member = interaction.member;
      if (!member) {
        return interaction.reply({
          content: "Unable to retrieve member information.",
          ephemeral: true,
        });
      }

      const adminRoleOption = interaction.options.get("admin_role");
      const prisonerRoleOption = interaction.options.get("prisoner_role");
      const prisonChannelOption = interaction.options.get("prison_channel");
      const diceCooldownOption = interaction.options.get(
        "dice_cooldown_minutes"
      );
      const minSuccessOption = interaction.options.get("dice_min_success");
      const maxSuccessOption = interaction.options.get("dice_max_success");

      // Parse values
      const diceCooldownOptionValue = diceCooldownOption?.value;
      const diceCooldown =
        diceCooldownOptionValue !== undefined
          ? parseInt(String(diceCooldownOptionValue))
          : 0;
      const minSuccessOptionValue = minSuccessOption?.value;
      const minSuccess =
        minSuccessOptionValue !== undefined
          ? parseInt(String(minSuccessOptionValue))
          : 0;
      const maxSuccessOptionValue = maxSuccessOption?.value;
      const maxSuccess =
        maxSuccessOptionValue !== undefined
          ? parseInt(String(maxSuccessOptionValue))
          : 100;

      if (
        minSuccess < 0 ||
        minSuccess > 100 ||
        maxSuccess < 0 ||
        maxSuccess > 100
      ) {
        return interaction.reply({
          content: "Dice success range should be between 0 and 100.",
          ephemeral: true,
        });
      }

      const adminRole = adminRoleOption?.role;
      const prisonerRole = prisonerRoleOption?.role;
      const prisonChannelId = prisonChannelOption?.channel?.id;

      // Update database
      const db = await connectToDatabase();
      await db
        .collection("config")
        .updateOne(
          { id: "admin_role" },
          { $set: { value: adminRole?.id } },
          { upsert: true }
        );
      await db
        .collection("config")
        .updateOne(
          { id: "prisoner_role" },
          { $set: { value: prisonerRole?.id } },
          { upsert: true }
        );
      await db
        .collection("config")
        .updateOne(
          { id: "prison_channel" },
          { $set: { value: prisonChannelId } },
          { upsert: true }
        );
      await db
        .collection("config")
        .updateOne(
          { id: "dice_cooldown_minutes" },
          { $set: { value: diceCooldown } },
          { upsert: true }
        );
      await db
        .collection("config")
        .updateOne(
          { id: "dice_min_success" },
          { $set: { value: minSuccess } },
          { upsert: true }
        );
      await db
        .collection("config")
        .updateOne(
          { id: "dice_max_success" },
          { $set: { value: maxSuccess } },
          { upsert: true }
        );
      await interaction.reply({
        content: "Configuration successfully updated.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("An error occurred while updating configuration:", error);
      await interaction.reply({
        content: "An error occurred while updating the configuration.",
        ephemeral: true,
      });
    }
  },
};
