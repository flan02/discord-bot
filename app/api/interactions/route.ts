// Bot will listen to interactions and respond accordingly (/meta, /ping)

import { NextResponse } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";

export async function POST(req: Request) {
  const signature = req.headers.get("X-Signature-Ed25519");
  const timestamp = req.headers.get("X-Signature-Timestamp");
  const rawBody = await req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
    console.error("❌ Falta DISCORD_PUBLIC_KEY en las variables de entorno");
    return new NextResponse("Server configuration error", { status: 500 });
  }

  // 1. Verificación de seguridad de Discord
  const isValidRequest = verifyKey(
    rawBody,
    signature || "",
    timestamp || "",
    publicKey,
  );

  if (!isValidRequest) {
    return new NextResponse("Invalid request signature", { status: 401 });
  }

  const message = JSON.parse(rawBody);

  // 2. Discord envía un PING de verificación al configurar la URL
  if (message.type === InteractionType.PING) {
    return NextResponse.json({
      type: InteractionResponseType.PONG,
    });
  }

  // 3. Responder a los comandos de barra diagonal (Slash Commands)
  if (message.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = message.data;

    if (name === "ping") {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "🏓 the bot is alive and listening.",
        },
      });
    }
  }

  return NextResponse.json({ error: "Unknown interaction" }, { status: 400 });
}
