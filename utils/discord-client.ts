import { REST } from "discord.js";

export class DiscordClient {
  private rest: REST;
  private DISCORD_ID = process.env.APPLICATION_ID;
}
