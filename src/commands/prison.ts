import { CommandInteraction, GuildMember, Role, User } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { connectToDatabase } from "../utils/database";

const userRolesMap: Map<string, string[]> = new Map();

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
    const config = await db.collection("config").findOne({ _id: "admin_role" });
    const adminRoleId = config?.value;

    const checkPermission = () => {
      const member = interaction.member as GuildMember;
      return member?.roles.cache.some((role) => role.id === adminRoleId);
    };

    const respondAndExit = (content: string) => {
      interaction.reply({ content, ephemeral: true });
      return;
    };

    if (!checkPermission()) {
      return respondAndExit("You don't have permission to prison other users.");
    }

    const user = interaction.options.getUser("user");
    if (!user) {
      return respondAndExit("User not found.");
    }

    const fetchedMember = await interaction.guild?.members.fetch(user);
    const targetMember = fetchedMember as GuildMember;
    const userRoles = targetMember.roles.cache.map((role) => role.id);

    try {
      await db
        .collection("user_roles")
        .updateOne(
          { _id: user.id },
          { $set: { roles: userRoles } },
          { upsert: true }
        );
      console.log(`User roles for ${user.username} updated in the database.`);
    } catch (error) {
      console.error("Error updating user roles in the database:", error);
    }

    let prisonerRole =
      interaction.guild?.roles.cache.find((role) => role.name === "prisoner") ||
      (await interaction.guild?.roles.create({
        name: "prisoner",
        permissions: [],
        reason: "Creating prisoner role for restricted permissions",
      }));

    if (!prisonerRole) {
      return respondAndExit("Prisoner role not found.");
    }

    try {
      const rolesToRemove = targetMember.roles.cache
        .filter((role) => role.name !== "@everyone")
        .map((role) => role.id);
      await targetMember.roles.remove(rolesToRemove);
      await targetMember.roles.add(prisonerRole);
      await interaction.reply(`Added the "prisoner" role to ${user}.`);
    } catch {
      await interaction.reply(`${user} outside of prisonDice role scope.`);
    }
  },
};

export { userRolesMap };
