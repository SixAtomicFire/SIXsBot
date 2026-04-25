const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const config = require('../config');

// ── Invia pannello selezione notifiche ────────────────────────────────────────
async function sendNotifPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🔔 Choose your plugin notifications')
    .setDescription(
      'Select which plugins you want to receive update notifications for.\n' +
      'Your selection unlocks the notification role — you\'ll be tagged when a new version drops.\n\n' +
      '**All plugin channels are visible to everyone** — the role only affects who gets pinged.'
    )
    .addFields(
      config.plugins.map(p => ({
        name: `${p.emoji} ${p.id}`,
        value: 'Get pinged on new releases',
        inline: true,
      }))
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'You can change your selection anytime' });

  const options = config.plugins.map(p =>
    new StringSelectMenuOptionBuilder()
      .setLabel(p.id)
      .setValue(p.id)
      .setEmoji(p.emoji)
      .setDescription(`Notifications for ${p.id} updates`)
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('select_notifications')
    .setPlaceholder('Select one or more plugins...')
    .setMinValues(0)
    .setMaxValues(config.plugins.length)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);
  await channel.send({ embeds: [embed], components: [row] });
}

// ── Gestisce selezione ────────────────────────────────────────────────────────
async function handleNotifSelect(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const member  = interaction.member;
  const chosen  = interaction.values;
  const added   = [];
  const removed = [];
  const errors  = [];

  for (const plugin of config.plugins) {
    const role = interaction.guild.roles.cache.find(r => r.name === plugin.roleName);
    if (!role) { errors.push(`Role ${plugin.roleName} not found`); continue; }

    const has  = member.roles.cache.has(role.id);
    const want = chosen.includes(plugin.id);

    if (want && !has) {
      try { await member.roles.add(role); added.push(plugin.id); }
      catch (e) { errors.push(`Add ${plugin.id}: ${e.message}`); }
    } else if (!want && has) {
      try { await member.roles.remove(role); removed.push(plugin.id); }
      catch (e) { errors.push(`Remove ${plugin.id}: ${e.message}`); }
    }
  }

  const lines = [];
  if (added.length)   lines.push(`✅ Now following: **${added.join(', ')}**`);
  if (removed.length) lines.push(`🔕 Unfollowed: **${removed.join(', ')}**`);
  if (errors.length)  lines.push(`⚠️ Errors: ${errors.join(', ')}`);
  if (!lines.length)  lines.push('ℹ️ No changes made.');

  const current = config.plugins
    .filter(p => {
      const role = interaction.guild.roles.cache.find(r => r.name === p.roleName);
      return role && member.roles.cache.has(role.id);
    })
    .map(p => p.id);

  lines.push(current.length
    ? `\n📬 Currently following: **${current.join(', ')}**`
    : '\n📭 Not following any plugin notifications.'
  );

  await interaction.editReply({ content: lines.join('\n') });
}

module.exports = { sendNotifPanel, handleNotifSelect };
