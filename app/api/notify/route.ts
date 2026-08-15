// app/api/notify/route.ts
import { DiscordClient } from "@/utils/discord-client";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const discord = new DiscordClient();

    await discord.sendEmbed({
      title: "New notification",
      color: 0x00ff00,
      description: "Notificación de prueba desde Next.js",
      fields: [
        {
          name: "Status",
          value: "Activo",
        },
      ],
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Embed enviado con éxito" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error enviando embed:", error);
    return NextResponse.json(
      { error: "Error al enviar notificación de Discord" },
      { status: 500 },
    );
  }
}
