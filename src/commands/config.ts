import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, Role, Permissions, APIRole } from "discord.js";
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
    ),
  async execute(interaction: CommandInteraction) {
    // Ensure interaction.member is a GuildMember
    const member = interaction.member;
    if (!member) {
      return interaction.reply({
        content: "Unable to retrieve member information.",
        ephemeral: true,
      });
    }

    // Get the admin_role option
    const adminRoleOption = interaction.options.get("admin_role");
    if (!adminRoleOption) {
      return interaction.reply({
        content: "Invalid or missing admin_role option.",
        ephemeral: true,
      });
    }

    const adminRole: Role | APIRole | null | undefined = adminRoleOption.role;
    if (!adminRole) {
      return interaction.reply({
        content: "The provided admin role does not exist.",
        ephemeral: true,
      });
    }

    // Check if the member has the ADMINISTRATOR permission
    const permissions = member.permissions;
    // console.log(permissions);
    // if (!permissions || !permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
    //   return interaction.reply({
    //     content: "You don't have permission to configure the bot.",
    //     ephemeral: true,
    //   });
    // }

    const db = await connectToDatabase();
    await db
      .collection("config")
      .updateOne(
        { _id: "admin_role" },
        { $set: { value: adminRole.id } },
        { upsert: true }
      );

    await interaction.reply({
      content: `Admin role set to ${adminRole.name}.`,
      ephemeral: true,
    });
  },
};
