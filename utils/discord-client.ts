import {
  APIEmbed,
  REST,
  RESTPostAPICurrentUserCreateDMChannelResult,
  Routes,
} from "discord.js";

export class DiscordClient {
  private rest: REST;
  private DISCORD_ID = process.env.APPLICATION_ID;

  constructor() {
    this.rest =
      new REST({ version: "10" }).setToken(
        process.env.DISCORD_BOT_TOKEN as string,
      ) ?? "";
  }

  private async createDM() {
    return this.rest.post(Routes.userChannels(), {
      body: { recipient_id: this.DISCORD_ID },
    }) as Promise<RESTPostAPICurrentUserCreateDMChannelResult>;
  }

  async sendEmbed(embed: APIEmbed) {
    const channel = await this.createDM();
    return this.rest.post(Routes.channelMessages(channel.id), {
      body: { embeds: [embed] },
    });
  }
}
