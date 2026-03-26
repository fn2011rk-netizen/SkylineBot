import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { pool, getGuildSettings } from "../db.js";

export const roleCommands = [
  new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Wählbare Rollen anzeigen"),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Rolle holen oder entfernen")
    .addStringOption((o) => o.setName("rolle").setDescription("Rollenname").setRequired(true)),

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Rollen-Panel verwalten")
    .addSubcommand((sub) =>
      sub.setName("create").setDescription("Neues Panel erstellen")
        .addStringOption((o) => o.setName("titel").setDescription("Panel-Titel").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("add-role").setDescription("Rolle zum letzten Panel hinzufügen")
        .addRoleOption((o) => o.setName("rolle").setDescription("Hinzuzufügende Rolle").setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
];

export async function handleRoles(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const settings = await getGuildSettings(guildId);

  if (interaction.commandName === "roles") {
    const roles = settings.selectable_roles as string[];
    if (!roles || roles.length === 0) {
      await interaction.reply({ content: "Es wurden keine wählbaren Rollen konfiguriert.", ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎭 Wählbare Rollen")
      .setDescription(roles.map((r: string) => `• ${r}`).join("\n"));
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "role") {
    const roleName = interaction.options.getString("rolle", true);
    const roles = settings.selectable_roles as string[];

    if (!roles || !roles.includes(roleName)) {
      await interaction.reply({
        content: `Diese Rolle ist nicht wählbar. Verfügbare Rollen: ${roles?.join(", ") || "keine"}`,
        ephemeral: true,
      });
      return;
    }

    const role = interaction.guild?.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      await interaction.reply({ content: `Rolle "${roleName}" nicht auf dem Server gefunden.`, ephemeral: true });
      return;
    }

    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (!member) return;

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      await interaction.reply({ content: `✅ Rolle **${roleName}** wurde entfernt.`, ephemeral: true });
    } else {
      await member.roles.add(role);
      await interaction.reply({ content: `✅ Rolle **${roleName}** wurde hinzugefügt.`, ephemeral: true });
    }
  }

  if (interaction.commandName === "panel") {
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const titel = interaction.options.getString("titel", true);
      const channel = interaction.channel as TextChannel;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🎭 ${titel}`)
        .setDescription("Nutze `/panel add-role`, um Rollen hinzuzufügen.");

      const msg = await channel.send({ embeds: [embed] });

      await pool.query(
        `INSERT INTO role_panels (guild_id, channel_id, message_id, title) VALUES ($1, $2, $3, $4)`,
        [guildId, channel.id, msg.id, titel]
      );

      await interaction.reply({ content: "✅ Panel wurde erstellt!", ephemeral: true });
    }

    if (sub === "add-role") {
      const role = interaction.options.getRole("rolle", true);

      const panelRes = await pool.query(
        `SELECT * FROM role_panels WHERE guild_id = $1 ORDER BY id DESC LIMIT 1`,
        [guildId]
      );

      if (panelRes.rows.length === 0) {
        await interaction.reply({ content: "Kein Panel gefunden. Erstelle zuerst eines mit `/panel create`.", ephemeral: true });
        return;
      }

      const panel = panelRes.rows[0];
      const updatedRoles = [...(panel.roles || []), role.id];

      await pool.query(
        `UPDATE role_panels SET roles = $1 WHERE id = $2`,
        [updatedRoles, panel.id]
      );

      const channel = interaction.guild?.channels.cache.get(panel.channel_id) as TextChannel;
      const msg = await channel?.messages.fetch(panel.message_id);

      if (msg) {
        const select = new StringSelectMenuBuilder()
          .setCustomId(`panel_${panel.id}`)
          .setPlaceholder("Wähle eine Rolle")
          .addOptions(
            updatedRoles.map((rid: string) => {
              const r = interaction.guild?.roles.cache.get(rid);
              return { label: r?.name ?? rid, value: rid };
            })
          );
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎭 ${panel.title}`)
          .setDescription("Wähle eine Rolle aus dem Menü unten.");
        await msg.edit({ embeds: [embed], components: [row] });
      }

      await interaction.reply({ content: `✅ Rolle **${role.name}** wurde zum Panel hinzugefügt.`, ephemeral: true });
    }
  }
}
