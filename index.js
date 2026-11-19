const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const OWNER = '263789923176';
const BOT_NAME = 'Keyntsi-nightbot';
const PREFIX = '!';
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state, printQRInTerminal: false, browser: ['Keyntsi-nightbot', 'Chrome', '1.0'] });
  if (!sock.authState.creds.registered) {
    console.log('=== KEYNTSI-NIGHTBOT PAIRING ===');
    const code = await sock.requestPairingCode(OWNER);
    console.log('PAIR CODE YAKO: ' + code);
  }
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') console.log(BOT_NAME + ' YABATANIDZWA! ✨');
    if (u.connection === 'close') start();
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
    if (cmd === 'menu' || cmd === 'help') reply(`✨ *${BOT_NAME}* ✨\n\n🎵 !song + zita\n📜 !rules\n😂 !joke\n👥 !tagall\n👑 Owner: ${OWNER}`);
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
