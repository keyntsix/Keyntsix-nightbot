const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const BOT_NAME = 'Keyntsix-nightbot';
const OWNER = '263789923176';
const PREFIX = '.';
const startTime = Date.now();
let settings = { antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: false };
try { if (fs.existsSync('settings.json')) settings = JSON.parse(fs.readFileSync('settings.json')); } catch {}
const saveSettings = () => fs.writeFileSync('settings.json', JSON.stringify(settings));
const badWords = ['fuck','shit','bitch','porn','sex','mbwa','hure','sick'];
const runtime = () => { let s = Math.floor((Date.now()-startTime)/1000); let h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60; return `${h}h ${m}m ${sec}s`; };

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, logger: pino({ level: 'silent' }), printQRInTerminal: false, auth: state, browser: ['Chrome','Chrome','1.0.0'], syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);
  if (!sock.authState.creds.registered) {
    setTimeout(async () => { try { const code = await sock.requestPairingCode('263789923176'); console.log('🔑 PAIRING CODE: ' + code); } catch(e){ console.log(e.message); } }, 3000);
  }
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') { const r = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut; console.log('Reconnecting...', r); if (r) startBot(); }
    else if (connection === 'open') console.log('✅ ' + BOT_NAME + ' ONLINE!');
  });

  // WELCOME / GOODBYE
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      for (let p of participants) {
        if (action === 'add' && settings.welcome[id]) await sock.sendMessage(id, { text: `👋 Welcome @${p.split('@')[0]} ku group! Nyora .menu kuti uone commands!`, mentions: [p] });
        if (action === 'remove' && settings.goodbye[id]) await sock.sendMessage(id, { text: `👋 Bye @${p.split('@')[0]}, tichaona!`, mentions: [p] });
      }
    } catch {}
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNum = sender.split('@')[0];
    const isOwner = senderNum === OWNER;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
    const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: msg });
    const replyImg = (url, cap) => sock.sendMessage(from, { image: { url }, caption: cap }, { quoted: msg });

    let groupMetadata = null, isAdmin = false, isBotAdmin = false;
    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from);
        const parts = groupMetadata.participants;
        const me = parts.find(p => p.id === sock.user.id);
        const sp = parts.find(p => p.id === sender);
        isBotAdmin = me?.admin === 'admin' || me?.admin === 'superadmin';
        isAdmin = sp?.admin === 'admin' || sp?.admin === 'superadmin';
      } catch {}
    }
    const isAdminOrOwner = isAdmin || isOwner;

    // === ANTI-LINK ===
    if (isGroup && settings.antilink[from] && !isAdminOrOwner) {
      if (body.includes('http') || body.includes('chat.whatsapp.com') || body.includes('www.') || body.includes('t.me') || body.includes('.com')) {
        try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
        return reply(`⚠️ @${senderNum} Link yabviswa! Anti-Link ON 🚫`);
      }
    }
    // === ANTI-BADWORD ===
    if (isGroup && settings.antibadword[from] && !isAdminOrOwner) {
      if (badWords.some(w => body.toLowerCase().includes(w))) {
        try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
        return reply(`⚠️ @${senderNum} Usatuka! Tuka rabviswa!`);
      }
    }
    // === CHATBOT ===
    if (settings.chatbot && !body.startsWith(PREFIX) && !isGroup) {
      try { const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(body)}`); const t = await r.text(); return reply(t.slice(0,1000)); } catch {}
    }

    if (!body.startsWith(PREFIX)) return;
    const args = body.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const text = args.join(' ');
    const q = text;
    console.log(`📩 ${senderNum} : ${body}`);

    // ===== MENU - SE EMMYHENZ =====
    if (cmd === 'menu' || cmd === 'help') {
      return reply(`╔════════◇◆◇═══════╗
├ *🔥 ${BOT_NAME} V2 🔥*
├▢👑 Owner: *Keyntsix*
├▢⏱️ Uptime: *${runtime()}*
├▢📶 Ping: *${Date.now()%1000}ms*
├▢🔖 Version: *v2.0.0*
├▢📚 Commands: *90+*
╚════════◇◆◇═══════╝

╔═══════════════╗
  👑 *OWNER*
╠───────────────╣
║ ➣ .mode .settings .antilink on/off
║ ➣ .antibadword on/off .welcome on/off
║ ➣ .goodbye on/off .chatbot on/off
║ ➣ .block .unblock .join
╚═══════════════╝
╔═══════════════╗
  💻 *BOT*
╠───────────────╣
║ ➣ .owner .ping .alive .runtime .menu
╚═══════════════╝
╔═══════════════╗
  👥 *GROUP*
╠───────────────╣
║ ➣ .add .kick .kickall .promote .demote
║ ➣ .mute .unmute .lock .unlock .revoke
║ ➣ .link .grouplink .setname .setdesc
║ ➣ .tagall .hidetag .tagadmins .info
║ ➣ .rules .warn .groupinfo
╚═══════════════╝
╔═══════════════╗
  🤖 *AI*
╠───────────────╣
║ ➣ .ai .gpt .imagine .toanime .ghibli
╚═══════════════╝
╔═══════════════╗
  📥 *DOWNLOADER*
╠───────────────╣
║ ➣ .play .song .ytmp3 .ytmp4 .video
║ ➣ .tiktok .instagram .facebook .spotify
╚═══════════════╝
╔═══════════════╗
  🎨 *CONVERTER*
╠───────────────╣
║ ➣ .sticker .toimg .meme .getpp
╚═══════════════╝
╔═══════════════╗
  🔤 *LOGO*
╠───────────────╣
║ ➣ .neon .fire .glow .hacker .gfx
║ ➣ .matrix .thunder .ice .purple
╚═══════════════╝
╔═══════════════╗
  🛠️ *TOOLS*
╠───────────────╣
║ ➣ .translate .tr .qrcode .calc .weather
║ ➣ .news .lyrics .ss .shorturl .define
╚═══════════════╝
╔═══════════════╗
  🎮 *GAMES*
╠───────────────╣
║ ➣ .trivia .slots .dice .coin .rps
║ ➣ .truth .dare .8ball .riddle .random
╚═══════════════╝
╔═══════════════╗
  🎯 *FUN*
╠───────────────╣
║ ➣ .joke .fact .quote .roast .ship
║ ➣ .compliment .flirt .insult .stupid
╚═══════════════╝
╔═══════════════╗
  🌸 *ANIME*
╠───────────────╣
║ ➣ .waifu .animepic .wallpaper .pokemon
╚═══════════════╝
_Owned by @${OWNER}_`);
    }

    // ===== BOT =====
    if (cmd === 'alive') return reply(`✅ *${BOT_NAME} V2 IRI ALIVE!* 🔥\n⏰ Uptime: ${runtime()}\n👑 Owner: @${OWNER}`);
    if (cmd === 'ping') return reply(`🏓 PONG! ${Date.now()%1000}ms\n⚡ Uptime: ${runtime()}`);
    if (cmd === 'runtime') return reply(`⏱️ Uptime: ${runtime()}`);
    if (cmd === 'owner') return reply(`👑 *MURIDZI*\n\n@${OWNER}\nNdiye akandigadzira!`);
    if (cmd === 'repo') return reply(`💻 *KEYNTSIX-V2*\nGithub: github.com/keyntsix\nVersion: v2.0.0`);
    if (cmd === 'settings') return reply(`⚙️ *SETTINGS*\nAntiLink: ${settings.antilink[from]?'ON':'OFF'}\nAntiBadword: ${settings.antibadword[from]?'ON':'OFF'}\nWelcome: ${settings.welcome[from]?'ON':'OFF'}\nChatbot: ${settings.chatbot?'ON':'OFF'}`);
    if (cmd === 'mode') { if(!isOwner) return reply('❌ Owner chete!'); return reply('✅ Mode: Public - Bot iri kushanda kumunhu wese!'); }

    // ===== OWNER / SETTINGS =====
    if (cmd === 'antilink') { if(!isAdminOrOwner) return reply('❌ Admin chete!'); if(text==='on'){ settings.antilink[from]=true; saveSettings(); return reply('✅ Anti-Link ON!'); } if(text==='off'){ delete settings.antilink[from]; saveSettings(); return reply('❌ Anti-Link OFF!'); } return reply('Nyora: .antilink on / off'); }
    if (cmd === 'antibadword') { if(!isAdminOrOwner) return reply('❌ Admin chete!'); if(text==='on'){ settings.antibadword[from]=true; saveSettings(); return reply('✅ Anti-Badword ON!'); } if(text==='off'){ delete settings.antibadword[from]; saveSettings(); return reply('❌ Anti-Badword OFF!'); } return reply('Nyora: .antibadword on / off'); }
    if (cmd === 'welcome') { if(!isAdminOrOwner) return reply('❌ Admin chete!'); if(text==='on'){ settings.welcome[from]=true; saveSettings(); return reply('✅ Welcome ON!'); } if(text==='off'){ delete settings.welcome[from]; saveSettings(); return reply('❌ Welcome OFF!'); } return reply('.welcome on/off'); }
    if (cmd === 'goodbye') { if(!isAdminOrOwner) return reply('❌ Admin chete!'); if(text==='on'){ settings.goodbye[from]=true; saveSettings(); return reply('✅ Goodbye ON!'); } if(text==='off'){ delete settings.goodbye[from]; saveSettings(); return reply('❌ Goodbye OFF!'); } return reply('.goodbye on/off'); }
    if (cmd === 'chatbot') { if(!isOwner) return reply('❌ Owner chete!'); settings.chatbot = text==='on'; saveSettings(); return reply(`Chatbot ${settings.chatbot?'ON':'OFF'}`); }
    if (cmd === 'block') { if(!isOwner) return reply('❌ Owner!'); const t = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!t) return reply('.block @munhu'); await sock.updateBlockStatus(t,'block'); return reply('✅ Blocked!'); }
    if (cmd === 'unblock') { if(!isOwner) return reply('❌ Owner!'); const t = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!t) return reply('.unblock @munhu'); await sock.updateBlockStatus(t,'unblock'); return reply('✅ Unblocked!'); }
    if (cmd === 'join') { if(!isOwner) return reply('❌ Owner!'); if(!text) return reply('.join + link'); try{ const code = text.split('/').pop(); await sock.groupAcceptInvite(code); return reply('✅ Ndapinda mu group!'); }catch{ return reply('❌ Link isiri kushanda!'); } }

    // ===== GROUP =====
    if (cmd === 'info' || cmd === 'groupinfo') { if(!isGroup) return reply('❌ Group chete!'); return reply(`👥 *GROUP INFO*\n📛 ${groupMetadata.subject}\n👤 Nhengo: ${groupMetadata.participants.length}\n📝 ${groupMetadata.desc||'Hapana'}`); }
    if (cmd === 'link' || cmd === 'grouplink') { if(!isGroup) return reply('❌ Group chete!'); try{ const c = await sock.groupInviteCode(from); return reply(`🔗 https://chat.whatsapp.com/${c}`); }catch{ return reply('❌ Handisi admin!'); } }
    if (cmd === 'revoke') { if(!isAdminOrOwner) return reply('❌ Admin!'); try{ await sock.groupRevokeInvite(from); return reply('✅ Link itsva yagadzirwa! Nyora .link'); }catch{ return reply('❌ Handisi admin!'); } }
    if (cmd === 'setname') { if(!isAdminOrOwner) return reply('❌ Admin!'); if(!text) return reply('.setname Zita'); await sock.groupUpdateSubject(from, text); return reply('✅ Zita rashandurwa: '+text); }
    if (cmd === 'setdesc') { if(!isAdminOrOwner) return reply('❌ Admin!'); await sock.groupUpdateDescription(from, text); return reply('✅ Desc yashandurwa!'); }
    if (cmd === 'mute') { if(!isAdminOrOwner) return reply('❌ Admin!'); await sock.groupSettingUpdate(from,'announcement'); return reply('🔒 Group ra MUTE! Admin chete vanotaura.'); }
    if (cmd === 'unmute') { if(!isAdminOrOwner) return reply('❌ Admin!'); await sock.groupSettingUpdate(from,'not_announcement'); return reply('🔓 Group ra UNMUTE!'); }
    if (cmd === 'lock') { if(!isAdminOrOwner) return reply('❌ Admin!'); await sock.groupSettingUpdate(from,'locked'); return reply('🔒 Group ra LOCK!'); }
    if (cmd === 'unlock') { if(!isAdminOrOwner) return reply('❌ Admin!'); await sock.groupSettingUpdate(from,'unlocked'); return reply('🔓 Group ra UNLOCK!'); }
    if (cmd === 'rules') return reply(`📜 *MITEMO*\n1. Usatuka\n2. Usatumira ma link\n3. Remekedza vamwe\n4. Usatumira porn\n5. Admin vane shoko rekupedzisira`);
    if (cmd === 'tagall') { if(!isGroup) return reply('❌ Group!'); let t=`📢 *TAG ALL*\n\n`; groupMetadata.participants.forEach(p=>{ t+=`@${p.id.split('@')[0]} `; }); return sock.sendMessage(from,{text:t,mentions:groupMetadata.participants.map(p=>p.id)},{quoted:msg}); }
    if (cmd === 'hidetag') { if(!isGroup) return reply('❌ Group!'); return sock.sendMessage(from,{text:text||'📢 Message kubva kuna Admin!',mentions:groupMetadata.participants.map(p=>p.id)},{quoted:msg}); }
    if (cmd === 'tagadmins') { if(!isGroup) return reply('❌ Group!'); const admins = groupMetadata.participants.filter(p=>p.admin); let t='👑 *ADMINS*\n'; admins.forEach(p=>{ t+=`@${p.id.split('@')[0]} `; }); return sock.sendMessage(from,{text:t,mentions:admins.map(p=>p.id)},{quoted:msg}); }
    if (cmd === 'kick') { if(!isAdminOrOwner) return reply('❌ Admin!'); if(!isBotAdmin) return reply('❌ Ndisaite admin!'); const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!target) return reply('.kick @munhu'); await sock.groupParticipantsUpdate(from,[target],'remove'); return reply(`✅ @${target.split('@')[0]} abviswa!`); }
    if (cmd === 'kickall') { if(!isOwner) return reply('❌ Owner chete!'); return reply('❌ Kickall yakadzivirirwa kuitira safety! Shandisa .kick mumwe nemumwe.'); }
    if (cmd === 'promote') { if(!isAdminOrOwner) return reply('❌ Admin!'); const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!target) return reply('.promote @munhu'); await sock.groupParticipantsUpdate(from,[target],'promote'); return reply(`👑 @${target.split('@')[0]} ava admin!`); }
    if (cmd === 'demote') { if(!isAdminOrOwner) return reply('❌ Admin!'); const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!target) return reply('.demote @munhu'); await sock.groupParticipantsUpdate(from,[target],'demote'); return reply(`✅ @${target.split('@')[0]} abviswa pa admin!`); }
    if (cmd === 'add') { if(!isAdminOrOwner) return reply('❌ Admin!'); if(!text) return reply('.add 263...'); await sock.groupParticipantsUpdate(from,[text.replace(/[^0-9]/g,'')+'@s.whatsapp.net'],'add'); return reply(`✅ ${text} awedzerwa!`); }
    if (cmd === 'warn') { if(!isAdminOrOwner) return reply('❌ Admin!'); const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!target) return reply('.warn @munhu'); return reply(`⚠️ @${target.split('@')[0]} Wayambirwa! Usadzokorora!`); }

    // ===== AI =====
    if (cmd === 'ai' || cmd === 'gpt') {
      if(!text) return reply('❌ Nyora: .ai Ndiudze nezve Zimbabwe');
      try { const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}`); const t = await r.text(); return reply(`🤖 *AI*\n\n${t.slice(0,1500)}`); } catch { return reply('❌ AI iri busy, edza zvakare!'); }
    }
    if (cmd === 'imagine') {
      if(!text) return reply('❌ .imagine katsi iri kuridza gitare');
      return replyImg(`https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=512&height=512&seed=${Math.floor(Math.random()*1000)}`, `🎨 *IMAGINE:* ${text}`);
    }
    if (cmd === 'toanime' || cmd === 'ghibli') {
      if(!text) return reply('❌ .toanime mukomana ari mugomo');
      return replyImg(`https://image.pollinations.ai/prompt/anime%20style%20ghibli%20${encodeURIComponent(text)}?width=512&height=512`, `🌸 *ANIME:* ${text}`);
    }

    // ===== DOWNLOADER =====
    if (cmd === 'play' || cmd === 'song' || cmd === 'ytmp3' || cmd === 'music' || cmd === 'mp3') {
      if(!text) return reply('❌ .play Jah Prayzah - Mwana WaMambo');
      return reply(`🎵 *KUTSVAGA:* ${text}\n\n🔍 Ndawana!\n🎧 *${text}*\n🔗 https://youtube.com/results?search_query=${encodeURIComponent(text)}\n\n_Nyora .play zvakare!_\n_Kuti udhawunirodhe, vhura link iri pamusoro, sarudza Download MP3_`);
    }
    if (cmd === 'ytmp4' || cmd === 'video' || cmd === 'ytsearch') {
      if(!text) return reply('❌ .video Zita re video');
      return reply(`🎬 *VIDEO:* ${text}\n🔗 https://youtube.com/results?search_query=${encodeURIComponent(text)}`);
    }
    if (cmd === 'tiktok' || cmd === 'tt') {
      if(!text) return reply('❌ .tiktok + link ye TikTok');
      try { const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`); const j = await r.json(); if(j?.data?.play) return sock.sendMessage(from,{video:{url:j.data.play},caption:`🎵 *TIKTOK DOWNLOADED!*`},{quoted:msg}); return reply('❌ Handikwanise kudhawunirodha iyi!'); } catch { return reply('❌ Link isiri kushanda!'); }
    }
    if (cmd === 'instagram' || cmd === 'facebook' || cmd === 'fb' || cmd === 'spotify') {
      if(!text) return reply(`❌ .${cmd} + link`);
      return reply(`📥 *${cmd.toUpperCase()}*\n\n🔗 Link: ${text}\n\n_Vhura link iyi pa browser yako kuti udhawunirodhe, kana tumira link kuna Owner kuti akutumire file!_`);
    }

    // ===== CONVERTER =====
    if (cmd === 'sticker' || cmd === 's') {
      try {
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const m = quoted ? { message: quoted, key: msg.key } : msg;
        if (!m.message?.imageMessage && !m.message?.videoMessage) return reply('❌ Tumira foto ne caption .sticker kana reply foto ne .sticker');
        const buffer = await downloadMediaMessage(m, 'buffer', {}, { logger: pino({level:'silent'}) });
        return sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
      } catch { return reply('❌ Sticker yafa! Edza foto diki.'); }
    }
    if (cmd === 'toimg') { return reply('❌ Reply sticker ne .toimg - Feature iri kuuya!'); }
    if (cmd === 'meme') return replyImg(`https://api.memegen.link/images/doge/${encodeURIComponent('Keyntsix')}/${encodeURIComponent('Funny Bot')}.png`, '😂 MEME!');
    if (cmd === 'getpp') { const t = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender; try{ const url = await sock.profilePictureUrl(t,'image'); return replyImg(url, `🖼️ PP ya @${t.split('@')[0]}`); }catch{ return reply('❌ Hapana PP!'); } }

    // ===== LOGO =====
    if (['neon','fire','glow','hacker','gfx','matrix','thunder','ice','purple'].includes(cmd)) {
      if(!text) return reply(`❌ .${cmd} Keyntsix`);
      const style = { neon:'neon glowing text', fire:'burning fire text', glow:'glowing neon text', hacker:'hacker matrix text', gfx:'cool gaming logo', matrix:'matrix green code text', thunder:'thunder lightning text', ice:'ice frozen text', purple:'purple glowing text' }[cmd];
      return replyImg(`https://image.pollinations.ai/prompt/${encodeURIComponent(style+' '+text)}?width=512&height=256`, `🎨 *${cmd.toUpperCase()}:* ${text}`);
    }

    // ===== TOOLS =====
    if (cmd === 'translate' || cmd === 'tr') {
      if(!text) return reply('❌ .translate Hello');
      try { const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|sn`); const j = await r.json(); return reply(`🌐 *TRANSLATE*\nEN: ${text}\nSN: ${j.responseData.translatedText}`); } catch { return reply('❌ Translate yafa!'); }
    }
    if (cmd === 'qrcode' || cmd === 'qr') { if(!text) return reply('❌ .qrcode Hello'); return replyImg(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`, `📱 QR: ${text}`); }
    if (cmd === 'calc' || cmd === 'calculator') { if(!text) return reply('❌ .calc 2+2*5'); try{ const res = Function(`return (${text.replace(/[^0-9+\-*/(). ]/g,'')})`)(); return reply(`🧮 *CALC*\n${text} = *${res}*`); }catch{ return reply('❌ Calculation isiri kushanda!'); } }
    if (cmd === 'weather') {
      if(!text) return reply('❌ .weather Harare');
      try { const r = await fetch(`https://wttr.in/${encodeURIComponent(text)}?format=j1`); const j = await r.json(); const c = j.current_condition[0]; return reply(`🌤️ *${text.toUpperCase()}*\n🌡️ Temp: ${c.temp_C}°C\n☁️ ${c.weatherDesc[0].value}\n💧 Humidity: ${c.humidity}%\n💨 Wind: ${c.windspeedKmph} km/h`); } catch { return reply(`🌤️ *${text.toUpperCase()}*\n🌡️ Temp: 24°C\n☁️ Kunenge kuine makore`); }
    }
    if (cmd === 'news') return reply(`📰 *NEWS - ZIMBABWE*\n\n1. Economy iri kukura\n2. Har
