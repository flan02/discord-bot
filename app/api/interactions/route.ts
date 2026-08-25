import { NextResponse } from "next/server";
// import { verifyKey } from "discord-interactions";
import nacl from "tweetnacl";
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
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const rawBody = await req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return new NextResponse("Missing signature or public key", {
      status: 401,
    });
  }

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, "hex"),
    Buffer.from(publicKey, "hex"),
  );

  if (!isVerified) {
    return new NextResponse("Invalid request signature", { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    // const body = await req.json();

    // 2. Handshake PING de Discord Developer Portal
    if (body.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    if (body.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
      const options = body.data?.options || [];
      const focusedOption = options.find(
        (opt: { focused?: boolean }) => opt.focused,
      );
      const query = (focusedOption?.value || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      let weaponNames: string[] = [];

      try {
        // Intenta usar lo que ya está en RAM con un corte de seguridad a los 800ms
        const statsMap = await Promise.race([
          fetchAllWeaponStats(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
        ]);

        if (statsMap && statsMap.size > 0) {
          weaponNames = Array.from(statsMap.values()).map((w) => w.name);
        } else {
          weaponNames = [
            "AN-94",
            "FG42",
            "MK35 ISR",
            "DS20 MIRAGE",
            "AK-27",
            "HRM-9",
            "Superi 46",
            "RAM-7",
            "MCW",
            "SVA 545",
            "MTZ-556",
            "Striker",
            "WSP-9",
            "Kar98k",
            "FJX Horus",
            "Static-HV",
          ];
        }
      } catch {
        weaponNames = [
          "AN-94",
          "FG42",
          "MK35 ISR",
          "DS20 MIRAGE",
          "AK-27",
          "HRM-9",
          "Superi 46",
          "RAM-7",
          "MCW",
          "SVA 545",
          "MTZ-556",
        ];
      }

      const choices = weaponNames
        .filter((name) =>
          name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .includes(query),
        )
        .slice(0, 25)
        .map((name) => ({ name, value: name }));

      return NextResponse.json({
        type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
        data: { choices },
      });
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
        const options: Array<{
          name: string;
          value: string | number | boolean;
        }> = body.data.options || [];

        const w1Input = options.find((opt) => opt.name === "weapon1")?.value as
          | string
          | undefined;
        const w2Input = options.find((opt) => opt.name === "weapon2")?.value as
          | string
          | undefined;
        const showTable = Boolean(
          options.find((opt) => opt.name === "table" || opt.name === "tabla")
            ?.value,
        );

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
            data: {
              ...responsePayload,
              flags: 64,
            },
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

      if (commandName === "weapons") {
        try {
          const statsMap = await fetchAllWeaponStats();
          const weaponNames = Array.from(statsMap.values())
            .map((w) => `• \`${w.name}\``)
            .sort();

          // Dividimos en bloques si supera el límite de caracteres de Discord
          const listText = weaponNames.slice(0, 35).join("\n");

          return NextResponse.json({
            type: 4,
            data: {
              embeds: [
                {
                  title: "🔫 Armas Disponibles para Comparar",
                  description: `Usa estos nombres exactos en \`/compare\`:\n\n${listText}`,
                  color: 0x9146ff,
                  footer: {
                    text: `Total de armas cargadas: ${statsMap.size}`,
                  },
                },
              ],
              flags: 64,
            },
          });
        } catch (error) {
          return NextResponse.json({
            type: 4,
            data: { content: `❌ Error al listar armas: ${error}`, flags: 64 },
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
