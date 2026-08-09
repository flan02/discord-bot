import { DiscordClient } from "@/utils/discord-client";

export const POST = async () => {
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
  });

  return new Response(JSON.stringify({ message: "Embed sent" }), {
    status: 200,
  });
};
