const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('KEYNTSIX V3 - EMMYHENZY STYLE IS LIVE 🔥'));
app.listen(PORT, () => console.log('Server on ' + PORT));

const PREFIX = '.';
const OWNER_NAME = 'KEYNTSIX';
const BOT_NAME = 'KEYNTSIX-V3';
let pairingCodeShown = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session2');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Keyntsix-V3', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered && !pairingCodeShown) {
        pairingCodeShown = true;
        setTimeout(async () => {
            try {
                const number = process.env.PHONE_NUMBER || '263000000000';
                const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
                console.log('====================================');
                console.log('🔑 PAIRING CODE: ' + code);
                console.log('====================================');
            } catch (e) { console.log('Pairing error:', e.message); }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ KEYNTSIX-V3 ONLINE! EMMYHENZY STYLE 🔥');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            const from = m.key.remoteJid;
            const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '';
            if (!body.startsWith(PREFIX)) return;

            const args = body.slice(1).trim().split(/ +/);
            const cmd = args.shift().toLowerCase();
            const text = args.join(' ');
            const reply = async (txt) => await sock.sendMessage(from, { text: txt }, { quoted: m });

            if (cmd === 'menu' || cmd === 'help') {
                return await reply(
`╭───〔 *${BOT_NAME}* 〕───
│ 👑 Owner: ${OWNER_NAME}
│ ⚡ Prefix: ${PREFIX}
│ 📶 Status: Online
╰─────────────────

╭─── *MAIN MENU* ───
│ • ${PREFIX}menu - Ratidza menu
│ • ${PREFIX}ping - Speed test
│ • ${PREFIX}alive - Bot iripo?
│ • ${PREFIX}owner - Owner info
│ • ${PREFIX}info - Bot info
╰─────────────────

╭─── *FUN & TOOLS* ───
│ • ${PREFIX}sticker - Gadzira sticker
│ • ${PREFIX}ai <mubvunzo> - Bvunza AI
│ • ${PREFIX}joke - Joke
╰─────────────────

╭─── *OWNER ONLY* ───
│ • ${PREFIX}broadcast <msg>
╰─────────────────

> *KEYNTSIX-V3 | EMMYHENZY STYLE* 🔥`
                );
            }
            if (cmd === 'ping') {
                const start = Date.now();
                await reply('Pinging...');
                return await reply(`🏓 *Pong!* Speed: ${Date.now() - start}ms`);
            }
            if (cmd === 'alive') {
                return await reply(`🔥 *${BOT_NAME} IS ALIVE!*\n\n👑 Owner: ${OWNER_NAME}\n⚡ Version: V3 EmmyHenzy Style\n✅ Status: Online`);
            }
            if (cmd === 'owner') {
                return await reply(`👑 *OWNER: ${OWNER_NAME}*\n📱 Contact owner kuti ubatsirwe!`);
            }
            if (cmd === 'info') {
                return await reply(`🤖 *${BOT_NAME}*\nVersion: V3\nStyle: EmmyHenzy-V4\nPrefix: ${PREFIX}\nOwner: ${OWNER_NAME}`);
            }
            if (cmd === 'ai') {
                if (!text) return await reply('Shandisa: .ai Ndeipi capital ye Zimbabwe?');
                return await reply(`🤖 *AI Answer:*\n\n${text} - Ndiri Keyntsix AI, ndiri kushanda! Bvunza chimwe chinhu.`);
            }
            if (cmd === 'joke') {
                return await reply('😂 Sei huku yakayambuka mugwagwa? Kuti isvike kune rimwe divi! 🐔');
            }
            if (cmd === 'sticker') {
                return await reply('Tumira mufananidzo ne caption .sticker kuti ndigadzire sticker!');
            }
        } catch (e) { console.log('Msg error:', e.message); }
    });
}

startBot();
