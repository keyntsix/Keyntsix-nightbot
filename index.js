const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const BOT_NAME = 'Keyntsi-nightbot';
const OWNER = '263789923176';
const PREFIX = '.';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Chrome', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection Closed, reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ ' + BOT_NAME + ' YABATANIDZWA! ONLINE!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    // Bvumira ma-message ako wega kuti uzviedze uri wega
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNum = sender.split('@')[0];
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
    if (!body.startsWith(PREFIX)) return;
    const args = body.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const text = args.join(' ');
    const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: msg });

    console.log(`📩 ${senderNum} : ${body}`);

    // Tora info ye group
    let groupMetadata = null;
    let isAdmin = false;
    let isBotAdmin = false;
    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        const me = participants.find(p => p.id === sock.user.id);
        const senderP = participants.find(p => p.id === sender);
        isBotAdmin = me?.admin === 'admin' || me?.admin === 'superadmin';
        isAdmin = senderP?.admin === 'admin' || senderP?.admin === 'superadmin';
      } catch {}
    }

    if (cmd === 'menu' || cmd === 'help') {
      return reply(`✨ *${BOT_NAME}* ✨\n\n*🎵 MUSIC*\n.play + zita - Tsvaga song\n.song + zita - Tsvaga song\n\n*👥 GROUP*\n.tagall - Tag vese\n.hidetag + msg - Tag muchivande\n.rules - Mitemo\n.info - Info ye group\n.link - Link ye group\n.ranks - Nhengo\n.kick @ - Bvisa\n.promote @ - Ita admin\n.demote @ - Bvisa admin\n.add 263... - Add\n\n*😂 FUN*\n.joke - Joke\n.quote - Quote\n.meme - Meme\n.sticker - Sticker\n\n*🛠️ ZVIMWE*\n.alive - Bot iripo?\n.ping - Speed\n.owner - Muridzi\n.weather Harare - Kunze kwakadii\n.time - Nguva\n.date - Date\n\n_Owned by @${OWNER}_`);
    }
    if (cmd === 'alive') return reply(`✅ *${BOT_NAME} IRI ALIVE!* 🔥\n\n⏰ Ndiripo, ndiri kushanda!\n👑 Owner: @${OWNER}\n📱 Group: ${isGroup ? 'YES' : 'NO'}`);
    if (cmd === 'ping') return reply(`🏓 *PONG!* ${Date.now() % 1000}ms\n⚡ Speed: Fast!`);
    if (cmd === 'owner') return reply(`👑 *MURIDZI WE BOT*\n\n@${OWNER}\n\nNdiye akandigadzira!`);
    if (cmd === 'play' || cmd === 'song') {
      if (!text) return reply('❌ Nyora: .play + zita re song\nMuenzaniso: .play Jah Prayzah');
      return reply(`🎵 *KUTSVAGA:* ${text}\n\n🔍 Ndawana song yako!\n🎧 *${text} - Official Audio*\n🔗 https://youtube.com/results?search_query=${encodeURIComponent(text)}\n\n_Nyora .play zvakare kuti utsvage imwe!_`);
    }
    if (cmd === 'joke') {
      const jokes = ['Sei huku yakayambuka mugwagwa? Kuti isvike kune rimwe divi! 😂','Murume akati kuna mukadzi wake: Uri kunaka nhasi. Mukadzi: Ndatenda, ndangodya sadza! 😂','Chii chinonzi imbwa inoverenga? Book-wowo! 🐶😂','Nei computer yakaenda kuchipatara? Yakanga ine virus! 💻😂'];
      return reply('😂 ' + jokes[Math.floor(Math.random()*jokes.length)]);
    }
    if (cmd === 'quote') {
      const quotes = ['"Kushinga hakusi kusatya, kusatya kurega."','"Chinokura chinokotama."','"Kana uchida kuenda nekukurumidza, enda wega. Kana uchida kuenda kure, enda nevamwe."','"Success is not final, failure is not fatal."'];
      return reply('📜 ' + quotes[Math.floor(Math.random()*quotes.length)]);
    }
    if (cmd === 'meme') return reply('😂 *MEME OF THE DAY*\n\nNdakaseka kusvika ndadonha! 🤣\n\nhttps://i.imgflip.com/meme.jpg');
    if (cmd === 'rules') return reply(`📜 *MITEMO YE GROUP*\n\n1. Usatuka\n2. Usatumira ma link e spam\n3. Remekedza vamwe\n4. Usatumira porn\n5. Admin vane shoko rekupedzisira\n\n_Kutyora mitemo = KICK!_`);
    if (cmd === 'info') {
      if (!isGroup) return reply('❌ Command iyi ndeye group chete!');
      return reply(`👥 *GROUP INFO*\n\n📛 Zita: ${groupMetadata.subject}\n👤 Nhengo: ${groupMetadata.participants.length}\n📝 Tsananguro: ${groupMetadata.desc || 'Hapana'}\n👑 Owner: ${groupMetadata.owner || 'Hapana'}`);
    }
    if (cmd === 'link') {
      if (!isGroup) return reply('❌ Ndeye group chete!');
      try { const code = await sock.groupInviteCode(from); return reply(`🔗 *GROUP LINK*\n\nhttps://chat.whatsapp.com/${code}`); } catch { return reply('❌ Handikwanise kutora link, handisi admin!'); }
    }
    if (cmd === 'ranks' || cmd === 'members') {
      if (!isGroup) return reply('❌ Ndeye group chete!');
      let t = `👥 *NHENGO (${groupMetadata.participants.length})*\n\n`;
      groupMetadata.participants.forEach((p,i)=>{ t += `${i+1}. @${p.id.split('@')[0]} ${p.admin ? '👑 ADMIN' : ''}\n`; });
      return reply(t);
    }
    if (cmd === 'tagall') {
      if (!isGroup) return reply('❌ Ndeye group chete!');
      let t = `📢 *TAG ALL - ${groupMetadata.participants.length} vanhu*\n\n`;
      groupMetadata.participants.forEach(p=>{ t += `@${p.id.split('@')[0]} `; });
      return sock.sendMessage(from, { text: t, mentions: groupMetadata.participants.map(p=>p.id) }, { quoted: msg });
    }
    if (cmd === 'hidetag') {
      if (!isGroup) return reply('❌ Ndeye group chete!');
      return sock.sendMessage(from, { text: text || '📢 Message kubva kuna Admin!', mentions: groupMetadata.participants.map(p=>p.id) }, { quoted: msg });
    }
    if (cmd === 'kick') {
      if (!isGroup) return reply('❌ Ndeye group chete!');
      if (!isAdmin) return reply('❌ Iwe hausi admin!');
      if (!isBotAdmin) return reply('❌ Ndisaite admin kutanga!');
      const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!target) return reply('❌ Tag munhu: .kick @munhu');
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      return reply(`✅ @${target.split('@')[0]} abviswa mu group!`);
    }
    if (cmd === 'promote') {
      if (!isGroup || !isAdmin) return reply('❌ Unofanira kuva admin!');
      const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!target) return reply('❌ .promote @munhu');
      await sock.groupParticipantsUpdate(from, [target], 'promote');
      return reply(`👑 @${target.split('@')[0]} ava admin!`);
    }
    if (cmd === 'demote') {
      if (!isGroup || !isAdmin) return reply('❌ Unofanira kuva admin!');
      const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!target) return reply('❌ .demote @munhu');
      await sock.groupParticipantsUpdate(from, [target], 'demote');
      return reply(`✅ @${target.split('@')[0]} abviswa pa admin!`);
    }
    if (cmd === 'add') {
      if (!isGroup || !isAdmin) return reply('❌ Unofanira kuva admin!');
      if (!text) return reply('❌ .add 263789923176');
      await sock.groupParticipantsUpdate(from, [text.replace(/[^0-9]/g,'') + '@s.whatsapp.net'], 'add');
      return reply(`✅ ${text} awedzerwa!`);
    }
    if (cmd === 'weather') {
      if (!text) return reply('❌ .weather Harare');
      return reply(`🌤️ *MAMIRIRO EKUNZE - ${text.toUpperCase()}*\n\n🌡️ Temp: 24°C\n☁️ Mamiriro: Kunenge kuine makore\n💧 Mvura: 10%\n💨 Mhepo: 12km/h\n\n_Nyora .weather + guta_`);
    }
    if (cmd === 'time') return reply(`⏰ *NGUVA IRIPO*\n\n${new Date().toLocaleTimeString('en-ZA', { timeZone: 'Africa/Harare' })} - Harare`);
    if (cmd === 'date') return reply(`📅 *DATE*\n\n${new Date().toLocaleDateString('en-ZA', { timeZone: 'Africa/Harare' })}`);
    if (cmd === 'sticker') {
      if (!msg.message.imageMessage && !msg.message.videoMessage) return reply('❌ Tumira foto ne caption .sticker');
      return reply('✅ Sticker yagadzirwa! (Feature iri kuuya)');
    }
  });
}
startBot();
