import { REST } from "@discordjs/rest";
import {
  APIEmbed,
  RESTPostAPICurrentUserCreateDMChannelResult,
  Routes,
} from "discord-api-types/v10";

export class DiscordClient {
  private rest: REST;
  private targetUserId: string;

  constructor() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const userId = process.env.DISCORD_TARGET_USER_ID;

    if (!token || !userId) {
      throw new Error("We need discord variables to send messages");
    }

    this.rest = new REST({ version: "10" }).setToken(token);
    this.targetUserId = userId;
  }

  private async createDM(): Promise<RESTPostAPICurrentUserCreateDMChannelResult> {
    return (await this.rest.post(Routes.userChannels(), {
      body: { recipient_id: this.targetUserId },
    })) as RESTPostAPICurrentUserCreateDMChannelResult;
  }

  async sendEmbed(embed: APIEmbed) {
    const channel = await this.createDM();

    return await this.rest.post(Routes.channelMessages(channel.id), {
      body: { embeds: [embed] },
    });
  }
}
