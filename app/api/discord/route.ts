// route.ts

import { DiscordClient } from "@/utils/discord-client";
import { NextResponse } from "next/server";

export const POST = async () => {
  try {
    const discord = new DiscordClient();

    await discord.sendEmbed({
      title: "New user",
      color: 0x00ff00,
      fields: [
        {
          name: "email",
          value: "example@hotmail.com",
        },
      ],
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Embed sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error sending embed:", error);
    return NextResponse.json(
      { message: "Error sending embed" },
      { status: 500 },
    );
  }
};
