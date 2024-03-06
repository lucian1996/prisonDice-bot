import { SlashCommandBuilder } from "@discordjs/builders";
import {
  CommandInteraction,
  GuildMember,
  Role,
  VoiceChannel,
} from "discord.js";
import { connectToDatabase } from "../utils/database";
import { getPrisonerRole, respondAndExit } from "../utils/utils";

interface UserRolesMap extends Map<string, Role[]> {}

const userRolesMap: UserRolesMap = new Map();
const cooldowns: Map<string, number> = new Map();

// Function to check if a user is on cooldown
function checkCooldown(
  memberId: string,
  cooldowns: Map<string, number>,
  cooldownAmount: number
): boolean {
  const now = Date.now();
  const expirationTime = cooldowns.get(memberId) || 0 + cooldownAmount;
  if (now < expirationTime) {
    return true; // User is on cooldown
  }
  return false; // User is not on cooldown
}

const getUserPreviousVoiceChannel = async (
  member: GuildMember
): Promise<VoiceChannel | undefined> => {
  const userId = member.user.id;
  const db = await connectToDatabase();

  const userPreviousChannelDbObj = await db
    .collection("user_previous_channel")
    .findOne({ id: userId });
  const previousChannelId = userPreviousChannelDbObj?.channelId;
  if (!previousChannelId) {
    return undefined;
  } // Return if no Previous Channel ID

  const previousChannel = member.guild.channels.cache.get(previousChannelId);
  return previousChannel instanceof VoiceChannel ? previousChannel : undefined;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice to allow a user to gamble for their freedom."),
  async execute(interaction: CommandInteraction) {
    let response = "";
    const now = Date.now();
    const member = interaction.member as GuildMember;
    const db = await connectToDatabase();
    const config = await db.collection("config").find({}).toArray();

    let diceCooldown = 0;
    let minSuccess = 0;
    let maxSuccess = 0;

    config.forEach((item: { id: string; value: number }) => {
      if (item.id === "dice_cooldown_minutes") {
        diceCooldown = item.value;
      } else if (item.id === "dice_min_success") {
        minSuccess = item.value;
      } else if (item.id === "dice_max_success") {
        maxSuccess = item.value;
      }
    });

    const cooldownAmount = diceCooldown * 1000 * 60; // Convert minutes to milliseconds
    const expirationTime = cooldowns.get(member.id) || 0 + cooldownAmount; // Define expirationTime here

    const isOnCooldown = checkCooldown(member.id, cooldowns, cooldownAmount);
    if (isOnCooldown) {
      const timeLeftMinutes = (expirationTime - now) / 1000 / 60;
      await respondAndExit(
        interaction,
        `Unlucky, please wait ${timeLeftMinutes.toFixed(
          1
        )} more minutes before reusing the \`roll\` command.`
      );
      return;
    }

    if (member.roles.cache.some((role) => role.name === "prisoner")) {
      response += `Must roll ${minSuccess}/${maxSuccess} to redeem privileges.\n`;
      const roll1 = Math.floor(Math.random() * 50) + 1;
      const roll2 = Math.floor(Math.random() * 50) + 1;
      response += `Rolling... **${roll1}, ${roll2}**\n`;

      response += `You rolled a ${roll1 + roll2}\n`;

      const userRolesData = await db
        .collection("user_roles")
        .findOne({ id: member.id });
      const userRoles = userRolesData?.roles || [];
      const prisonerRole = await getPrisonerRole(db);

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
    } else {
      response += "You are not a prisoner.\n";
    }

    await respondAndExit(interaction, response);
  },
};
