const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const OWNER = '263789923176';
const BOT_NAME = 'Keyntsi-nightbot';
const PREFIX = '!';

// FAKE SERVER YEKUTI RENDER ISAVHARA BOT
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Keyntsi-nightbot iri online! ✨');
}).listen(PORT, () => console.log('Server iri pa port ' + PORT));

async function start() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    browser: ['Chrome', 'Chrome', '1.0'],
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      console.log('=== KEYNTSI-NIGHTBOT PAIRING ===');
      const code = await sock.requestPairingCode(OWNER);
      console.log('PAIR CODE YAKO: ' + code);
      console.log('Enda ku WhatsApp > Linked Devices > Link with phone number');
    } catch (e) {
      console.log('Pairing yakundikana, ndriku edza zvakare...');
      console.log(e.message);
    }
  }

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') console.log(BOT_NAME + ' YABATANIDZWA! ✨');
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection yakavharwa, ndriku batanidza zvakare...');
      if (shouldReconnect) setTimeout(start, 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!text.startsWith(PREFIX)) return;
    const cmd = text.slice(1).trim().split(' ')[0].toLowerCase();
    const args = text.slice(1).trim().split(' ').slice(1).join(' ');
    const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: msg });

    if (cmd === 'menu' || cmd === 'help') reply(`✨ *${BOT_NAME}* ✨\n\n🎵 !song + zita\n📜 !rules\n😂 !joke\n👑 Owner: ${OWNER}`);
    if (cmd === 'rules') reply('📜 *RULES*\n1. No links\n2. No kutuka\n3. Remekedza vese');
    if (cmd === 'joke') reply('😂 Sei huku yakayambuka mugwagwa? Kuti isvike kune rimwe divi! 🐔');
    if (cmd === 'song') reply(`🎵 Nightbot iri kutsvaga: ${args}... ✨`);
    if (cmd === 'ping') reply('Pong! ✨ Keyntsi-nightbot iri online!');
    if (cmd === 'owner') reply(`👑 Owner wangu ndi ${OWNER}`);
  });

  sock.ev.on('group-participants.update', async (u) => {
    if (u.action === 'add') {
      for (let p of u.participants) {
        await sock.sendMessage(u.id, { text: `✨ Welcome @${p.split('@')[0]} ku group! Ndiri ${BOT_NAME} ✨ Nyora !menu`, mentions: [p] });
      }
    }
  });
}
start();
