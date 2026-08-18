const APP_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  {
    name: "ping",
    description: "Check if the bot is active",
  },
  {
    name: "meta",
    description: "Get the best loadout for a Warzone weapon",
    options: [
      {
        name: "weapon",
        description: "Weapon name (e.g., kar98k, superi46)",
        type: 3, // STRING
        required: false,
      },
    ],
  },
];

async function register() {
  if (!APP_ID || !GUILD_ID || !BOT_TOKEN) {
    console.error("❌ Missing required environment variables in .env.local");
    process.exit(1);
  }
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
    console.log(
      "✅ Commands /ping and /meta registered successfully in the server.",
    );
  } else {
    console.error("❌ Error al registrar comando:", await response.text());
  }
}

register();

// node --env-file=.env scripts/register-commands.mjs
