# Discord Bot

A bot who sends data to from my app to Discord

## Steps

- share a server w/ bot
- send DMs from this bot to yourself

## Setup

1. Create a bot on Discord Developer Portal
2. Copy the bot token and add it to your environment variables as `DISCORD_BOT_TOKEN`
3. Add your bot to a server
4. Invite the bot to the server using the OAuth2 URL

### Url to retrieve weapon stats

[url](https://app.wzstats.gg/wz2/loadout-builder/context?weaponId=${weaponSlug}&tierlist=alMazrah&game=wz2&addAttachmentsLockedByDefault=true&language=es)

### data-weapons-stats

- contains the data of the weapons stats, you can find it in the `data-weapons-stats` folder

### Next steps

- create a /build command to retrieve best builds for bo7 weapons
- update bot with MW4 meta weapons

#### Discord developer portal

[url](https://discord.com/developers/applications/1535861016347418725/information)
