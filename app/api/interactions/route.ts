// app/api/interactions/route.ts
import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import {
  findWeaponBuild,
  formatBuildEmbed,
  getMetaBuilds,
} from "@/services/meta";

// Forzar ejecución dinámica en Next.js
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-signature-ed25519");
    const timestamp = req.headers.get("x-signature-timestamp");
    const rawBody = await req.text();

    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!signature || !timestamp || !publicKey) {
      return new NextResponse("Missing signature or public key", {
        status: 401,
      });
    }

    // Validación de firma Ed25519 con tweetnacl
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex"),
    );

    if (!isVerified) {
      return new NextResponse("Invalid request signature", { status: 401 });
    }

    const message = JSON.parse(rawBody);

    // 1. Manejo del PING de Discord (type: 1) -> Responde PONG (type: 1)
    if (message.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // 2. Manejo de Slash Commands (type: 2)
    if (message.type === 2) {
      const { name, options } = message.data;

      if (name === "ping") {
        return NextResponse.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: "🏓 ¡Pong! The bot is active and running in Next.js.",
          },
        });
      }

      if (name === "meta") {
        const weaponOption = options?.find(
          (opt: { name: string; value: string }) => opt.name === "arma",
        )?.value;

        if (weaponOption) {
          const build = findWeaponBuild(weaponOption);

          if (!build) {
            return NextResponse.json({
              type: 4,
              data: {
                content: `❌ Arma no encontrada: **${weaponOption}**`,
              },
            });
          }

          return NextResponse.json({
            type: 4,
            data: {
              embeds: [formatBuildEmbed(build)],
            },
          });
        }

        const allbuilds = getMetaBuilds();

        return NextResponse.json({
          type: 4,
          data: {
            embeds: allbuilds.map((b) => formatBuildEmbed(b)),
          },
        });
      }
    }

    return NextResponse.json({ error: "Unknown interaction" }, { status: 400 });
  } catch (error) {
    console.error("Error en interaction handler:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
