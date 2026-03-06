import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// ──────────────────────────────────────────────
// WhatsApp Service — singleton client with QR auth
// Scan the QR code from your phone to connect
// ──────────────────────────────────────────────

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
  }

  initialize() {
    if (this.client) return;

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      console.log('\n╔═══════════════════════════════════════════════════╗');
      console.log('║   📱 Scan this QR code with WhatsApp to connect   ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');
      qrcode.generate(qr, { small: true });
      console.log('\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n');
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.qrCode = null;
      console.log('✅ WhatsApp client is ready and connected!');
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp session authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      this.isReady = false;
      console.error('❌ WhatsApp auth failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      console.log('📴 WhatsApp disconnected:', reason);
    });

    this.client.initialize().catch((err) => {
      console.error('WhatsApp initialization error:', err.message);
      console.log('💡 WhatsApp will run in simulated mode. Install Chrome/Chromium to enable real messaging.');
    });
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isReady || !this.client) {
      return { success: false, simulated: true, error: 'WhatsApp not connected' };
    }

    try {
      // Format number: remove +, spaces, dashes and add @c.us suffix
      const formatted = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
      const chatId = formatted.includes('@c.us') ? formatted : `${formatted}@c.us`;

      // Check if number is registered on WhatsApp
      const isRegistered = await this.client.isRegisteredUser(chatId);
      if (!isRegistered) {
        return { success: false, simulated: false, error: `${phoneNumber} is not on WhatsApp` };
      }

      const sent = await this.client.sendMessage(chatId, message);
      return { success: true, simulated: false, messageId: sent.id._serialized };
    } catch (err) {
      return { success: false, simulated: false, error: err.message };
    }
  }

  getStatus() {
    return {
      connected: this.isReady,
      hasQR: !!this.qrCode,
      qr: this.qrCode,
    };
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();
export default whatsappService;
