// app/api/interactions/route.ts
import { NextResponse } from "next/server";
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

// Tipo 1 de Discord: PING (Handshake de seguridad)
// Tipo 2 de Discord: APPLICATION_COMMAND (Comando Slash)
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

// Tipo de respuesta para comandos
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Handshake inicial que Discord pide para validar la URL
    if (body.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // 2. Si es un comando slash
    if (body.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = body.data.name;

      if (commandName === "meta") {
        // Obtenemos el parámetro que pasó el usuario (ej: "fg42", "cbrs 3")
        const options = body.data.options || [];
        const weaponOption =
          options.find(
            (opt: { name: string; value: string }) => opt.name === "weapon",
          )?.value || "fg42";

        // Ejecutamos el scraper que armamos en services/meta.ts
        const build = await findWeaponBuild(weaponOption);

        if (!build) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `❌ No se encontró una clase meta para **${weaponOption}**. Verificá el nombre.`,
              flags: 64, // 64 = Ephemeral (solo lo ve quien ejecutó el comando)
            },
          });
        }

        // Armamos el Embed visual con el código copiable
        const embed = formatBuildEmbed(build);

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [embed],
            flags: 64,
          },
        });
      }
    }

    if (body.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = body.data.name;

      // 1. Comando: /ranking (Muestra el Top de armas)
      if (commandName === "ranking") {
        const list = await fetchMetaRanking(); // Llama al scraper de la home
        const embed = formatRankingEmbed(list);

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [embed], flags: 64 },
        });
      }

      // 2. Comando: /meta [arma] (Muestra la clase y código del arma específica)
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
              content: `❌ No se encontró una clase meta para **${weaponOption}**.`,
              flags: 64, // Ephemeral
            },
          });
        }

        const embed = formatBuildEmbed(build);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { embeds: [embed], flags: 64 },
        });
      }

      if (commandName === "compare") {
        const options = body.data.options || [];
        // Obtenemos los valores ingresados por el usuario
        const w1Input = options.find(
          (opt: { name: string; value: string }) => opt.name === "weapon1",
        )?.value as string;
        const w2Input = options.find(
          (opt: { name: string; value: string }) => opt.name === "weapon2",
        )?.value as string;
        const showTable =
          (options.find(
            (opt: { name: string; value: boolean }) => opt.name === "table",
          )?.value as boolean) || false;

        if (!w1Input || !w2Input) {
          return NextResponse.json({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              content:
                "⚠️ Debes especificar ambas armas para comparar. Ej: `/compare weapon1:an-94 weapon2:fg42`",
              flags: 64, // Mensaje privado (ephemeral)
            },
          });
        }

        try {
          const statsMap = await fetchAllWeaponStats();

          // Normalizamos para buscar coincidencias
          const cleanKey1 = w1Input.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cleanKey2 = w2Input.toLowerCase().replace(/[^a-z0-9]/g, "");

          // Buscamos las armas en el Map
          let weapon1 = statsMap.get(cleanKey1);
          let weapon2 = statsMap.get(cleanKey2);

          // Búsqueda flexible por si escribieron "an94" y en el map está "an-94"
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
              type: 4,
              data: {
                content: `❌ No se encontraron estadísticas para ${missing}. Verificá los nombres e intentá de nuevo.`,
                flags: 64,
              },
            });
          }

          // Generamos el payload con los embeds
          const responsePayload = formatComparisonResponse(
            weapon1,
            weapon2,
            showTable,
          );

          return NextResponse.json({
            type: 4,
            data: responsePayload,
          });
        } catch (error) {
          console.error("Error procesando /compare:", error);
          return NextResponse.json({
            type: 4,
            data: {
              content:
                "❌ Ocurrió un error al obtener la comparativa. Intenta de nuevo más tarde.",
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
    console.error("Error procesando interaction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
