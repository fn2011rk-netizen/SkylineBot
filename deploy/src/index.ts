import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  ChatInputCommandInteraction,
  Interaction,
  GuildMember,
  StringSelectMenuInteraction,
  Collection,
} from "discord.js";
import { createServer } from "http";
import "dotenv/config";
import { setupDatabase, getGuildSettings, pool } from "./db.js";
import { economyCommands, handleEconomy } from "./commands/economy.js";
import { moderationCommands, handleModeration } from "./commands/moderation.js";
import { utilityCommands, handleUtility } from "./commands/utility.js";
import { rankCommands, handleRank, addXp } from "./commands/rank.js";
import { inviteCommands, handleInvites } from "./commands/invites.js";
import { roleCommands, handleRoles } from "./commands/roles.js";
import { setupCommands, handleSetup, sendWelcomeMessage } from "./commands/setup.js";
import { verifyCommands, handleVerify } from "./commands/verify.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
  console.error("Error: DISCORD_TOKEN ist nicht gesetzt.");
  process.exit(1);
}

// Health check server for Railway
const PORT = parseInt(process.env.PORT ?? "3000", 10);
createServer((_req, res) => {
  res.writeHead(200);
  res.end("Bot is running");
}).listen(PORT, () => {
  console.log(`✅ Health-Check läuft auf Port ${PORT}`);
});

const allCommands = [
  ...economyCommands,
  ...moderationCommands,
  ...utilityCommands,
  ...rankCommands,
  ...inviteCommands,
  ...roleCommands,
  ...setupCommands,
  ...verifyCommands,
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel],
});

// Cooldown map for XP (avoid XP spam)
const xpCooldown = new Collection<string, number>();

// Raid detection
const recentJoins = new Collection<string, number[]>();

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot bereit: ${c.user.tag}`);

  const rest = new REST().setToken(TOKEN!);
  try {
    const commandData = allCommands.map((cmd) => cmd.toJSON());
    if (CLIENT_ID) {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandData });
      console.log(`✅ ${commandData.length} globale Slash Commands registriert`);
    } else {
      // Register per-guild for instant updates (testing)
      for (const guild of c.guilds.cache.values()) {
        await rest.put(Routes.applicationGuildCommands(c.user.id, guild.id), { body: commandData });
      }
      console.log(`✅ ${commandData.length} Guild-Commands registriert (setze CLIENT_ID für globale Commands)`);
    }
  } catch (err) {
    console.error("Fehler beim Registrieren der Commands:", err);
  }
});

// XP beim Schreiben von Nachrichten
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guildId) return;

  const key = `${message.author.id}-${message.guildId}`;
  const now = Date.now();
  const last = xpCooldown.get(key) ?? 0;

  if (now - last > 60_000) {
    xpCooldown.set(key, now);
    const xpGain = Math.floor(Math.random() * 10) + 5;
    const result = await addXp(message.author.id, message.guildId, xpGain);
    if (result.leveledUp) {
      await message.channel.send(`🎉 ${message.author.toString()} ist jetzt **Level ${result.newLevel}**!`);
    }
  }
});

// Willkommensnachrichten + Raid-Schutz + Invite-Tracking
client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  const guildId = member.guild.id;
  const settings = await getGuildSettings(guildId);

  // Raid-Schutz
  if (settings.raid_enabled) {
    const now = Date.now();
    const window = (settings.raid_window ?? 10) * 1000;
    const threshold = settings.raid_threshold ?? 10;
    const joins = recentJoins.get(guildId) ?? [];
    const filtered = joins.filter((t) => now - t < window);
    filtered.push(now);
    recentJoins.set(guildId, filtered);

    if (filtered.length >= threshold) {
      console.warn(`⚠️ Raid erkannt in ${member.guild.name}! Aktion: ${settings.raid_action}`);
      if (settings.raid_action === "kick") {
        await member.kick("Raid-Schutz").catch(() => {});
        return;
      } else if (settings.raid_action === "ban") {
        await member.ban({ reason: "Raid-Schutz" }).catch(() => {});
        return;
      }
    }
  }

  // Willkommensnachricht
  await sendWelcomeMessage(member.guild, member, settings);

  // Invite-Tracking
  try {
    const invites = await member.guild.invites.fetch();
    for (const invite of invites.values()) {
      if (invite.inviter) {
        await pool.query(
          `INSERT INTO invites (inviter_id, guild_id, invite_count) VALUES ($1, $2, 1)
           ON CONFLICT (inviter_id, guild_id) DO UPDATE SET invite_count = invites.invite_count + 1`,
          [invite.inviter.id, guildId]
        );
        break;
      }
    }
  } catch {}
});

// Slash Command Handler
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = interaction as ChatInputCommandInteraction;
    try {
      const name = cmd.commandName;

      if (["balance", "daily", "pay"].includes(name)) return handleEconomy(cmd);
      if (["ban", "kick", "clear", "timeout", "warn", "warnings"].includes(name)) return handleModeration(cmd);
      if (["ping", "hello", "help", "dice", "serverinfo", "userinfo"].includes(name)) return handleUtility(cmd, client);
      if (["rank", "leaderboard"].includes(name)) return handleRank(cmd);
      if (["invites", "inviteleaderboard"].includes(name)) return handleInvites(cmd);
      if (["roles", "role", "panel"].includes(name)) return handleRoles(cmd);
      if (["setup", "config"].includes(name)) return handleSetup(cmd);
      if (name === "verify") return handleVerify(cmd);
    } catch (err) {
      console.error("Fehler beim Verarbeiten des Commands:", err);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Ein Fehler ist aufgetreten.", ephemeral: true }).catch(() => {});
      }
    }
  }

  // Rollen-Panel Dropdown
  if (interaction.isStringSelectMenu()) {
    const sel = interaction as StringSelectMenuInteraction;
    if (sel.customId.startsWith("panel_")) {
      const roleId = sel.values[0];
      const member = sel.guild?.members.cache.get(sel.user.id);
      const role = sel.guild?.roles.cache.get(roleId);
      if (!member || !role) {
        await sel.reply({ content: "Rolle nicht gefunden.", ephemeral: true });
        return;
      }
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role);
        await sel.reply({ content: `✅ Rolle **${role.name}** entfernt.`, ephemeral: true });
      } else {
        await member.roles.add(role);
        await sel.reply({ content: `✅ Rolle **${role.name}** erhalten.`, ephemeral: true });
      }
    }
  }
});

await setupDatabase();
await client.login(TOKEN);
