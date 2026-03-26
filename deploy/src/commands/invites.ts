import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { pool } from "../db.js";

export const inviteCommands = [
  new SlashCommandBuilder()
    .setName("invites")
    .setDescription("Einladungsanzahl anzeigen")
    .addUserOption((o) => o.setName("mitglied").setDescription("Mitglied (leer = du selbst)")),

  new SlashCommandBuilder()
    .setName("inviteleaderboard")
    .setDescription("Top 10 Einlader anzeigen"),
];

export async function handleInvites(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;

  if (interaction.commandName === "invites") {
    const target = interaction.options.getUser("mitglied") ?? interaction.user;
    const res = await pool.query(
      `SELECT invite_count FROM invites WHERE inviter_id = $1 AND guild_id = $2`,
      [target.id, guildId]
    );
    const count = res.rows[0]?.invite_count ?? 0;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📨 Einladungen")
      .setDescription(`${target.toString()} hat **${count}** Mitglieder eingeladen.`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "inviteleaderboard") {
    const res = await pool.query(
      `SELECT inviter_id, invite_count FROM invites WHERE guild_id = $1 ORDER BY invite_count DESC LIMIT 10`,
      [guildId]
    );
    if (res.rows.length === 0) {
      await interaction.reply({ content: "Noch keine Einladungsdaten vorhanden.", ephemeral: true });
      return;
    }
    const list = res.rows.map((r: any, i: number) =>
      `**#${i + 1}** <@${r.inviter_id}> — ${r.invite_count} Einladungen`
    ).join("\n");
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏆 Einladungs-Leaderboard")
      .setDescription(list);
    await interaction.reply({ embeds: [embed] });
  }
}
