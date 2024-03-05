import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildMember, Role } from "discord.js";
import { connectToDatabase } from "../utils/database";

interface UserRolesMap extends Map<string, Role[]> {}

const userRolesMap: UserRolesMap = new Map();
const cooldowns: Map<string, number> = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice to allow a user to gamble for their freedom."),
  async execute(interaction: CommandInteraction) {
    const member = interaction.member as GuildMember;
    const guild = interaction.guild;

    const db = await connectToDatabase();
    const config = await db.collection("config").findOne({}); // Retrieve all config values

    const diceCooldown = config.dice_cooldown_minutes;
    const minSuccess = config.dice_min_success;
    const maxSuccess = config.dice_max_success;

    if (!member || !guild) {
      return;
    }

    const prisonerRole = guild.roles.cache.find(
      (role) => role.name === "prisoner"
    );

    let response = ""; // Initialize response variable

    if (!prisonerRole) {
      response += "The prisoner role is not found.\n";
      await interaction.reply(response);
      return;
    }
    const now = Date.now();
    const cooldownAmount = diceCooldown * 1000 * 60; // Convert minutes to milliseconds

    if (cooldowns.has(member.id)) {
      const expirationTime = member
        ? (cooldowns.get(member.id) || 0) + cooldownAmount
        : 0;

      if (now < expirationTime) {
        const timeLeftMinutes = (expirationTime - now) / 1000 / 60;
        return interaction.reply(
          `Unlucky, please wait ${timeLeftMinutes.toFixed(
            1
          )} more minutes before reusing the \`roll\` command.`
        );
      }
    }

    if (member.roles.cache.has(prisonerRole.id)) {
      response += `Must roll ${minSuccess}/${maxSuccess} to redeem privileges.\n`;
      const roll1 = Math.floor(Math.random() * 50) + 1;
      const roll2 = Math.floor(Math.random() * 50) + 1;
      response += `Rolling... **${roll1}, ${roll2}**\n`;

      response += `You rolled a ${roll1 + roll2}\n`;

      const db = await connectToDatabase();
      const userRolesData = await db
        .collection("user_roles")
        .findOne({ _id: member.id });
      const userRoles = userRolesData?.roles || [];

      if (roll1 + roll2 >= minSuccess && roll1 + roll2 <= maxSuccess) {
        if (userRoles) {
          try {
            await member.roles.add(userRoles);
            userRolesMap.delete(member.user.id);
            await member.roles.remove(prisonerRole);
            response += "Hell yea. Your privileges are restored.\n";
          } catch {
            const user = interaction.options.getUser("user");
            response += `${user} outside of prisonDice role scope.`;
          }
        } else {
          response += "Error: Failed to retrieve user roles.\n";
        }
      } else {
        response += "Unlucky. Try again next time.\n";
      }

      cooldowns.set(member.id, now);
      setTimeout(() => cooldowns.delete(member.id), cooldownAmount); // Remove cooldown after specified time

      // Check if any member in the server has the "prisoner" role after removing it from the current member
      const membersWithPrisonerRole = guild.members.cache.filter((member) =>
        member.roles.cache.has(prisonerRole.id)
      ) as unknown as GuildMember[];

      // If no one else has the "prisoner" role, delete the role from the server
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

    // Send all responses in one go
    await interaction.reply(response);
  },
};
