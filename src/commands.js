import { ApplicationCommandOptionType } from "discord-api-types/v10";

export const CURL_COMMAND = {
  name: "curl",
  description: "Make an HTTP request using the specified method and URL",
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "method",
      description: "The HTTP method to use for the request",
      required: true,
      choices: [
        {
          name: "GET",
          value: "GET",
        },
        {
          name: "POST",
          value: "POST",
        },
        {
          name: "PUT",
          value: "PUT",
        },
        {
          name: "DELETE",
          value: "DELETE",
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.String,
      name: "url",
      description: "The URL to send the request to",
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: "body",
      description: "The body of the request (optional)",
      required: false,
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: "ephemeral",
      description: "Whether to send the response as an ephemeral message",
      required: false,
    },
  ],
};
