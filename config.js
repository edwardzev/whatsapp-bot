import functions from './functions.js';
import 'dotenv/config'; // Load environment variables from .env

const { env } = process;

// CONFIGURATION

// Required: Specify the Wassenger API key
const apiKey = env.WASSENGER_API_KEY;

// Required: Specify the OpenAI API key
const openaiKey = env.OPENAI_API_KEY;

// Required: Set the OpenAI model to use
const openaiModel = env.OPENAI_MODEL || 'gpt-4o';

// Optional: Ngrok tunnel authentication token (if webhook is not provided)
const ngrokToken = env.NGROK_TOKEN || '';

// Messages
const unknownCommandMessage = `I'm sorry, I was unable to understand your message. Can you please elaborate more?

If you would like to chat with a human, just reply with *human*.`;

const welcomeMessage = 'Hey there 👋 Welcome to this ChatGPT-powered AI chatbot demo using *Wassenger API*! I can also speak many languages 😁';

// Bot instructions for handling queries
const botInstructions = `You are a smart virtual customer support assistant who works for Wassenger.
You can identify yourself as Milo, the Wassenger AI Assistant.
You will be chatting with customers who may contact you with general queries about the product.
Wassenger offers WhatsApp API and multi-user live communication services designed for businesses and developers.
Be polite. Be helpful. Be concise.
If you can't help, ask the user to type *human* in order to talk with customer support.`;

// Default help message
const defaultMessage = `Try asking anything to the AI chatbot using natural language!

Example queries:

1️⃣ What is Wassenger?
2️⃣ Can I use Wassenger to send automatic messages?
3️⃣ Can I schedule messages using Wassenger?
4️⃣ Is there a free trial available?

Type *human* to talk with a person. Give it a try! 😁`;

// Chatbot features
const features = {
  audioInput: true,
  audioOutput: true,
  audioOnly: false,
  voice: 'echo',
  voiceSpeed: 1,
  imageInput: true
};

// Template messages
const templateMessages = {
  noAudioAccepted: 'Audio messages are not supported: please send text messages only.',
  chatAssigned: 'You will be contacted shortly by someone from our team. Thank you for your patience.'
};

// Limits
const limits = {
  maxInputCharacters: 1000,
  maxOutputTokens: 1000,
  chatHistoryLimit: 20,
  maxMessagesPerChat: 500,
  maxMessagesPerChatCounterTime: 24 * 60 * 60,
  maxAudioDuration: 2 * 60,
  maxImageSize: 2 * 1024 * 1024
};

// Chatbot config
export default {
  apiKey,
  openaiKey,
  openaiModel,
  functions,
  features,
  limits,
  templateMessages,
  port: +env.PORT || 3000,
  production: env.NODE_ENV === 'production',
  webhookUrl: env.WEBHOOK_URL,
  ngrokToken,
  ngrokPath: env.NGROK_PATH,
  tempPath: '.tmp',
  setLabelsOnBotChats: ['bot'],
  removeLabelsAfterAssignment: true,
  setLabelsOnUserAssignment: ['from-bot'],
  skipChatWithLabels: ['no-bot'],
  numbersBlacklist: ['972546969974'],
  inferenceParams: { temperature: 0.2 },
  numbersWhitelist: [],
  skipArchivedChats: true,
  enableMemberChatAssignment: true,
  assignOnlyToOnlineMembers: false,
  skipTeamRolesFromAssignment: ['admin'],
  teamWhitelist: [],
  teamBlacklist: [],
  setMetadataOnBotChats: [{ key: 'bot_start', value: () => new Date().toISOString() }],
  setMetadataOnAssignment: [{ key: 'bot_stop', value: () => new Date().toISOString() }],
  defaultMessage,
  botInstructions,
  welcomeMessage,
  unknownCommandMessage,
  apiBaseUrl: env.API_URL || 'https://api.wassenger.com/v1'
};

// Disable LanceDB logs
env.LANCEDB_LOG = 0;
