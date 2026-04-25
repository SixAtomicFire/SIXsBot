const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

// ── Invia pannello verifica ────────────────────────────────────────────────────
async function sendVerifyPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('✅ Verify yourself')
    .setDescription(
      'Click the button below to confirm you have read and accepted the rules.\n\n' +
      'Once verified you will get full access to the server and can choose which plugins to follow.'
    )
    .setColor(0x57F287)
    .setFooter({ text: 'SIXsPlugins • Verification' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_accept')
      .setLabel('✅ I accept the rules')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ── Gestisce click sul pulsante ───────────────────────────────────────────────
async function handleVerifyButton(interaction) {
  const member = interaction.member;

  const verificatoRole = interaction.guild.roles.cache.find(r => r.name === '✅ Verified');
  const membroRole     = interaction.guild.roles.cache.find(r => r.name === '👤 Member');

  if (!verificatoRole) {
    return interaction.reply({ content: '❌ Role "✅ Verified" not found. Please contact an admin.', ephemeral: true });
  }

  if (member.roles.cache.has(verificatoRole.id)) {
    return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
  }

  await member.roles.add(verificatoRole).catch(() => null);
  if (membroRole) await member.roles.remove(membroRole).catch(() => null);

  await interaction.reply({
    content: '🎉 **Verified!** You now have full access to the server.\nHead to **#choose-notifications** to select which plugins you want to follow.',
    ephemeral: true,
  });
}

module.exports = { sendVerifyPanel, handleVerifyButton };
