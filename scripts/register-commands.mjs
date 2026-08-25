const APP_ID = process.env.DISCORD_APPLICATION_ID;
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
  {
    name: "ranking",
    description: "Muestra el Top 10 de armas meta del parche actual de Warzone",
  },
  {
    name: "compare",
    description:
      "Compara estadísticas clave (TTK, daño, alcance, agilidad) entre 2 armas",
    options: [
      {
        name: "weapon1",
        description: "Primera arma a comparar (ej: an-94)",
        type: 3, // STRING
        required: true,
        autocomplete: true,
      },
      {
        name: "weapon2",
        description: "Segunda arma a comparar (ej: fg42)",
        type: 3, // STRING
        required: true,
        autocomplete: true,
      },
      {
        name: "table",
        description: "¿Mostrar cuadro detallado de daño por zonas del cuerpo?",
        type: 5, // BOOLEAN
        required: false,
      },
    ],
  },
  {
    name: "weapons",
    description: "Muestra la lista de armas disponibles para comparar",
  },
];

async function register() {
  if (!APP_ID || !BOT_TOKEN) {
    console.error("❌ Missing required environment variables in .env");
    process.exit(1);
  }

  // Endpoint global (sin guild_id) para que funcione en todos los servidores
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

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
      "✅ Comandos (/ping, /ranking, /meta, /compare, /weapons) registrados exitosamente a nivel global!",
    );
  } else {
    console.error("❌ Error al registrar comandos:", await response.text());
  }
}

register();
