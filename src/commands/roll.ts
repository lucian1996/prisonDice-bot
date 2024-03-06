import { SlashCommandBuilder } from "@discordjs/builders";
import {
  CommandInteraction,
  GuildMember,
  Role,
  VoiceChannel,
} from "discord.js";
import { connectToDatabase } from "../utils/database";

interface UserRolesMap extends Map<string, Role[]> {}

const userRolesMap: UserRolesMap = new Map();
const cooldowns: Map<string, number> = new Map();

const getPrisonerRole = async (
  guild: GuildMember["guild"]
): Promise<Role | undefined> => {
  const prisonerRole = guild.roles.cache.find(
    (role) => role.name === "prisoner"
  );
  return prisonerRole;
};

const getUserPreviousVoiceChannel = async (
  member: GuildMember
): Promise<VoiceChannel | undefined> => {
  const userId = member.user.id;
  const db = await connectToDatabase();
  const userPreviousChannelData = await db
    .collection("user_previous_channels")
    .findOne({ _id: userId });
  const previousChannelId = userPreviousChannelData?.channelId;

  if (!previousChannelId) {
    return undefined;
  }

  const previousChannel = member.guild.channels.cache.get(previousChannelId);
  return previousChannel instanceof VoiceChannel ? previousChannel : undefined;
};

const storeUserPreviousVoiceChannel = async (member: GuildMember) => {
  const userId = member.user.id;
  const currentChannel = member.voice.channel;
  const db = await connectToDatabase();

  if (currentChannel) {
    await db
      .collection("user_previous_channels")
      .updateOne(
        { _id: userId },
        { $set: { channelId: currentChannel.id } },
        { upsert: true }
      );
  } else {
    await db.collection("user_previous_channels").deleteOne({ _id: userId });
  }
};

const respondAndExit = async (
  interaction: CommandInteraction,
  content: string
) => {
  await interaction.reply({ content, ephemeral: true });
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice to allow a user to gamble for their freedom."),
  async execute(interaction: CommandInteraction) {
    const member = interaction.member as GuildMember;
    const guild = interaction.guild;

    if (!member || !guild) {
      return;
    }

    const prisonerRole = await getPrisonerRole(guild);

    if (!prisonerRole) {
      await respondAndExit(interaction, "The prisoner role is not found.");
      return;
    }

    const db = await connectToDatabase();
    const config = await db.collection("config").find({}).toArray();

    let diceCooldown = 0;
    let minSuccess = 0;
    let maxSuccess = 0;

    config.forEach((item: { _id: string; value: number }) => {
      if (item._id === "dice_cooldown_minutes") {
        diceCooldown = item.value;
      } else if (item._id === "dice_min_success") {
        minSuccess = item.value;
      } else if (item._id === "dice_max_success") {
        maxSuccess = item.value;
      }
    });

    const now = Date.now();
    const cooldownAmount = diceCooldown * 1000 * 60; // Convert minutes to milliseconds

    if (cooldowns.has(member.id)) {
      const expirationTime = cooldowns.get(member.id) || 0 + cooldownAmount;

      if (now < expirationTime) {
        const timeLeftMinutes = (expirationTime - now) / 1000 / 60;
        await respondAndExit(
          interaction,
          `Unlucky, please wait ${timeLeftMinutes.toFixed(
            1
          )} more minutes before reusing the \`roll\` command.`
        );
        return;
      }
    }

    let response = "";

    if (member.roles.cache.has(prisonerRole.id)) {
      response += `Must roll ${minSuccess}/${maxSuccess} to redeem privileges.\n`;
      const roll1 = Math.floor(Math.random() * 50) + 1;
      const roll2 = Math.floor(Math.random() * 50) + 1;
      response += `Rolling... **${roll1}, ${roll2}**\n`;

      response += `You rolled a ${roll1 + roll2}\n`;

      const userRolesData = await db
        .collection("user_roles")
        .findOne({ _id: member.id });
      const userRoles = userRolesData?.roles || [];

      if (roll1 + roll2 >= minSuccess && roll1 + roll2 <= maxSuccess) {
        if (userRoles.length > 0) {
          try {
            await member.roles.add(userRoles);
            userRolesMap.delete(member.user.id);
            await member.roles.remove(prisonerRole);

            const previousChannel = await getUserPreviousVoiceChannel(member);
            if (previousChannel) {
              await member.voice.setChannel(previousChannel);
              response += `You have been moved back to ${previousChannel.name}.\n`;
            }

            response += "Your privileges are restored.\n";
          } catch (error) {
            console.log("Error restoring user roles and voice channel:", error);
            response +=
              "Error: Failed to restore privileges, check role hierarchy\n";
          }
        } else {
          response += "Error: Failed to retrieve user roles.\n";
        }
      } else {
        response += "Unlucky. Try again next time.\n";
      }

      cooldowns.set(member.id, now);
      setTimeout(() => cooldowns.delete(member.id), cooldownAmount); // Remove cooldown after specified time

      const membersWithPrisonerRole = guild.members.cache.filter((member) =>
        member.roles.cache.has(prisonerRole.id)
      ) as unknown as GuildMember[];

      if (
        membersWithPrisonerRole.length === 1 &&
        membersWithPrisonerRole[0].id === member.id
      ) {
        try {
          await prisonerRole.delete();
          console.log('Deleted "prisoner" role.');
        } catch (error) {
          console.error('Error deleting "prisoner" role:', error);
        }
      }
    } else {
      response += "You are not a prisoner.\n";
    }

    await respondAndExit(interaction, response);
  },
};
