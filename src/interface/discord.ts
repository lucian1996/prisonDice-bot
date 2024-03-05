import { CommandInteraction, GuildMember, Role } from "discord.js";

interface Member {
  user: {
    username: string;
  };
  roles: {
    cache: {
      has: (roleId: string) => boolean;
    };
  };
}

interface Guild {
  roles: {
    cache: Map<string, Role>;
  };
  members: {
    cache: Map<string, GuildMember>;
  };
}
