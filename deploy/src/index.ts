import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  GuildMember,
  TextChannel,
} from "discord.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Config {
  welcome_channel: string;
  welcome_message: string;
  verified_role: string;
  selectable_roles: string[];
  verification_enabled: boolean;
  log_channel: string;
  enable_welcome: boolean;
}

const config: Config = JSON.parse(
  readFileSync(resolve(__dirname, "../config.json"), "utf-8")
);

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("Error: DISCORD_TOKEN is not set.");
  process.exit(1);
}

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions,
];

if (config.enable_welcome) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({
  intents,
  partials: [Partials.Message, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot bereit: ${c.user.tag}`);
});

if (config.enable_welcome) {
  client.on(Events.GuildMemberAdd, (member: GuildMember) => {
    const channel = member.guild.channels.cache.find(
      (ch) => ch.isTextBased() && ch.name === config.welcome_channel
    ) as TextChannel | undefined;

    if (channel) {
      const message = config.welcome_message.replace("{user}", member.toString());
      channel.send(message);
    }
  });
}

client.login(TOKEN);
