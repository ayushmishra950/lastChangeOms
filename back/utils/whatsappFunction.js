const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { createLead } = require("../service/leadService");
const Lead = require("../models/lead-portal/lead");
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" }), // separate session folder
    puppeteer: {
        headless: true, // true for deploy, false for local debug
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1280,720'
        ]
    }
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("QR RECEIVED, scan it with WhatsApp");
});

client.on("ready", async () => {
    console.log('WhatsApp connected!');
});
client.on("message", async (message) => {

    // ignore messages sent by the bot itself
    if (message.fromMe) return;

    const contact = await message.getContact();

    const leadData = {
        name: contact.pushname || "Unknown",
        phone: contact.number,
        email: null,
        source: "WhatsApp",
        message: message.body
    };

    // ✅ Check duplicate by phone only
    const existingLead = await Lead.findOne({ phone: leadData.phone });

    if (existingLead) {
        console.log(`Duplicate lead skipped for phone: ${leadData.phone}`);
        return; // ignore duplicate, no reply, no save
    }

    const result = await createLead(leadData);

    console.log("Lead result:", result);

    if (result.success) {
        await message.reply(`Thanks for joining ${leadData.name}!`);
    } else {
        await message.reply(result.message);
    }

});


// const startClient = async () => {
//     try {
//         await client.initialize();
//     } catch (err) {
//         console.error("❌ WhatsApp client init failed, retrying in 5s:", err.message);
//         setTimeout(startClient, 5000); // retry after 5 sec
//     }
// };

// startClient();