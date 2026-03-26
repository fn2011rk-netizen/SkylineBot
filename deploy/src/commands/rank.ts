import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { pool, getOrCreateXp } from "../db.js";

export const rankCommands = [
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Rang & XP anzeigen")
    .addUserOption((o) => o.setName("mitglied").setDescription("Mitglied (leer = du selbst)")),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top 10 nach XP anzeigen"),
];

export function xpForLevel(level: number): number {
  return 100 * (level + 1) * (level + 1);
}

export async function addXp(userId: string, guildId: string, amount: number) {
  await getOrCreateXp(userId, guildId);
  const res = await pool.query(
    `UPDATE xp SET xp = xp + $1 WHERE user_id = $2 AND guild_id = $3 RETURNING xp, level`,
    [amount, userId, guildId]
  );
  const { xp, level } = res.rows[0];
  const needed = xpForLevel(level);
  if (xp >= needed) {
    await pool.query(
      `UPDATE xp SET level = level + 1, xp = xp - $1 WHERE user_id = $2 AND guild_id = $3`,
      [needed, userId, guildId]
    );
    return { leveledUp: true, newLevel: level + 1 };
  }
  return { leveledUp: false, newLevel: level };
}

export async function handleRank(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;

  if (interaction.commandName === "rank") {
    const target = interaction.options.getUser("mitglied") ?? interaction.user;
    const data = await getOrCreateXp(target.id, guildId);
    const needed = xpForLevel(data.level);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`⭐ Rang von ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Level", value: `**${data.level}**`, inline: true },
        { name: "XP", value: `**${data.xp} / ${needed}**`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "leaderboard") {
    const res = await pool.query(
      `SELECT user_id, xp, level FROM xp WHERE guild_id = $1 ORDER BY level DESC, xp DESC LIMIT 10`,
      [guildId]
    );
    if (res.rows.length === 0) {
      await interaction.reply({ content: "Noch keine XP-Daten vorhanden.", ephemeral: true });
      return;
    }
    const list = res.rows.map((r: any, i: number) =>
      `**#${i + 1}** <@${r.user_id}> — Level ${r.level} | ${r.xp} XP`
    ).join("\n");
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏆 XP Leaderboard")
      .setDescription(list);
    await interaction.reply({ embeds: [embed] });
  }
}
