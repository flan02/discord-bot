const APP_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  {
    name: "ping",
    description: "Comprueba si el bot está respondiendo",
  },
];

async function register() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (response.ok) {
    console.log("✅ /ping registered successfully.");
  } else {
    console.error("❌ Error al registrar comando:", await response.text());
  }
}

register();

// node --env-file=.env.local scripts/register-commands.mjs
