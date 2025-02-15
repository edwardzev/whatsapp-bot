
import fs from 'fs'
import axios from 'axios'
import OpenAI from 'openai'
import config from './config.js'
import { state, cache, cacheTTL } from './store.js'

// Initialize OpenAI client
const ai = new OpenAI({ apiKey: config.openaiKey })

// Base URL API endpoint.
const API_URL = config.apiBaseUrl

// Function to send a message using the Wassenger API
export async function sendMessage ({ phone, message, media, device, ...fields }) {
  const url = `${API_URL}/messages`
  const body = { phone, message, media, device, ...fields, enqueue: 'never' }

  let retries = 3
  while (retries) {
    retries -= 1
    try {
      const res = await axios.post(url, body, { headers: { Authorization: config.apiKey } })
      console.log('[info] Message sent:', phone, res.data.id, res.data.status)
      return res.data
    } catch (err) {
      console.error('[error] Failed to send message:', phone, message || '<no message>', err.response ? err.response.data : err)
    }
  }
  return false
}

export async function pullMembers (device) {
  if (cache.members && +cache.members.time && (Date.now() - +cache.members.time) < cacheTTL) {
    return cache.members.data
  }
  const url = `${API_URL}/devices/${device.id}/team`
  const { data: members } = await axios.get(url, { headers: { Authorization: config.apiKey } })
  cache.members = { data: members, time: Date.now() }
  return members
}

export async function validateMembers (members) {
  const validateMembers = (config.teamWhitelist || []).concat(config.teamBlacklist || [])
  for (const id of validateMembers) {
    if (typeof id !== 'string' || id.length !== 24) {
      return exit('Invalid Team User ID:', id)
    }
    const exists = members.some(user => user.id === id)
    if (!exists) {
      return exit('Team user ID does not exist:', id)
    }
  }
}

export async function createLabels (device) {
  const labels = cache.labels?.data || []
  const requiredLabels = (config.setLabelsOnUserAssignment || []).concat(config.setLabelsOnBotChats || [])
  const missingLabels = requiredLabels.filter(label => labels.every(l => l.name !== label))

  for (const label of missingLabels) {
    console.log('[info] Creating label:', label)
    const url = `${API_URL}/devices/${device.id}/labels`
    const body = { name: label.slice(0, 30).trim(), color: 'blue', description: 'Chatbot label' }
    try {
      await axios.post(url, body, { headers: { Authorization: config.apiKey } })
    } catch (err) {
      console.error('[error] Failed to create label:', label, err.message)
    }
  }
  if (missingLabels.length) {
    await pullLabels(device, { force: true })
  }
}

export async function pullLabels (device, { force } = {}) {
  if (!force && cache.labels && +cache.labels.time && (Date.now() - +cache.labels.time) < cacheTTL) {
    return cache.labels.data
  }
  const url = `${API_URL}/devices/${device.id}/labels`
  const { data: labels } = await axios.get(url, { headers: { Authorization: config.apiKey } })
  cache.labels = { data: labels, time: Date.now() }
  return labels
}

export async function updateChatLabels ({ data, device, labels }) {
  const url = `${API_URL}/chat/${device.id}/chats/${data.chat.id}/labels`
  const newLabels = (data.chat.labels || []).concat(labels)
  console.log('[info] Update chat labels:', data.chat.id, newLabels)
  await axios.patch(url, newLabels, { headers: { Authorization: config.apiKey } })
}

export async function updateChatMetadata ({ data, device, metadata }) {
  const url = `${API_URL}/chat/${device.id}/contacts/${data.chat.id}/metadata`
  await axios.patch(url, metadata, { headers: { Authorization: config.apiKey } })
}

export async function pullChatMessages ({ data, device }) {
  try {
    const url = `${API_URL}/chat/${device.id}/messages/?chat=${data.chat.id}&limit=25`
    const res = await axios.get(url, { headers: { Authorization: config.apiKey } })
    state[data.chat.id] = res.data.reduce((acc, message) => {
      acc[message.id] = message
      return acc
    }, state[data.chat.id] || {})
    return res.data
  } catch (err) {
    console.error('[error] Failed to pull chat messages:', err)
  }
}

// Find an active WhatsApp device connected to the Wassenger API
export async function loadDevice () {
  const url = `${API_URL}/devices`
  const { data } = await axios.get(url, { headers: { Authorization: config.apiKey } })
  if (config.device) {
    return data.find(device => device.id === config.device)
  }
  return data.find(device => device.status === 'operative')
}

export async function transcribeAudio ({ message, device }) {
  if (!message?.media?.id) {
    return false
  }

  try {
    const url = `${API_URL}/chat/${device.id}/files/${message.media.id}/download`
    const response = await axios.get(url, {
      headers: { Authorization: config.apiKey },
      responseType: 'stream'
    })
    if (response.status !== 200) {
      return false
    }

    const tmpFile = `${message.media.id}.mp3`
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tmpFile)
      response.data.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    const transcription = await ai.audio.transcriptions.create({
      file: fs.createReadStream(tmpFile),
      model: 'whisper-1',
      response_format: 'text'
    })
    await fs.promises.unlink(tmpFile)
    return transcription
  } catch (err) {
    console.error('[error] Failed to transcribe audio:', err.message)
    return false
  }
}

export async function sendTypingState ({ data, device, action }) {
  const url = `${API_URL}/chat/${device.id}/typing`
  const body = { action: action || 'typing', duration: 10, chat: data.fromNumber }
  await axios.post(url, body, { headers: { Authorization: config.apiKey } })
}

export function exit (msg, ...args) {
  console.error('[error]', msg, ...args)
  process.exit(1)
}
