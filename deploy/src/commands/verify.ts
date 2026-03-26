import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getGuildSettings } from "../db.js";

export const verifyCommands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verifiziere dich auf dem Server"),
];

export async function handleVerify(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const settings = await getGuildSettings(guildId);

  if (!settings.verify_enabled) {
    await interaction.reply({ content: "Die Verifizierung ist auf diesem Server nicht aktiviert.", ephemeral: true });
    return;
  }

  if (!settings.verify_role) {
    await interaction.reply({ content: "Es wurde keine Verifizierungsrolle konfiguriert. Bitte wende dich an einen Admin.", ephemeral: true });
    return;
  }

  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member) return;

  if (member.roles.cache.has(settings.verify_role)) {
    await interaction.reply({ content: "Du bist bereits verifiziert!", ephemeral: true });
    return;
  }

  const role = interaction.guild?.roles.cache.get(settings.verify_role);
  if (!role) {
    await interaction.reply({ content: "Verifizierungsrolle nicht gefunden.", ephemeral: true });
    return;
  }

  await member.roles.add(role);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Verifiziert!")
    .setDescription(`${interaction.user.toString()} du bist nun verifiziert und hast Zugang zum Server erhalten.`);

  await interaction.reply({ embeds: [embed] });
}
