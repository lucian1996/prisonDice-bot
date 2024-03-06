import {
  CommandInteraction,
  GuildMember,
  Role,
  User,
  VoiceChannel,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { connectToDatabase } from "../utils/database";
import { respondAndExit } from "../utils/utils";

const checkPermission = async (
  interaction: CommandInteraction,
  adminRoleId: string
): Promise<boolean> => {
  const member = interaction.member as GuildMember;
  return member?.roles.cache.some((role) => role.id === adminRoleId);
};

const getPrisonerRole = async (
  interaction: CommandInteraction,
  prisonerRoleId?: string
): Promise<Role | undefined> => {
  if (prisonerRoleId) {
    const existingRole = interaction.guild?.roles.cache.get(prisonerRoleId);
    if (existingRole) return existingRole;
  }

  try {
    const newRole = await interaction.guild?.roles.create({
      name: "prisoner",
      permissions: [],
      reason: "Creating prisoner role for restricted permissions",
    });
    return newRole;
  } catch (error) {
    console.log("Failed to create prisoner role:", error);
    return undefined;
  }
};

const getPrisonChannel = async (
  interaction: CommandInteraction,
  prisonChannelId: string
): Promise<VoiceChannel | undefined> => {
  const channel = interaction.guild?.channels.cache.get(prisonChannelId);
  return channel instanceof VoiceChannel ? channel : undefined;
};

const updateUserRoles = async (
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
  member: GuildMember,
  prisonChannel: VoiceChannel
) => {
  const userId = member.user.id;
  const currentChannelId = member.voice.channelId; // Fetch current voice channel ID

  if (currentChannelId && currentChannelId !== prisonChannel.id) {
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
    const config = await db.collection("config").findOne({ id: "admin_role" });
    const adminRoleId = config?.value;

    if (!adminRoleId) {
      await respondAndExit(interaction, "Admin role not configured.");
      return;
    }

    const prisonConfig = await db
      .collection("config")
      .findOne({ id: "prison_channel" });
    const prisonChannelId = prisonConfig?.value;

    const prisonerRoleConfig = await db
      .collection("config")
      .findOne({ id: "prisoner_role" });
    const prisonerRoleId = prisonerRoleConfig?.value;

    const hasPermission = await checkPermission(interaction, adminRoleId);

    if (!hasPermission) {
      await respondAndExit(
        interaction,
        "You don't have permission to prison other users."
      );
      return;
    }

    const user = interaction.options.getUser("user");

    if (!user) {
      await respondAndExit(interaction, "User not found.");
      return;
    }

    const fetchedMember = await interaction.guild?.members.fetch(user);
    const targetMember = fetchedMember as GuildMember;
    const userRoles = targetMember.roles.cache.map((role) => role.id);

    await updateUserRoles(db, user, userRoles);

    const prisonerRole = await getPrisonerRole(interaction, prisonerRoleId);

    if (!prisonerRole) {
      await respondAndExit(interaction, "Prisoner role not found.");
      return;
    }
    if (!prisonChannelId) {
      await respondAndExit(interaction, "Prison channel not configured.");
      return;
    }

    const prisonChannel = await getPrisonChannel(interaction, prisonChannelId);

    if (!prisonChannel) {
      await respondAndExit(interaction, "Prison voice channel not found.");
      return;
    }

    try {
      const rolesToRemove = targetMember.roles.cache
        .filter((role) => role.name !== "@everyone")
        .map((role) => role.id);

      await targetMember.roles.remove(rolesToRemove);
      await targetMember.roles.add(prisonerRole);

      // Store the user's previous voice channel before moving them
      await storeUserPreviousVoiceChannel(db, targetMember, prisonChannel);

      if (targetMember.voice.channel) {
        await targetMember.voice.setChannel(prisonChannel);
        await respondAndExit(
          interaction,
          `Moved ${user} to the prison voice channel and added the "prisoner" role.`
        );
      } else {
        await respondAndExit(
          interaction,
          `Added the "prisoner" role to ${user}.`
        );
      }
    } catch (error) {
      await respondAndExit(interaction, `Failed to prison ${user}: ${error}`);
    }
  },
};
