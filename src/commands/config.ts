import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Role, APIRole } from "discord.js";
import { connectToDatabase } from "../utils/database";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure settings for the bot.")
    .addRoleOption((option) =>
      option
        .setName("admin_role")
        .setDescription("The role to grant access to administrative commands.")
        .setRequired(true)
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
    const member = interaction.member;
    if (!member) {
      return interaction.reply({
        content: "Unable to retrieve member information.",
        ephemeral: true,
      });
    }

    const adminRoleOption = interaction.options.get("admin_role");
    const prisonChannelOption = interaction.options.get("prison_channel");
    const diceCooldownOption = interaction.options.get("dice_cooldown_minutes");
    const minSuccessOption = interaction.options.get("dice_min_success");
    const maxSuccessOption = interaction.options.get("dice_max_success");

    if (!adminRoleOption) {
      return interaction.reply({
        content: "Missing required options.",
        ephemeral: true,
      });
    }

    // Check if minSuccess and maxSuccess are numbers and within the range of 0 to 100
    const minSuccess: number | null =
      typeof minSuccessOption === "number" &&
      minSuccessOption >= 0 &&
      minSuccessOption <= 100
        ? minSuccessOption
        : 0;
    const maxSuccess: number | null =
      typeof maxSuccessOption === "number" &&
      maxSuccessOption >= 0 &&
      maxSuccessOption <= 100
        ? maxSuccessOption
        : 100;

    if (
      (minSuccess !== null && (minSuccess < 0 || minSuccess > 100)) ||
      (maxSuccess !== null && (maxSuccess < 0 || maxSuccess > 100))
    ) {
      return interaction.reply({
        content: "Dice success range should be between 0 and 100.",
        ephemeral: true,
      });
    }

    const db = await connectToDatabase();

    const adminRole = adminRoleOption.role;
    const prisonChannelId = prisonChannelOption?.channel?.id;
    const diceCooldown = diceCooldownOption ?? 0;

    // Update or insert admin role into the database
    await db
      .collection("config")
      .updateOne(
        { _id: "admin_role" },
        { $set: { value: adminRole?.id } },
        { upsert: true }
      );

    // Update or insert prison channel into the database
    await db.collection("config").updateOne(
      { _id: "prison_channel" },
      { $set: { value: prisonChannelId } }, // Extracting only the channel ID
      { upsert: true }
    );

    // Update or insert dice cooldown into the database
    await db
      .collection("config")
      .updateOne(
        { _id: "dice_cooldown_minutes" },
        { $set: { value: diceCooldown } },
        { upsert: true }
      );

    // Update or insert min success dice count into the database
    if (minSuccess !== null) {
      await db
        .collection("config")
        .updateOne(
          { _id: "dice_min_success" },
          { $set: { value: minSuccess } },
          { upsert: true }
        );
    }

    // Update or insert max success dice count into the database
    if (maxSuccess !== null) {
      await db
        .collection("config")
        .updateOne(
          { _id: "dice_max_success" },
          { $set: { value: maxSuccess } },
          { upsert: true }
        );
    }

    await interaction.reply({
      content: "Configuration successfully updated .",
      ephemeral: true,
    });
  },
};
