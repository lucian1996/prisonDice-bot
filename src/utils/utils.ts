import { CommandInteraction, GuildMember } from "discord.js";

export const respondAndExit = async (
  interaction: CommandInteraction,
  content: string
) => {
  await interaction.reply({ content, ephemeral: true });
};

export const getPrisonerRole = async (db: {
  collection: (arg0: string) => {
    (): any;
    new (): any;
    findOne: { (arg0: { id: string }): any; new (): any };
  };
}) => {
  try {
    const prisonerRoleConfig = await db
      .collection("config")
      .findOne({ id: "prisoner_role" });
    const prisonerRoleId = prisonerRoleConfig?.value;

    if (!prisonerRoleId) {
      throw new Error("Prisoner role not configured.");
    }

    return prisonerRoleId;
  } catch (error) {
    throw new Error(`Error retrieving prisoner role: ${error}`);
  }
};

export const checkPermission = async (
  interaction: CommandInteraction,
  adminRoleId: string
): Promise<boolean> => {
  const member = interaction.member as GuildMember;
  return member?.roles.cache.some((role) => role.id === adminRoleId);
};
