import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember } from "discord.js";
import { connectToDatabase } from "../utils/database";
import {
  getPrisonerRole,
  getUserPreviousVoiceChannel,
  respondAndExit,
} from "../utils/utils";

const restoreUserRoles = async (
  db: any,
  member: GuildMember,
  roles: string[]
) => {
  try {
    await member.roles.add(roles);
    console.log(`User roles for ${member.user.username} restored.`);
  } catch (error) {
    console.error("Error restoring user roles:", error);
  }
};

const restoreUserPreviousVoiceChannel = async (member: GuildMember) => {
  try {
    const previousChannel = await getUserPreviousVoiceChannel(member);
    if (previousChannel) {
      await member.voice.setChannel(previousChannel);
      console.log(`You have been moved back to ${previousChannel.name}.\n`);
    }
  } catch (error) {
    console.error("Error restoring user's previous voice channel:", error);
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("free")
    .setDescription(
      "Frees a user and restores their roles and previous voice channel."
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to free")
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction) {
    const db = await connectToDatabase();
    const adminRoleDbObj = await db
      .collection("config")
      .findOne({ id: "admin_role" });
    const adminRoleId = adminRoleDbObj?.value;

    const adminRole = interaction.guild?.roles.cache.get(adminRoleId);
    if (!adminRole) {
      await respondAndExit(interaction, "Admin role not found.", true);
      return;
    }

    const member = interaction.member as GuildMember;

    if (!member.roles.cache.has(adminRoleId)) {
      await respondAndExit(
        interaction,
        "You do not have permission to free users.",
        true
      );
      return;
    }

    const targetUser = interaction.options.getMember("user");
    if (!targetUser) {
      await respondAndExit(interaction, "User not found.", true);
      return;
    }

    const targetMember = targetUser as GuildMember;

    try {
      const userRolesData = await db
        .collection("user_roles")
        .findOne({ id: targetMember.id });
      const userRoles = userRolesData?.roles || [];
      const prisonerRole = await getPrisonerRole(db);

      await restoreUserRoles(db, targetMember, userRoles);
      await member.roles.remove(prisonerRole);

      await restoreUserPreviousVoiceChannel(targetMember);

      await respondAndExit(
        interaction,
        `User ${targetMember.user} has successfully gambled their freedom`,
        true
      );
    } catch (error) {
      console.error("Error freeing user:", error);
      await respondAndExit(
        interaction,
        `Failed to free user ${targetMember.user.username}.`,
        true
      );
    }
  },
};
