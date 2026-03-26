import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Client,
} from "discord.js";

export const utilityCommands = [
  new SlashCommandBuilder().setName("ping").setDescription("Bot-Latenz anzeigen"),
  new SlashCommandBuilder().setName("hello").setDescription("Begrüßungsnachricht vom Bot"),
  new SlashCommandBuilder().setName("help").setDescription("Alle Befehle anzeigen"),
  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Würfle einen Würfel")
    .addIntegerOption((o) =>
      o.setName("seiten").setDescription("Anzahl der Seiten (Standard: 6)").setMinValue(2)
    ),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Serverinfos anzeigen"),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Infos über ein Mitglied")
    .addUserOption((o) => o.setName("mitglied").setDescription("Mitglied (leer = du selbst)")),
];

export async function handleUtility(interaction: ChatInputCommandInteraction, client: Client) {
  if (interaction.commandName === "ping") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏓 Pong!")
      .addFields({ name: "Latenz", value: `${client.ws.ping}ms` });
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "hello") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("👋 Hallo!")
      .setDescription(`Hey ${interaction.user.toString()}! Ich bin **Skyline Bot**. Nutze \`/help\` für alle Befehle.`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 Alle Befehle")
      .addFields(
        { name: "💰 Economy", value: "`/balance` `/daily` `/pay`", inline: true },
        { name: "⭐ XP & Rang", value: "`/rank` `/leaderboard`", inline: true },
        { name: "📨 Einladungen", value: "`/invites` `/inviteleaderboard`", inline: true },
        { name: "🛡️ Moderation", value: "`/ban` `/kick` `/clear` `/timeout` `/warn` `/warnings`", inline: true },
        { name: "🎭 Rollen", value: "`/role` `/roles` `/panel create` `/panel add-role`", inline: true },
        { name: "✅ Verifizierung", value: "`/verify`", inline: true },
        { name: "🔧 Setup", value: "`/setup welcome` `/setup verify` `/setup raid`", inline: true },
        { name: "🛠️ Sonstiges", value: "`/ping` `/hello` `/help` `/serverinfo` `/userinfo` `/dice`", inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "dice") {
    const sides = interaction.options.getInteger("seiten") ?? 6;
    const result = Math.floor(Math.random() * sides) + 1;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎲 Würfelergebnis")
      .setDescription(`Du hast eine **${result}** gewürfelt! (1-${sides})`);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "serverinfo") {
    const guild = interaction.guild!;
    await guild.fetch();
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: "👥 Mitglieder", value: `${guild.memberCount}`, inline: true },
        { name: "📅 Erstellt", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "👑 Besitzer", value: `<@${guild.ownerId}>`, inline: true },
        { name: "💬 Kanäle", value: `${guild.channels.cache.size}`, inline: true },
        { name: "🎭 Rollen", value: `${guild.roles.cache.size}`, inline: true },
        { name: "😀 Emojis", value: `${guild.emojis.cache.size}`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "userinfo") {
    const target = interaction.options.getUser("mitglied") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`👤 ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "🆔 ID", value: target.id, inline: true },
        { name: "📅 Account erstellt", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "📥 Beigetreten", value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Unbekannt", inline: true },
        { name: "🤖 Bot", value: target.bot ? "Ja" : "Nein", inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
}
