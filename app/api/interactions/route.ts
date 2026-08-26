import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import {
  fetchMetaRanking,
  findWeaponBuild,
  formatBuildEmbed,
  formatRankingEmbed,
} from "@/services/meta";
import { fetchAllWeaponStats, getWeaponRealStats } from "@/services/stats";
import { findWeaponInMap, formatComparisonResponse } from "@/utils/helpers";
import {
  ALLOWED_WEAPONS,
  ALLOWED_WEAPONS_SET,
  InteractionResponseType,
  InteractionType,
} from "@/types";

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

    // 2. Handshake PING de Discord Developer Portal
    if (body.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    if (body.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
      const options = body.data?.options || [];
      const focusedOption =
        options.find((opt: { focused?: boolean }) => opt.focused) || options[0];
      const query = (focusedOption?.value || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      let weaponEntries: Array<{ name: string; slug: string }> = [];

      try {
        const statsMap = await Promise.race([
          fetchAllWeaponStats(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
        ]);

        if (statsMap && statsMap.size > 0) {
          weaponEntries = Array.from(statsMap.values()).map((w) => ({
            name: w.name,
            slug:
              w.slug ||
              w.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, ""),
          }));
        } else {
          weaponEntries = ALLOWED_WEAPONS.map((name) => ({
            name,
            slug: name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, ""),
          }));
        }
      } catch {
        weaponEntries = ALLOWED_WEAPONS.map((name) => ({
          name,
          slug: name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
        }));
      }

      // Filtro exclusivo por lista permitida (ALLOWED_WEAPONS_SET) y texto de búsqueda
      const filteredEntries = weaponEntries.filter((w) => {
        if (!w || !w.name) return false;
        if (/\b(tier|warzone|meta|ranking)\b/i.test(w.name)) return false;

        const cleanKey = (w.slug || w.name)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        if (!ALLOWED_WEAPONS_SET.has(cleanKey)) return false;

        return cleanKey.includes(query);
      });

      // Eliminación de duplicados y corte en 25 opciones (máximo permitido por Discord)
      const seenSlugs = new Set<string>();
      const choices: Array<{ name: string; value: string }> = [];

      for (const w of filteredEntries) {
        const cleanSlug = w.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!cleanSlug || seenSlugs.has(cleanSlug)) continue;

        seenSlugs.add(cleanSlug);
        choices.push({
          name: w.name.slice(0, 100),
          value: w.slug.slice(0, 100),
        });

        if (choices.length >= 25) break;
      }

      return NextResponse.json({
        type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
        data: { choices },
      });
    }

    if (body.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = body.data?.custom_id || "";

      if (customId.startsWith("weapons_page_")) {
        const page = parseInt(customId.replace("weapons_page_", ""), 10) || 1;

        const weaponEntries = ALLOWED_WEAPONS.map((name) => {
          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          return `• **${name}** ➔ \`${slug}\``;
        });

        const totalCount = weaponEntries.length;
        const pageSize = 30;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const start = (page - 1) * pageSize;
        const pageItems = weaponEntries
          .slice(start, start + pageSize)
          .join("\n");

        return NextResponse.json({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            embeds: [
              {
                title: `🔫 Lista de armas disponibles (Pág. ${page}/${totalPages})`,
                description:
                  "Para comparar dos armas, podés usar el **Nombre** o su **Slug**:\n" +
                  "Ej: `/compare weapon1:an-94 weapon2:mk35-isr`\n\n" +
                  pageItems,
                color: 0x9146ff,
                footer: {
                  text: `Página ${page} de ${totalPages} • Total: ${totalCount} armas`,
                },
              },
            ],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 2,
                    label: "◀️ Anterior",
                    custom_id: `weapons_page_${page - 1}`,
                    disabled: page <= 1,
                  },
                  {
                    type: 2,
                    style: 1,
                    label: "Siguiente ▶️",
                    custom_id: `weapons_page_${page + 1}`,
                    disabled: page >= totalPages,
                  },
                ],
              },
            ],
          },
        });
      }
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

          const weapon1 = findWeaponInMap(w1Input, statsMap);
          const weapon2 = findWeaponInMap(w2Input, statsMap);

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

          const [fullW1, fullW2] = await Promise.all([
            getWeaponRealStats(weapon1),
            getWeaponRealStats(weapon2),
          ]);

          const responsePayload = formatComparisonResponse(
            fullW1,
            fullW2,
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

      // if (commandName === "weapons") {
      //   try {
      //     const statsMap = await fetchAllWeaponStats();

      //     // 1. Filtramos dejando únicamente las armas de la lista permitida
      //     const weaponEntries = Array.from(statsMap.values())
      //       .filter((w) => {
      //         if (!w || !w.name) return false;
      //         if (/\b(tier|warzone|meta|ranking)\b/i.test(w.name)) return false;

      //         const cleanKey = (w.slug || w.name)
      //           .toLowerCase()
      //           .replace(/[^a-z0-9]/g, "");

      //         return ALLOWED_WEAPONS_SET.has(cleanKey);
      //       })
      //       .map((w) => {
      //         const slug =
      //           w.slug ||
      //           w.name
      //             .toLowerCase()
      //             .replace(/[^a-z0-9]+/g, "-")
      //             .replace(/^-+|-+$/g, "");

      //         return `• **${w.name}** ➔ \`${slug}\``;
      //       });

      //     const totalCount = weaponEntries.length;
      //     const listText = weaponEntries.slice(0, 35).join("\n");

      //     return NextResponse.json({
      //       type: 4,
      //       data: {
      //         embeds: [
      //           {
      //             title: "🔫 Lista de armas disponibles",
      //             description:
      //               "Para comparar dos armas, podés usar el **Nombre** o su **Identificador / Slug**:\n" +
      //               "Ej: `/compare weapon1:an-94 weapon2:mk35-isr`\n\n" +
      //               listText,
      //             color: 0x9146ff,
      //             footer: {
      //               text: `Mostrando ${Math.min(35, totalCount)} de ${totalCount} armas disponibles`,
      //             },
      //           },
      //         ],
      //         flags: 64,
      //       },
      //     });
      //   } catch (error) {
      //     return NextResponse.json({
      //       type: 4,
      //       data: { content: `❌ Error al listar armas: ${error}`, flags: 64 },
      //     });
      //   }
      // }
      if (commandName === "weapons") {
        try {
          // Generación instantánea en memoria (0ms de latencia)
          const weaponEntries = ALLOWED_WEAPONS.map((name) => {
            const slug = name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");

            return `• **${name}** ➔ \`${slug}\``;
          });

          const totalCount = weaponEntries.length;
          const pageSize = 30;
          const totalPages = Math.ceil(totalCount / pageSize) || 1;
          const page1 = weaponEntries.slice(0, pageSize).join("\n");

          return NextResponse.json({
            type: 4, // InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              embeds: [
                {
                  title: `🔫 Lista de armas disponibles (Pág. 1/${totalPages})`,
                  description:
                    "Para comparar dos armas, podés usar el **Nombre** o su **Slug**:\n" +
                    "Ej: `/compare weapon1:an-94 weapon2:mk35-isr`\n\n" +
                    page1,
                  color: 0x9146ff,
                  footer: {
                    text: `Página 1 de ${totalPages} • Mostrando ${Math.min(pageSize, totalCount)} de ${totalCount} armas`,
                  },
                },
              ],
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 2, // Button
                      style: 2, // Secondary
                      label: "◀️ Anterior",
                      custom_id: "weapons_page_1",
                      disabled: true,
                    },
                    {
                      type: 2,
                      style: 1, // Primary
                      label: "Siguiente ▶️",
                      custom_id: "weapons_page_2",
                      disabled: totalPages <= 1,
                    },
                  ],
                },
              ],
              flags: 64, // Ephemeral
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
