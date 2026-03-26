import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Message,
  GuildMember,
  TextChannel,
  PermissionsBitField,
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
  console.error("Error: DISCORD_TOKEN is not set. Please add it to your secrets.");
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

const PREFIX = "!";

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

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  switch (command) {
    case "hello": {
      await message.channel.send("Hallo! Ich bin dein Custom Discord Bot.");
      break;
    }

    case "ping": {
      await message.channel.send("Pong!");
      break;
    }

    case "role": {
      const roleName = args.join(" ");
      if (!roleName) {
        await message.channel.send(`Bitte gib einen Rollennamen an. Erlaubte Rollen: ${config.selectable_roles.join(", ")}`);
        break;
      }
      if (!config.selectable_roles.includes(roleName)) {
        await message.channel.send(`Erlaubte Rollen: ${config.selectable_roles.join(", ")}`);
        break;
      }
      const role = message.guild?.roles.cache.find((r) => r.name === roleName);
      if (!role) {
        await message.channel.send(`Rolle "${roleName}" nicht gefunden.`);
        break;
      }
      const member = message.member;
      if (!member) break;
      await member.roles.add(role);
      await message.channel.send(`Rolle **${roleName}** wurde dir zugewiesen!`);
      break;
    }

    case "roles": {
      await message.channel.send(`Erlaubte Rollen: ${config.selectable_roles.join(", ")}`);
      break;
    }

    case "verify": {
      if (!config.verification_enabled) {
        await message.channel.send("Verifizierung ist deaktiviert.");
        break;
      }
      const role = message.guild?.roles.cache.find((r) => r.name === config.verified_role);
      if (!role) {
        await message.channel.send("Verifizierungsrolle nicht gefunden.");
        break;
      }
      await message.member?.roles.add(role);
      await message.channel.send("Du bist nun verifiziert! ✅");
      break;
    }

    case "dice": {
      const sides = parseInt(args[0] ?? "6", 10);
      if (isNaN(sides) || sides < 2) {
        await message.channel.send("Bitte gib eine gültige Seitenzahl an (mindestens 2).");
        break;
      }
      const result = Math.floor(Math.random() * sides) + 1;
      await message.channel.send(`🎲 Du hast eine **${result}** gewürfelt! (1-${sides})`);
      break;
    }

    case "kick": {
      if (!message.member?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        await message.channel.send("Du hast keine Berechtigung, Mitglieder zu kicken.");
        break;
      }
      const target = message.mentions.members?.first();
      if (!target) {
        await message.channel.send("Bitte erwähne ein Mitglied zum Kicken.");
        break;
      }
      const reason = args.slice(1).join(" ") || "Kein Grund angegeben";
      await target.kick(reason);
      await message.channel.send(`**${target.user.tag}** wurde gekickt. Grund: ${reason}`);
      break;
    }

    case "ban": {
      if (!message.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        await message.channel.send("Du hast keine Berechtigung, Mitglieder zu bannen.");
        break;
      }
      const target = message.mentions.members?.first();
      if (!target) {
        await message.channel.send("Bitte erwähne ein Mitglied zum Bannen.");
        break;
      }
      const reason = args.slice(1).join(" ") || "Kein Grund angegeben";
      await target.ban({ reason });
      await message.channel.send(`**${target.user.tag}** wurde gebannt. Grund: ${reason}`);
      break;
    }

    case "clear": {
      if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        await message.channel.send("Du hast keine Berechtigung, Nachrichten zu löschen.");
        break;
      }
      const amount = parseInt(args[0] ?? "5", 10);
      if (isNaN(amount) || amount < 1 || amount > 100) {
        await message.channel.send("Bitte gib eine Zahl zwischen 1 und 100 an.");
        break;
      }
      if (message.channel.isTextBased() && "bulkDelete" in message.channel) {
        await message.channel.bulkDelete(amount + 1, true);
        const confirm = await message.channel.send(`🗑️ ${amount} Nachrichten gelöscht.`);
        setTimeout(() => confirm.delete().catch(() => {}), 5000);
      }
      break;
    }

    case "help": {
      await message.channel.send(
        "**Verfügbare Befehle:**\n" +
        "`!hello` – Begrüßung\n" +
        "`!ping` – Pong!\n" +
        "`!role <Name>` – Rolle zuweisen\n" +
        "`!roles` – Verfügbare Rollen anzeigen\n" +
        "`!verify` – Verifiziert werden\n" +
        "`!dice [Seiten]` – Würfeln\n" +
        "`!kick @User [Grund]` – Mitglied kicken\n" +
        "`!ban @User [Grund]` – Mitglied bannen\n" +
        "`!clear [Anzahl]` – Nachrichten löschen"
      );
      break;
    }
  }
});

client.login(TOKEN);
