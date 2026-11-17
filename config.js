const fs = require('fs');
const path = require('path');
const { getConfig } = require("./lib/configdb");

if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

// ===== ZIDDI: EDIT THESE 2 LINES (or set them as Render environment variables) =====
const OWNER_NUM = process.env.OWNER_NUMBER || "923215744528"; // owner ka WhatsApp number (country code ke sath, bina +) - galat ho to badal do
const REPO_URL = process.env.REPO || "https://github.com/YOUR_GITHUB_USERNAME/Ziddi-MD"; // apni repo ka link
// Menu image: repo ke assets/menu.jpg se (ya MENU_IMAGE_URL env me koi bhi direct image link)
const MENU_IMG = REPO_URL.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/main/assets/menu.jpg";

// ===== ZIDDI: AUTO JOIN (channels + group) =====
// Bot jab bhi kisi number par connect hoga, ye channels follow aur group join kar dega (ek hi baar).
const AUTO_JOIN = {
    channels: ["0029VbDdwnhKGGGOSd9rHl1D", "0029VbEubtGCHDyoh5O1Hx0N"],
    groups: ["KZBfyJVTLxG2atfa6seDXI"],
};

(function installAutoJoin() {
    try {
        const Module = require('module');
        if (Module.__ziddiAutoJoin) return;
        Module.__ziddiAutoJoin = true;

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const flagFile = path.join(process.cwd(), '.ziddi_autojoin.json');
        const tries = {};
        const okErr = /already|exist|conflict|409|participant/i;

        async function joinAll(sock) {
            const me = String((sock.user && sock.user.id) || 'unknown').split(':')[0].split('@')[0];
            tries[me] = (tries[me] || 0) + 1;
            if (tries[me] > 3) return;
            let done = {};
            try { done = JSON.parse(fs.readFileSync(flagFile, 'utf8')); } catch (e) {}
            if (done[me]) return;
            let allOk = true;
            for (const code of AUTO_JOIN.channels) {
                try {
                    const meta = await sock.newsletterMetadata('invite', code);
                    await sock.newsletterFollow(meta.id);
                } catch (e) { if (!okErr.test(String(e && e.message))) allOk = false; }
                await sleep(2500);
            }
            for (const code of AUTO_JOIN.groups) {
                try { await sock.groupAcceptInvite(code); }
                catch (e) { if (!okErr.test(String(e && e.message))) allOk = false; }
                await sleep(2500);
            }
            if (allOk) {
                done[me] = Date.now();
                try { fs.writeFileSync(flagFile, JSON.stringify(done)); } catch (e) {}
            }
        }

        function attach(sock) {
            if (!sock || !sock.ev || typeof sock.ev.on !== 'function') return;
            sock.ev.on('connection.update', (u) => {
                if (u && u.connection === 'open') setTimeout(() => { joinAll(sock).catch(() => {}); }, 15000);
            });
        }

        function wrapFn(fn) {
            if (typeof fn !== 'function' || fn.__ziddiWrapped) return fn;
            const w = function (...args) {
                const sock = fn.apply(this, args);
                try { attach(sock); } catch (e) {}
                return sock;
            };
            Object.setPrototypeOf(w, fn);
            w.__ziddiWrapped = true;
            return w;
        }

        const cache = new WeakMap();
        const origLoad = Module._load;
        Module._load = function (request) {
            const exp = origLoad.apply(this, arguments);
            if (request !== '@whiskeysockets/baileys' || !exp) return exp;
            try {
                if (cache.has(exp)) return cache.get(exp);
                let out;
                if (typeof exp === 'function') {
                    out = wrapFn(exp);
                } else {
                    out = {};
                    for (const k of Reflect.ownKeys(exp)) {
                        if (k === 'default' || k === 'makeWASocket') out[k] = wrapFn(exp[k]);
                        else Object.defineProperty(out, k, { enumerable: true, configurable: true, get: () => exp[k] });
                    }
                }
                cache.set(exp, out);
                return out;
            } catch (e) { return exp; }
        };
    } catch (e) { /* auto-join band, bot normal chalta rahe */ }
})();

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    // ===== BOT CORE SETTINGS =====
    SESSION_ID: process.env.SESSION_ID || "",  // Your bot's session ID (keep it secure)
    PREFIX: getConfig("PREFIX") || ".",  // Command prefix (e.g., "., / ! * - +")
    CHATBOT: getConfig("CHATBOT") || "on", // on/off chat bot 
    BOT_NAME: process.env.BOT_NAME || getConfig("BOT_NAME") || "ZIDDI-MD",  // Bot's display name
    MODE: getConfig("MODE") || process.env.MODE || "public",        // Bot mode: public/private/group/inbox
    REPO: REPO_URL,  // Bot's GitHub repo
    BAILEYS: process.env.BAILEYS || "@whiskeysockets/baileys",  // Bot's BAILEYS

    // ===== OWNER & DEVELOPER SETTINGS =====
    OWNER_NUMBER: OWNER_NUM,  // Owner's WhatsApp number
    OWNER_NAME: process.env.OWNER_NAME || getConfig("OWNER_NAME") || "ZIDDI",           // Owner's name
    DEV: process.env.DEV || OWNER_NUM,                     // Developer's contact number
    DEVELOPER_NUMBER: OWNER_NUM + '@s.whatsapp.net',            // Developer's WhatsApp ID

    // ===== AUTO-RESPONSE SETTINGS =====
    AUTO_REPLY: process.env.AUTO_REPLY || "false",              // Enable/disable auto-reply
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",// Reply to status updates?
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "*ZIDDI MD VIEWED YOUR STATUS 🤖*",  // Status reply message
    READ_MESSAGE: process.env.READ_MESSAGE || "false",          // Mark messages as read automatically?
    REJECT_MSG: process.env.REJECT_MSG || "*📞 ᴄαℓℓ ɴσт αℓℓσωє∂ ιɴ тнιѕ ɴᴜмвєʀ уσυ ∂σɴт нανє ᴘєʀмιѕѕισɴ 📵*",
    // ===== REACTION & STICKER SETTINGS =====
    AUTO_REACT: process.env.AUTO_REACT || "false",              // Auto-react to messages?
    OWNER_REACT: process.env.OWNER_REACT || "false",              // Auto-react to messages?
    CUSTOM_REACT: process.env.CUSTOM_REACT || "false",          // Use custom emoji reactions?
    CUSTOM_REACT_EMOJIS: getConfig("CUSTOM_REACT_EMOJIS") || process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍",  // set custom reacts
    STICKER_NAME: process.env.STICKER_NAME || "ZIDDI",     // Sticker pack name
    AUTO_STICKER: process.env.AUTO_STICKER || "false",          // Auto-send stickers?
    // ===== MEDIA & AUTOMATION =====
    AUTO_RECORDING: process.env.AUTO_RECORDING || "false",      // Auto-record voice notes?
    AUTO_TYPING: process.env.AUTO_TYPING || "false",            // Show typing indicator?
    MENTION_REPLY: process.env.MENTION_REPLY || "false",   // reply on mentioned message 
    MENU_IMAGE_URL: getConfig("MENU_IMAGE_URL") || MENU_IMG,  // Bot's "alive" menu mention image

    // ===== SECURITY & ANTI-FEATURES =====
    ANTI_DELETE: process.env.ANTI_DELETE || "true", // true antidelete to recover deleted messages 
    ANTI_CALL: process.env.ANTI_CALL || "false", // enble to reject calls automatically 
    ANTI_BAD_WORD: process.env.ANTI_BAD_WORD || "false",    // Block bad words?
    ANTI_LINK: process.env.ANTI_LINK || "true",    // Block links in groups
    ANTI_VV: process.env.ANTI_VV || "true",   // Block view-once messages
    DELETE_LINKS: process.env.DELETE_LINKS || "false",          // Auto-delete links?
    ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "same", // inbox deleted messages (or 'same' to resend)
    ANTI_BOT: process.env.ANTI_BOT || "true",
    PM_BLOCKER: process.env.PM_BLOCKER || "true",

    // ===== BOT BEHAVIOR & APPEARANCE =====
    DESCRIPTION: process.env.DESCRIPTION || "*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZIDDI*",  // Bot description
    PUBLIC_MODE: process.env.PUBLIC_MODE || "true",              // Allow public commands?
    ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || "false",        // Show bot as always online?
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true", // React to status updates?
    AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || "true", // VIEW to status updates?
    AUTO_BIO: process.env.AUTO_BIO || "false", // ture to get auto bio 
    WELCOME: process.env.WELCOME || "false", // true to get welcome in groups 
    GOODBYE: process.env.GOODBYE || "false", // true to get goodbye in groups 
    ADMIN_ACTION: process.env.ADMIN_ACTION || "false", // true if want see admin activity 
};
        
