import { NextResponse } from "next/server";
// import { verifyKey } from "discord-interactions";
import {
  fetchMetaRanking,
  findWeaponBuild,
  formatBuildEmbed,
  formatRankingEmbed,
} from "@/services/meta";
import {
  fetchAllWeaponStats,
  formatComparisonResponse,
} from "@/services/stats";

const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
};

export async function POST(req: Request) {
  // const signature = req.headers.get("x-signature-ed25519");
  // const timestamp = req.headers.get("x-signature-timestamp");
  // const rawBody = await req.text();

  // 1. Verificación de seguridad de Discord
  // const isValidRequest =
  //   signature &&
  //   timestamp &&
  //   process.env.DISCORD_PUBLIC_KEY &&
  //   verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);

  // if (!isValidRequest) {
  //   return new NextResponse("Invalid request signature", { status: 401 });
  // }

  try {
    // const body = JSON.parse(rawBody);
    const body = await req.json();

    // 2. Handshake PING de Discord Developer Portal
    if (body.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // 3. Comandos Slash
    if (body.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = body.data.name;

      // Comando: /ping
      if (commandName === "ping") {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "🏓 Pong! El bot está online y respondiendo.",
            flags: 64,
          },
        });
      }

      // Comando: /ranking
      if (commandName === "ranking") {
        const list = await fetchMetaRanking();
        const embed = formatRankingEmbed(list);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [embed], flags: 64 },
        });
      }

      // Comando: /meta [weapon]
      if (commandName === "meta") {
        const options = body.data.options || [];
        const weaponOption =
          options.find(
            (opt: { name: string; value: string }) => opt.name === "weapon",
          )?.value || "an-94";

        const build = await findWeaponBuild(weaponOption);
        if (!build) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `❌ No se encontró una clase meta para **${weaponOption}**. Verificá el nombre.`,
              flags: 64,
            },
          });
        }

        const embed = formatBuildEmbed(build);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [embed], flags: 64 },
        });
      }

      // Comando: /compare weapon1 weapon2 [table]
      if (commandName === "compare") {
        const options = body.data.options || [];
        const w1Input = options.find(
          (opt: { name: string; value: string }) => opt.name === "weapon1",
        )?.value as string;
        const w2Input = options.find(
          (opt: { name: string; value: string }) => opt.name === "weapon2",
        )?.value as string;
        const showTable =
          (options.find(
            (opt: { name: string; value: boolean }) =>
              opt.name === "table" || opt.name === "tabla",
          )?.value as boolean) || false;

        if (!w1Input || !w2Input) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                "⚠️ Debés especificar ambas armas para comparar. Ej: `/compare weapon1:an-94 weapon2:fg42`",
              flags: 64,
            },
          });
        }

        try {
          const statsMap = await fetchAllWeaponStats();

          const cleanKey1 = w1Input.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cleanKey2 = w2Input.toLowerCase().replace(/[^a-z0-9]/g, "");

          let weapon1 = statsMap.get(cleanKey1);
          let weapon2 = statsMap.get(cleanKey2);

          if (!weapon1) {
            for (const [key, val] of statsMap.entries()) {
              if (key.includes(cleanKey1) || cleanKey1.includes(key)) {
                weapon1 = val;
                break;
              }
            }
          }

          if (!weapon2) {
            for (const [key, val] of statsMap.entries()) {
              if (key.includes(cleanKey2) || cleanKey2.includes(key)) {
                weapon2 = val;
                break;
              }
            }
          }

          if (!weapon1 || !weapon2) {
            const missing =
              !weapon1 && !weapon2
                ? `"${w1Input}" ni "${w2Input}"`
                : !weapon1
                  ? `"${w1Input}"`
                  : `"${w2Input}"`;

            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `❌ No se encontraron estadísticas para ${missing}. Verificá los nombres.`,
                flags: 64,
              },
            });
          }

          const responsePayload = formatComparisonResponse(
            weapon1,
            weapon2,
            showTable,
          );

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: responsePayload,
          });
        } catch (error) {
          console.error("Error procesando /compare:", error);
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "❌ Ocurrió un error al obtener la comparativa.",
              flags: 64,
            },
          });
        }
      }
    }

    return NextResponse.json(
      { error: "Comando no reconocido" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error general en interaction route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
