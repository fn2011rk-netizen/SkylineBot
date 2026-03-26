import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { pool } from "../db.js";

export const moderationCommands = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banne ein Mitglied vom Server")
    .addUserOption((o) => o.setName("mitglied").setDescription("Zu bannendes Mitglied").setRequired(true))
    .addStringOption((o) => o.setName("grund").setDescription("Grund für den Ban"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kicke ein Mitglied vom Server")
    .addUserOption((o) => o.setName("mitglied").setDescription("Zu kickendes Mitglied").setRequired(true))
    .addStringOption((o) => o.setName("grund").setDescription("Grund für den Kick"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Lösche Nachrichten in diesem Kanal")
    .addIntegerOption((o) =>
      o.setName("anzahl").setDescription("Anzahl der Nachrichten (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Stummschalte ein Mitglied")
    .addUserOption((o) => o.setName("mitglied").setDescription("Zu stummschaltendes Mitglied").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("minuten").setDescription("Dauer in Minuten").setRequired(true).setMinValue(1).setMaxValue(40320)
    )
    .addStringOption((o) => o.setName("grund").setDescription("Grund"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Verwarnung ausstellen")
    .addUserOption((o) => o.setName("mitglied").setDescription("Mitglied verwarnen").setRequired(true))
    .addStringOption((o) => o.setName("grund").setDescription("Grund").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Verwarnungen eines Mitglieds anzeigen")
    .addUserOption((o) => o.setName("mitglied").setDescription("Mitglied").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
];

export async function handleModeration(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;

  if (interaction.commandName === "ban") {
    const target = interaction.options.getMember("mitglied");
    const reason = interaction.options.getString("grund") ?? "Kein Grund angegeben";
    if (!target || !("ban" in target)) {
      await interaction.reply({ content: "Mitglied nicht gefunden.", ephemeral: true });
      return;
    }
    await (target as any).ban({ reason });
    const embed = new EmbedBuilder().setColor(0xed4245).setTitle("🔨 Mitglied gebannt")
      .setDescription(`**${(target as any).user?.tag}** wurde gebannt.\n**Grund:** ${reason}`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "kick") {
    const target = interaction.options.getMember("mitglied");
    const reason = interaction.options.getString("grund") ?? "Kein Grund angegeben";
    if (!target || !("kick" in target)) {
      await interaction.reply({ content: "Mitglied nicht gefunden.", ephemeral: true });
      return;
    }
    await (target as any).kick(reason);
    const embed = new EmbedBuilder().setColor(0xfee75c).setTitle("👢 Mitglied gekickt")
      .setDescription(`**${(target as any).user?.tag}** wurde gekickt.\n**Grund:** ${reason}`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "clear") {
    const amount = interaction.options.getInteger("anzahl", true);
    const channel = interaction.channel;
    if (!channel || !("bulkDelete" in channel)) {
      await interaction.reply({ content: "Kann hier keine Nachrichten löschen.", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await (channel as any).bulkDelete(amount, true);
    await interaction.editReply(`🗑️ **${amount}** Nachrichten wurden gelöscht.`);
  }

  if (interaction.commandName === "timeout") {
    const target = interaction.options.getMember("mitglied") as any;
    const minutes = interaction.options.getInteger("minuten", true);
    const reason = interaction.options.getString("grund") ?? "Kein Grund angegeben";
    if (!target) {
      await interaction.reply({ content: "Mitglied nicht gefunden.", ephemeral: true });
      return;
    }
    await target.timeout(minutes * 60 * 1000, reason);
    const embed = new EmbedBuilder().setColor(0xfee75c).setTitle("🔇 Mitglied stummgeschaltet")
      .setDescription(`**${target.user?.tag}** wurde für **${minutes} Minuten** stummgeschaltet.\n**Grund:** ${reason}`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "warn") {
    const target = interaction.options.getUser("mitglied", true);
    const reason = interaction.options.getString("grund", true);
    await pool.query(
      `INSERT INTO warnings (user_id, guild_id, moderator_id, reason) VALUES ($1, $2, $3, $4)`,
      [target.id, guildId, interaction.user.id, reason]
    );
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM warnings WHERE user_id = $1 AND guild_id = $2`,
      [target.id, guildId]
    );
    const embed = new EmbedBuilder().setColor(0xfee75c).setTitle("⚠️ Verwarnung ausgestellt")
      .setDescription(`${target.toString()} wurde verwarnt.\n**Grund:** ${reason}\n**Verwarnungen gesamt:** ${countRes.rows[0].count}`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "warnings") {
    const target = interaction.options.getUser("mitglied", true);
    const res = await pool.query(
      `SELECT * FROM warnings WHERE user_id = $1 AND guild_id = $2 ORDER BY created_at DESC`,
      [target.id, guildId]
    );
    if (res.rows.length === 0) {
      await interaction.reply({ content: `${target.toString()} hat keine Verwarnungen.`, ephemeral: true });
      return;
    }
    const list = res.rows.map((w: any, i: number) =>
      `**#${i + 1}** | <@${w.moderator_id}> — ${w.reason}`
    ).join("\n");
    const embed = new EmbedBuilder().setColor(0xfee75c).setTitle(`⚠️ Verwarnungen von ${target.username}`)
      .setDescription(list);
    await interaction.reply({ embeds: [embed] });
  }
}
