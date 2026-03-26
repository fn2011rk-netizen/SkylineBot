import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { pool, getGuildSettings } from "../db.js";

export const setupCommands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Bot-Einstellungen konfigurieren")
    .addSubcommandGroup((group) =>
      group.setName("welcome").setDescription("Willkommen-System")
        .addSubcommand((sub) => sub.setName("enable").setDescription("Aktivieren"))
        .addSubcommand((sub) => sub.setName("disable").setDescription("Deaktivieren"))
        .addSubcommand((sub) =>
          sub.setName("channel").setDescription("Kanal festlegen")
            .addChannelOption((o) => o.setName("kanal").setDescription("Willkommenskanal").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName("message").setDescription("Nachricht festlegen")
            .addStringOption((o) =>
              o.setName("text").setDescription("Text ({user} {server} {count})").setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub.setName("color").setDescription("Embed-Farbe festlegen")
            .addStringOption((o) => o.setName("hex").setDescription("Hex-Farbe z.B. #FF5733").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName("image").setDescription("Bild-URL festlegen")
            .addStringOption((o) => o.setName("url").setDescription("Bild-URL").setRequired(true))
        )
        .addSubcommand((sub) => sub.setName("test").setDescription("Willkommensnachricht testen"))
    )
    .addSubcommandGroup((group) =>
      group.setName("verify").setDescription("Verifizierungs-System")
        .addSubcommand((sub) => sub.setName("enable").setDescription("Aktivieren"))
        .addSubcommand((sub) => sub.setName("disable").setDescription("Deaktivieren"))
        .addSubcommand((sub) =>
          sub.setName("role").setDescription("Rolle festlegen")
            .addRoleOption((o) => o.setName("rolle").setDescription("Verifizierungsrolle").setRequired(true))
        )
        .addSubcommand((sub) => sub.setName("post").setDescription("Verify-Nachricht posten"))
    )
    .addSubcommandGroup((group) =>
      group.setName("raid").setDescription("Raid-Schutz")
        .addSubcommand((sub) => sub.setName("enable").setDescription("Aktivieren"))
        .addSubcommand((sub) => sub.setName("disable").setDescription("Deaktivieren"))
        .addSubcommand((sub) =>
          sub.setName("threshold").setDescription("Beitritts-Schwellenwert")
            .addIntegerOption((o) => o.setName("anzahl").setDescription("Joins bis Raid erkannt wird").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName("window").setDescription("Zeitfenster in Sekunden")
            .addIntegerOption((o) => o.setName("sekunden").setDescription("Zeitfenster").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName("action").setDescription("Aktion bei Raid")
            .addStringOption((o) =>
              o.setName("aktion").setDescription("Aktion").setRequired(true)
                .addChoices({ name: "Kick", value: "kick" }, { name: "Ban", value: "ban" }, { name: "Nur Log", value: "log" })
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Aktuelle Konfiguration anzeigen")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

export async function handleSetup(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;

  if (interaction.commandName === "config") {
    const s = await getGuildSettings(guildId);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("⚙️ Server-Konfiguration")
      .addFields(
        { name: "👋 Willkommen", value: s.welcome_enabled ? `✅ Aktiv — <#${s.welcome_channel}>` : "❌ Deaktiviert", inline: true },
        { name: "✅ Verifizierung", value: s.verify_enabled ? `✅ Aktiv — <@&${s.verify_role}>` : "❌ Deaktiviert", inline: true },
        { name: "🛡️ Raid-Schutz", value: s.raid_enabled ? `✅ Aktiv — ${s.raid_threshold} Joins/${s.raid_window}s → ${s.raid_action}` : "❌ Deaktiviert", inline: true }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (interaction.commandName !== "setup") return;

  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();

  if (group === "welcome") {
    if (sub === "enable") {
      await pool.query(`UPDATE guild_settings SET welcome_enabled = TRUE WHERE guild_id = $1`, [guildId]);
      await interaction.reply({ content: "✅ Willkommensnachrichten aktiviert.", ephemeral: true });
    }
    if (sub === "disable") {
      await pool.query(`UPDATE guild_settings SET welcome_enabled = FALSE WHERE guild_id = $1`, [guildId]);
      await interaction.reply({ content: "❌ Willkommensnachrichten deaktiviert.", ephemeral: true });
    }
    if (sub === "channel") {
      const channel = interaction.options.getChannel("kanal", true);
      await pool.query(`UPDATE guild_settings SET welcome_channel = $1 WHERE guild_id = $2`, [channel.id, guildId]);
      await interaction.reply({ content: `✅ Willkommenskanal gesetzt: ${channel.toString()}`, ephemeral: true });
    }
    if (sub === "message") {
      const text = interaction.options.getString("text", true);
      await pool.query(`UPDATE guild_settings SET welcome_message = $1 WHERE guild_id = $2`, [text, guildId]);
      await interaction.reply({ content: `✅ Willkommensnachricht gesetzt.`, ephemeral: true });
    }
    if (sub === "color") {
      const hex = interaction.options.getString("hex", true);
      await pool.query(`UPDATE guild_settings SET welcome_color = $1 WHERE guild_id = $2`, [hex, guildId]);
      await interaction.reply({ content: `✅ Farbe gesetzt: ${hex}`, ephemeral: true });
    }
    if (sub === "image") {
      const url = interaction.options.getString("url", true);
      await pool.query(`UPDATE guild_settings SET welcome_image = $1 WHERE guild_id = $2`, [url, guildId]);
      await interaction.reply({ content: `✅ Bild-URL gesetzt.`, ephemeral: true });
    }
    if (sub === "test") {
      const s = await getGuildSettings(guildId);
      const channel = interaction.guild?.channels.cache.get(s.welcome_channel) as TextChannel | undefined;
      await sendWelcomeMessage(interaction.guild!, interaction.user as any, s);
      await interaction.reply({ content: `✅ Test-Willkommensnachricht gesendet${channel ? ` in ${channel.toString()}` : ""}.`, ephemeral: true });
    }
  }

  if (group === "verify") {
    if (sub === "enable") {
      await pool.query(`UPDATE guild_settings SET verify_enabled = TRUE WHERE guild_id = $1`, [guildId]);
      await interaction.reply({ content: "✅ Verifizierung aktiviert.", ephemeral: true });
    }
    if (sub === "disable") {
      await pool.query(`UPDATE guild_settings SET verify_enabled = FALSE WHERE guild_id = $1`, [guildId]);
      await interaction.reply({ content: "❌ Verifizierung deaktiviert.", ephemeral: true });
    }
    if (sub === "role") {
      const role = interaction.options.getRole("rolle", true);
      await pool.query(`UPDATE guild_settings SET verify_role = $1 WHERE guild_id = $2`, [role.id, guildId]);
      await interaction.reply({ content: `✅ Verifizierungsrolle gesetzt: ${role.toString()}`, ephemeral: true });
    }
    if (sub === "post") {
      const channel = interaction.channel as TextChannel;
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ Verifizierung")
        .setDescription("Nutze `/verify`, um dich zu verifizieren und Zugang zum Server zu erhalten.");
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: "✅ Verify-Nachricht gepostet.", ephemeral: true });
    }
  }

  if (group === "raid") {
    if (sub === "enable") {
      await pool.query(`UPDATE guild_settings SET raid_enabled = TRUE WHERE guild_id = $1`, [guildId]);
      await interaction.reply({ content: "✅ Raid-Schutz aktiviert.", ephemeral: true });
    }
    if (sub === "disable") {
      await pool.query(`UPDATE guild_settings SET raid_enabled = FALSE WHERE guild_id = $1`, [guildId]);
      await interaction.reply({ content: "❌ Raid-Schutz deaktiviert.", ephemeral: true });
    }
    if (sub === "threshold") {
      const anzahl = interaction.options.getInteger("anzahl", true);
      await pool.query(`UPDATE guild_settings SET raid_threshold = $1 WHERE guild_id = $2`, [anzahl, guildId]);
      await interaction.reply({ content: `✅ Raid-Schwellenwert gesetzt: ${anzahl} Joins`, ephemeral: true });
    }
    if (sub === "window") {
      const sek = interaction.options.getInteger("sekunden", true);
      await pool.query(`UPDATE guild_settings SET raid_window = $1 WHERE guild_id = $2`, [sek, guildId]);
      await interaction.reply({ content: `✅ Zeitfenster gesetzt: ${sek} Sekunden`, ephemeral: true });
    }
    if (sub === "action") {
      const aktion = interaction.options.getString("aktion", true);
      await pool.query(`UPDATE guild_settings SET raid_action = $1 WHERE guild_id = $2`, [aktion, guildId]);
      await interaction.reply({ content: `✅ Raid-Aktion gesetzt: ${aktion}`, ephemeral: true });
    }
  }
}

export async function sendWelcomeMessage(guild: any, member: any, settings: any) {
  if (!settings.welcome_enabled || !settings.welcome_channel) return;
  const channel = guild.channels.cache.get(settings.welcome_channel) as TextChannel | undefined;
  if (!channel) return;

  const text = (settings.welcome_message as string)
    .replace("{user}", member.toString())
    .replace("{server}", guild.name)
    .replace("{count}", guild.memberCount?.toString() ?? "?");

  const colorHex = settings.welcome_color?.replace("#", "") ?? "5865F2";
  const color = parseInt(colorHex, 16);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("👋 Willkommen!")
    .setDescription(text)
    .setThumbnail(member.displayAvatarURL?.() ?? member.user?.displayAvatarURL?.());

  if (settings.welcome_image) embed.setImage(settings.welcome_image);

  await channel.send({ embeds: [embed] });
}
