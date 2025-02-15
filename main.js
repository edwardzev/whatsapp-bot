import fs from 'fs';
import config from './config.js';
import server from './server.js';
import * as actions from './actions.js';

const { exit } = actions;

// Load WhatsApp Device
const loadWhatsAppDevice = async () => {
  try {
    const device = await actions.loadDevice();
    if (!device || device.status !== 'operative') {
      return exit('No active WhatsApp numbers in your Wassenger account. Connect a number:\nhttps://app.wassenger.com/create');
    }
    return device;
  } catch (err) {
    if (err.response?.status === 403) {
      return exit('Unauthorized Wassenger API key. Obtain your API key:\nhttps://app.wassenger.com/developers/apikeys');
    }
    return exit('Failed to load WhatsApp device:', err.message);
  }
};

// Initialize chatbot server
async function main() {
  // Validate API keys
  if (!config.apiKey || config.apiKey.length < 60) {
    return exit('Please sign up in Wassenger and obtain your API key:\nhttps://app.wassenger.com/apikeys');
  }
  if (!config.openaiKey || config.openaiKey.length < 45) {
    return exit('Missing required OpenAI API key. Obtain it here:\nhttps://platform.openai.com/account/api-keys');
  }

  // Load WhatsApp device
  const device = await loadWhatsAppDevice();
  if (!device) return;

  if (device.session.status !== 'online') {
    return exit(`WhatsApp number (${device.alias}) is not online. Ensure it’s connected:\nhttps://app.wassenger.com/${device.id}/scan`);
  }

  if (device.billing.subscription.product !== 'io') {
    return exit(`WhatsApp number plan (${device.alias}) does not support inbound messages. Upgrade here:\nhttps://app.wassenger.com/${device.id}/plan?product=io`);
  }

  // Ensure temporary directory exists
  if (!fs.existsSync(config.tempPath)) {
    fs.mkdirSync(config.tempPath);
  }

  // Pre-load labels and team members
  const [members] = await Promise.all([
    actions.pullMembers(device),
    actions.pullLabels(device)
  ]);

  // Create missing labels
  await actions.createLabels(device);

  // Validate member lists
  await actions.validateMembers(members);

  server.device = device;
  console.log('[info] Using WhatsApp number:', device.phone, device.alias, `(ID: ${device.id})`);

  // Start server
  await server.listen(config.port, () => {
    console.log(`✅ Server listening on port ${config.port}`);
  });

  // Register webhook for production
  if (config.production) {
    console.log('[info] Validating webhook endpoint...');
    if (!config.webhookUrl) {
      return exit('Missing required environment variable: WEBHOOK_URL must be present in production mode');
    }
    const webhook = await actions.registerWebhook(config.webhookUrl, device);
    if (!webhook) {
      return exit(`Webhook endpoint missing. Create it here:\nhttps://app.wassenger.com/${device.id}/webhooks`);
    }
    console.log('[info] Webhook is active:', webhook.url);
  } else {
    console.log('[info] Using predefined webhook URL:', config.webhookUrl);
    const webhook = await actions.registerWebhook(config.webhookUrl, device);
    if (!webhook) {
      console.error('Failed to register webhook. Check API key and URL.');
      return process.exit(1);
    }
  }

  console.log('[✅] WhatsApp Bot is live and ready to receive messages!');
}

main().catch(err => {
  exit('🚨 Error starting the bot:', err);
});
