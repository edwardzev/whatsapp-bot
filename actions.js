import fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';
import config from './config.js';
import { state, cache, cacheTTL } from './store.js';

// Initialize OpenAI client
const ai = new OpenAI({ apiKey: config.openaiKey });

// Base URL API endpoint (Wassenger)
const API_URL = config.apiBaseUrl || 'https://api.wassenger.com/v1';

// Webhook URL (set manually if not in config)
const WEBHOOK_URL = config.webhookUrl || 'https://webhook.outbrand.co.il/webhook';

// Function to send a message using the Wassenger API
export async function sendMessage({ phone, message, media, device, ...fields }) {
  const url = `${API_URL}/messages`;
  const body = {
    phone,
    message,
    media,
    device,
    ...fields,
    enqueue: 'never'
  };

  try {
    const res = await axios.post(url, body, {
      headers: { Authorization: config.apiKey }
    });
    console.log('[info] Message sent:', phone, res.data.id, res.data.status);
    return res.data;
  } catch (err) {
    console.error('[error] Failed to send message:', phone, message || '<no message>', err.response?.data || err);
    return false;
  }
}

// Fetch WhatsApp Team Members
export async function pullMembers(device) {
  if (cache.members && (Date.now() - cache.members.time) < cacheTTL) {
    return cache.members.data;
  }

  try {
    const url = `${API_URL}/devices/${device.id}/team`;
    const { data: members } = await axios.get(url, { headers: { Authorization: config.apiKey } });
    cache.members = { data: members, time: Date.now() };
    return members;
  } catch (err) {
    console.error('[error] Failed to fetch members:', err.message);
    return [];
  }
}

// Assign Chat to an Agent
export async function assignChatToAgent({ data, device, force }) {
  if (!config.enableMemberChatAssignment && !force) {
    console.log('[debug] Chat assignment is disabled.');
    return;
  }

  try {
    const members = await pullMembers(device);
    const availableMembers = members.filter(m => m.status === 'active' && config.teamWhitelist.includes(m.id));
    
    if (!availableMembers.length) {
      console.log('[warning] No available team members.');
      return;
    }

    const assignedMember = availableMembers[Math.floor(Math.random() * availableMembers.length)];
    console.log('[info] Assigning chat to:', assignedMember.displayName);

    const url = `${API_URL}/chat/${device.id}/chats/${data.chat.id}/owner`;
    await axios.patch(url, { agent: assignedMember.id }, { headers: { Authorization: config.apiKey } });

    return assignedMember;
  } catch (err) {
    console.error('[error] Failed to assign chat:', err.message);
  }
}

// Fetch Chat Messages
export async function pullChatMessages({ data, device }) {
  try {
    const url = `${API_URL}/chat/${device.id}/messages/?chat=${data.chat.id}&limit=25`;
    const res = await axios.get(url, { headers: { Authorization: config.apiKey } });
    state[data.chat.id] = res.data.reduce((acc, message) => {
      acc[message.id] = message;
      return acc;
    }, state[data.chat.id] || {});
    return res.data;
  } catch (err) {
    console.error('[error] Failed to fetch chat messages:', err.message);
    return [];
  }
}

// Send "Typing" Status
export async function sendTypingState({ data, device, action }) {
  try {
    const url = `${API_URL}/chat/${device.id}/typing`;
    await axios.post(url, { action: action || 'typing', duration: 10, chat: data.fromNumber }, { headers: { Authorization: config.apiKey } });
  } catch (err) {
    console.error('[error] Failed to send typing state:', err.message);
  }
}

// Webhook Registration (for Local Development)
export async function registerWebhook(tunnel, device) {
  const webhookUrl = `${tunnel}/webhook`;

  try {
    const { data: webhooks } = await axios.get(`${API_URL}/webhooks`, { headers: { Authorization: config.apiKey } });

    const existingWebhook = webhooks.find(w => w.url === webhookUrl && w.device === device.id);
    if (existingWebhook) {
      return existingWebhook;
    }

    await axios.post(`${API_URL}/webhooks`, { url: webhookUrl, name: 'Chatbot', events: ['message:in:new'], device: device.id }, { headers: { Authorization: config.apiKey } });
    console.log('[info] Webhook registered:', webhookUrl);
  } catch (err) {
    console.error('[error] Failed to register webhook:', err.message);
  }
}

// Exit Function for Errors
export function exit(msg, ...args) {
  console.error('[error]', msg, ...args);
  process.exit(1);
}
