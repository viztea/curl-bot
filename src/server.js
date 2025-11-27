import { AutoRouter } from "itty-router";
import { verifyKey } from "discord-interactions";
import { CURL_COMMAND } from "./commands.js";
import mime from "mime";
import {
  MessageFlags,
  InteractionType,
  InteractionResponseType,
} from "discord-api-types/v10";

class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    };
    super(jsonBody, init);
  }
}

const router = AutoRouter();

router.get("/", (request, env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

router.post("/", async (request, env) => {
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env,
  );
  if (!isValid || !interaction) {
    return new Response("Bad request signature.", { status: 401 });
  }

  if (interaction.type === InteractionType.Ping) {
    return new JsonResponse({
      type: InteractionResponseType.Pong,
    });
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
    /**
     * @type {import("discord-api-types/v10").APIChatInputApplicationCommandInteractionData}
     */
    const command = interaction.data;

    switch (command.name.toLowerCase()) {
      case CURL_COMMAND.name.toLowerCase(): {
        const method = command.options.find((it) => it.name === "method").value;

        const url = new URL(
          command.options.find((it) => it.name === "url").value,
        );

        const body = command.options.find((it) => it.name === "body")?.value;

        const ephemeral = command.options.find(
          (it) => it.name === "ephemeral",
        )?.value;

        const start = performance.now();

        let response;
        try {
          response = await fetch(url, {
            method: method,
            body: body || undefined,
            headers: body
              ? {
                  "Content-Type": "application/json",
                }
              : {},
          });
        } catch (error) {
          console.error("Error making request:", error);

          const form = new FormData();

          form.append(
            "payload_json",
            JSON.stringify({
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `**${method}** to ${url.hostname} failed to execute with error:`,
                flags: ephemeral == true ? MessageFlags.Ephemeral : 0,
              },
            }),
          );

          form.append(
            "file",
            new Blob([error.toString()], { type: "text/plain" }),
            "error.txt",
          );

          return new Response(form);
        }

        const discordResponse = {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `**${method}** to \`${url.hostname}\` took *${performance.now() - start} ms* to return ${response.body ? "the following response:" : "no response."}`,
            flags: ephemeral == true ? MessageFlags.Ephemeral : 0,
          },
        };

        if (response.body) {
          const form = new FormData();
          form.append("payload_json", JSON.stringify(discordResponse));

          let file;
          let fileName;

          const ext = mime.getExtension(response.headers.get("content-type"));
          if (ext === "json") {
            const json = await response.json();
            file = new Blob([JSON.stringify(json, null, 2)], {
              type: "application/json",
            });
            fileName = "response.json";
          } else if (ext === "txt") {
            const text = await response.text();
            file = new Blob([text], { type: "text/plain" });
            fileName = "response.txt";
          } else {
            file = await response.blob();
            fileName = `response.${ext}`;
          }

          form.append("file", file, fileName);
          return new Response(form);
        } else {
          return Response.json(discordResponse);
        }
      }
      default:
        return new JsonResponse({ error: "Unknown Type" }, { status: 400 });
    }
  }

  console.error("Unknown Type");
  return new JsonResponse({ error: "Unknown Type" }, { status: 400 });
});

router.all("*", () => new Response("Not Found.", { status: 404 }));

/**
 * @returns {Promise<{ interaction: import("discord-api-types/v10").APIInteraction, isValid: true } | { isValid: false }>}
 */
async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

const server = {
  verifyDiscordRequest,
  fetch: router.fetch,
};

export default server;
