import {
  CommandInteraction,
  GuildMember,
  Role,
  User,
  VoiceChannel,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { connectToDatabase } from "../utils/database";
import {
  checkPermission,
  getPrisonerRole,
  respondAndExit,
} from "../utils/utils";

const getPrisonChannel = async (
  interaction: CommandInteraction,
  prisonChannelId: string
): Promise<VoiceChannel | undefined> => {
  const channel = interaction.guild?.channels.cache.get(prisonChannelId);
  return channel instanceof VoiceChannel ? channel : undefined;
};

const storeUserRoles = async (
  db: Awaited<ReturnType<typeof connectToDatabase>>,
  user: User,
  roles: string[]
) => {
  try {
    await db
      .collection("user_roles")
      .updateOne({ id: user.id }, { $set: { roles } }, { upsert: true });
    console.log(`User roles for ${user.username} updated in the database.`);
  } catch (error) {
    console.log("Error updating user roles in the database:", error);
  }
};

const storeUserPreviousVoiceChannel = async (
  db: Awaited<ReturnType<typeof connectToDatabase>>,
  member: GuildMember
) => {
  const userId = member.user.id;
  const currentChannelId = member.voice.channelId; // Fetch current voice channel ID

  if (currentChannelId) {
    await db.collection("user_previous_channel").updateOne(
      { id: userId },
      { $set: { channelId: currentChannelId } }, // Use the fetched channel ID
      { upsert: true }
    );
  } else {
    await db.collection("user_previous_channel").deleteOne({ id: userId });
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prison")
    .setDescription(
      "Removes all roles from a user and adds the 'prisoner' role."
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription('The user to add the "prisoner" role to')
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction) {
    const db = await connectToDatabase();
    const adminRoleDbObj = await db
      .collection("config")
      .findOne({ id: "admin_role" });
    const adminRoleId = adminRoleDbObj?.value;

    if (!adminRoleId) {
      await respondAndExit(interaction, "Admin role not configured.", true);
      return;
    }

    const prisonChannelDbObj = await db
      .collection("config")
      .findOne({ id: "prison_channel" });
    const prisonChannelId = prisonChannelDbObj?.value;

    const hasPermission = await checkPermission(interaction, adminRoleId);
    if (!hasPermission) {
      await respondAndExit(
        interaction,
        "You don't have permission to prison other users.",
        true
      );
      return;
    }

    const user = interaction.options.getUser("user");
    if (!user) {
      await respondAndExit(interaction, "User not found.", true);
      return;
    }

    const fetchedMember = await interaction.guild?.members.fetch(user);
    const targetMember = fetchedMember as GuildMember;
    const userRoles = targetMember.roles.cache.map((role) => role.id);

    await storeUserRoles(db, user, userRoles);

    const prisonChannel = await getPrisonChannel(interaction, prisonChannelId);

    try {
      const rolesToRemove = targetMember.roles.cache
        .filter((role) => role.name !== "@everyone")
        .map((role) => role.id);
      await targetMember.roles.remove(rolesToRemove);

      const prisonerRole = await getPrisonerRole(db);
      await targetMember.roles.add(prisonerRole);

      // Store the user's previous voice channel before moving them
      await storeUserPreviousVoiceChannel(db, targetMember);

      if (targetMember.voice.channel) {
        if (prisonChannel) {
          await targetMember.voice.setChannel(prisonChannel);
        }
        await respondAndExit(
          interaction,
          `${user} has been booted out of chat and is now a prisoner.`,
          false
        );
      } else {
        await respondAndExit(
          interaction,
          `${user} is now a prisoner.`,
          false
        );
      }
    } catch (error) {
      await respondAndExit(
        interaction,
        `Failed to prison ${user}: ${error}`,
        true
      );
    }
  },
};
