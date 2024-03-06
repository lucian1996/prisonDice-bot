import { CommandInteraction, GuildMember, VoiceChannel } from "discord.js";
import { connectToDatabase } from "./database";

export const respondAndExit = async (
  interaction: CommandInteraction,
  content: string,
  ephemeral: boolean
) => {
  await interaction.reply({ content, ephemeral: ephemeral });
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

export const getUserPreviousVoiceChannel = async (
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
