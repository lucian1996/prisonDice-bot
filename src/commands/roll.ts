// Import necessary modules
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, Role } from "discord.js";
import { connectToDatabase } from "../utils/database";
import {
  getPrisonerRole,
  getUserPreviousVoiceChannel,
  respondAndExit,
} from "../utils/utils";

// Define interfaces and maps
interface UserRolesMap extends Map<string, Role[]> {}
const userRolesMap: UserRolesMap = new Map();
const cooldowns: Map<string, number> = new Map();

// Function to check cooldown status
function checkCooldown(
  memberId: string,
  cooldowns: Map<string, number>
): boolean {
  const now = Date.now();
  const expirationTime = cooldowns.get(memberId) || 0;
  return now < expirationTime;
}

// Function to add cooldown for a user
function addCooldown(
  memberId: string,
  cooldowns: Map<string, number>,
  cooldownAmount: number
): void {
  const now = Date.now();
  const expirationTime = now + cooldownAmount;
  cooldowns.set(memberId, expirationTime);
}

module.exports = {
  // Define command data
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice to allow a user to gamble for their freedom."),

  // Execute command function
  async execute(interaction: CommandInteraction) {
    let response = "";
    const now = Date.now();
    const member = interaction.member as GuildMember;
    const db = await connectToDatabase();
    const config = await db.collection("config").find({}).toArray();

    let diceCooldown = 0;
    let minSuccess = 0;
    let maxSuccess = 0;

    // Extract configuration values
    config.forEach((item: { id: string; value: number }) => {
      if (item.id === "dice_cooldown_minutes") diceCooldown = item.value;
      else if (item.id === "dice_min_success") minSuccess = item.value;
      else if (item.id === "dice_max_success") maxSuccess = item.value;
    });

    const cooldownAmount = diceCooldown * 1000 * 60; // Convert minutes to milliseconds
    const isOnCooldown = checkCooldown(member.id, cooldowns);
    if (isOnCooldown) {
      const remainingCooldown = (cooldowns.get(member.id) ?? now) - now; // Use optional chaining and provide 'now' as a default value if undefined
      const timeLeftMinutes = Math.ceil(remainingCooldown / (1000 * 60)); // Convert remaining milliseconds to minutes and round up
      await respondAndExit(
        interaction,
        `Unlucky, please wait ${timeLeftMinutes} more minutes before reusing the \`roll\` command.`,
        true
      );
      return;
    }

    // Check if user is a prisoner
    if (member.roles.cache.some((role) => role.name === "prisoner")) {
      // Generate random dice rolls
      response += `Must roll ${minSuccess}/${maxSuccess} to redeem privileges.\n`;
      const roll1 = Math.floor(Math.random() * 50) + 1;
      const roll2 = Math.floor(Math.random() * 50) + 1;
      response += `Rolling... **${roll1}, ${roll2}**\n`;
      response += `You rolled a ${roll1 + roll2}\n`;

      // Retrieve user roles and prisoner role
      const userRolesData = await db
        .collection("user_roles")
        .findOne({ id: member.id });
      const userRoles = userRolesData?.roles || [];
      const prisonerRole = await getPrisonerRole(db);

      // Process dice roll result
      if (roll1 + roll2 >= minSuccess && roll1 + roll2 <= maxSuccess) {
        if (userRoles.length > 0) {
          try {
            // Restore user roles and privileges
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
        addCooldown(member.id, cooldowns, cooldownAmount); // Add cooldown for the user
      }
    } else {
      response += "You are not a prisoner.\n";
    }

    // Send response and exit
    await respondAndExit(interaction, response, false);
  },
};
