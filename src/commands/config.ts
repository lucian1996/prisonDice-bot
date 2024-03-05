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
    .addStringOption((option) =>
      option
        .setName("prison_channel")
        .setDescription("Set the designated prison channel.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("dice_cooldown_minutes")
        .setDescription("Set a designated cooldown for dice rolls in minutes.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("dice_min_success")
        .setDescription("Set the minimum success dice count.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("dice_max_success")
        .setDescription("Set the maximum success dice count.")
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

    if (!adminRoleOption || !prisonChannelOption || !diceCooldownOption) {
      return interaction.reply({
        content: "Missing required options.",
        ephemeral: true,
      });
    }

    const adminRole: Role | APIRole | null | undefined = adminRoleOption.role;
    const prisonChannel: string | number | boolean | undefined =
      prisonChannelOption.value;
    const diceCooldown: string | number | boolean | undefined =
      diceCooldownOption.value;
    const minSuccess: string | number | boolean | null =
      minSuccessOption?.value ?? null;
    const maxSuccess: string | number | boolean | null =
      maxSuccessOption?.value ?? null;

    if (!adminRole || !prisonChannel || !diceCooldown) {
      return interaction.reply({
        content: "Invalid options provided.",
        ephemeral: true,
      });
    }

    const db = await connectToDatabase();

    // Update or insert admin role into the database
    await db
      .collection("config")
      .updateOne(
        { _id: "admin_role" },
        { $set: { value: adminRole.id } },
        { upsert: true }
      );

    // Update or insert prison channel into the database
    await db
      .collection("config")
      .updateOne(
        { _id: "prison_channel" },
        { $set: { value: prisonChannel } },
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
      content: "Configuration updated successfully.",
      ephemeral: true,
    });
  },
};
