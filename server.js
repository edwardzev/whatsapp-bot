import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import config from './config.js';
import * as bot from './bot.js';
import * as actions from './actions.js';

// Create web server
const app = express();

// Middleware to parse incoming request bodies
app.use(bodyParser.json());

// Index route
app.get('/', (req, res) => {
  res.send({
    name: 'chatbot',
    description: 'WhatsApp ChatGPT-powered chatbot for Wassenger',
    endpoints: {
      webhook: { path: '/webhook', method: 'POST' },
      sendMessage: { path: '/message', method: 'POST' },
      sample: { path: '/sample', method: 'GET' },
    },
  });
});

// POST route to handle incoming webhook messages
app.post('/webhook', (req, res) => {
  const { body } = req;

  if (!body || !body.event || !body.data) {
    return res.status(400).send({ message: 'Invalid webhook payload' });
  }

  if (body.event !== 'message:in:new') {
    return res.status(202).send({ message: 'Ignoring non-message event' });
  }

  // Acknowledge the webhook event immediately
  res.send({ ok: true });

  // Process the message asynchronously
  bot.processMessage(body, { rag: app.rag }).catch((err) => {
    console.error(
      '[error] Failed to process inbound message:',
      body.id,
      body.data.fromNumber,
      body.data.body,
      err
    );
  });
});

// Send message via Wassenger API
app.post('/message', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).send({ message: 'Invalid request payload' });
  }

  try {
    const response = await actions.sendMessage({ phone, message, device: app.device.id });
    res.send(response);
  } catch (err) {
    res.status(err.response?.status || 500).send({
      message: 'Failed to send message',
      error: err.response?.data || err.message,
    });
  }
});

// Send a sample message
app.get('/sample', async (req, res) => {
  const { phone, message } = req.query;
  const data = {
    phone: phone || app.device.phone,
    message: message || 'Hello from Wassenger Chatbot!',
    device: app.device.id,
  };

  try {
    const response = await actions.sendMessage(data);
    res.send(response);
  } catch (err) {
    res.status(err.response?.status || 500).send({
      message: 'Failed to send sample message',
      error: err.response?.data || err.message,
    });
  }
});

// Utility functions
async function fileExists(filepath) {
  try {
    await fs.access(filepath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

async function fileSize(filepath) {
  try {
    const stat = await fs.stat(filepath);
    return stat.size;
  } catch (err) {
    return -1;
  }
}

// Serve audio files
app.get('/files/:id', async (req, res) => {
  const fileId = req.params.id;

  if (!/^[a-f0-9]{15,18}$/i.test(fileId)) {
    return res.status(400).send({ message: 'Invalid file ID' });
  }

  const filename = `${fileId}.mp3`;
  const filepath = path.join(config.tempPath, filename);

  if (!(await fileExists(filepath))) {
    return res.status(404).send({ message: 'File not found or deleted' });
  }

  const size = await fileSize(filepath);
  if (!size) {
    return res.status(404).send({ message: 'File not found or deleted' });
  }

  res.set('Content-Length', size);
  res.set('Content-Type', 'audio/mpeg');

  createReadStream(filepath).pipe(res);

  res.once('close', () => {
    fs.unlink(filepath).catch((err) => {
      console.error('[error] Failed to delete temp file:', filepath, err.message);
    });
  });
});

// Global error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).send({ message: `Unexpected error: ${err.message}` });
});

export default app;
