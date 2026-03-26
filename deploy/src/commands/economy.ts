import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { pool, getOrCreateEconomy } from "../db.js";

const DAILY_AMOUNT = 200;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

export const economyCommands = [
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Zeige dein Guthaben an"),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Hol dir täglich 200 Coins ab"),

  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Überweise Coins an ein Mitglied")
    .addUserOption((o) => o.setName("mitglied").setDescription("Empfänger").setRequired(true))
    .addIntegerOption((o) =>
      o.setName("betrag").setDescription("Anzahl der Coins").setRequired(true).setMinValue(1)
    ),
];

export async function handleEconomy(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  if (interaction.commandName === "balance") {
    const eco = await getOrCreateEconomy(userId, guildId);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("💰 Kontostand")
      .setDescription(`${interaction.user.toString()} hat **${eco.balance} Coins**`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "daily") {
    const eco = await getOrCreateEconomy(userId, guildId);
    const now = Date.now();
    const last = Number(eco.last_daily);
    const remaining = DAILY_COOLDOWN - (now - last);

    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      await interaction.reply({
        content: `⏳ Du kannst erst in **${hours}h ${minutes}m** wieder Daily abholen.`,
        ephemeral: true,
      });
      return;
    }

    await pool.query(
      `UPDATE economy SET balance = balance + $1, last_daily = $2 WHERE user_id = $3 AND guild_id = $4`,
      [DAILY_AMOUNT, now, userId, guildId]
    );

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Daily abgeholt!")
      .setDescription(`Du hast **${DAILY_AMOUNT} Coins** erhalten!\nNeuer Kontostand: **${eco.balance + DAILY_AMOUNT} Coins**`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "pay") {
    const target = interaction.options.getUser("mitglied", true);
    const amount = interaction.options.getInteger("betrag", true);

    if (target.id === userId) {
      await interaction.reply({ content: "Du kannst dir selbst keine Coins überweisen.", ephemeral: true });
      return;
    }

    const senderEco = await getOrCreateEconomy(userId, guildId);
    if (senderEco.balance < amount) {
      await interaction.reply({ content: `Du hast nicht genug Coins. Dein Kontostand: **${senderEco.balance}**`, ephemeral: true });
      return;
    }

    await pool.query(
      `UPDATE economy SET balance = balance - $1 WHERE user_id = $2 AND guild_id = $3`,
      [amount, userId, guildId]
    );
    await getOrCreateEconomy(target.id, guildId);
    await pool.query(
      `UPDATE economy SET balance = balance + $1 WHERE user_id = $2 AND guild_id = $3`,
      [amount, target.id, guildId]
    );

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("💸 Überweisung erfolgreich")
      .setDescription(`${interaction.user.toString()} hat **${amount} Coins** an ${target.toString()} überwiesen.`);
    await interaction.reply({ embeds: [embed] });
  }
}
